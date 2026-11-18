import { createAsyncThunk } from "@reduxjs/toolkit";

import { request } from "@/services/api";
import { loadGroupId, loadToken, saveToken } from "@/services/storage";
import type { SessionUser } from "@/services/types";

import { sessionReady } from "./slices/authSlice";
import { selectGroup } from "./slices/groupsSlice";

export const bootstrap = createAsyncThunk("session/bootstrap", async (_, { dispatch }) => {
  const [token, groupId] = await Promise.all([loadToken(), loadGroupId()]);
  if (groupId) dispatch(selectGroup(groupId));
  if (!token) {
    dispatch(sessionReady(null));
    return;
  }
  try {
    const user = await request<SessionUser>("/users/me/", { token });
    dispatch(sessionReady({ token, user }));
  } catch {
    await saveToken(null);
    dispatch(sessionReady(null));
  }
});
