import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { errorText, request } from "@/services/api";
import type { Group } from "@/services/types";

import { logout } from "./authSlice";

export type GroupsState = {
  items: Group[];
  selectedId: number | null;
  status: "idle" | "loading" | "ready" | "error";
  saving: boolean;
  error: string | null;
};

const initialState: GroupsState = {
  items: [],
  selectedId: null,
  status: "idle",
  saving: false,
  error: null,
};

type Authed = { auth: { token: string | null } };

export const fetchGroups = createAsyncThunk<Group[], void, { state: Authed; rejectValue: string }>(
  "groups/fetch",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await request<Group[]>("/groups/", { token: getState().auth.token });
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not load your groups."));
    }
  },
);

export const createGroup = createAsyncThunk<
  Group,
  { name: string; description: string },
  { state: Authed; rejectValue: string }
>("groups/create", async (draft, { getState, rejectWithValue }) => {
  try {
    return await request<Group>("/groups/", {
      method: "POST",
      token: getState().auth.token,
      body: draft,
    });
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not create that group."));
  }
});

export const joinGroup = createAsyncThunk<Group, string, { state: Authed; rejectValue: string }>(
  "groups/join",
  async (inviteCode, { getState, rejectWithValue }) => {
    try {
      return await request<Group>("/groups/join/", {
        method: "POST",
        token: getState().auth.token,
        body: { invite_code: inviteCode },
      });
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not join with that code."));
    }
  },
);

const groupsSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {
    selectGroup(state, action: PayloadAction<number | null>) {
      state.selectedId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.status = state.items.length ? "ready" : "loading";
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.status = "ready";
        state.items = action.payload;
        const ids = action.payload.map((group) => group.id);
        if (state.selectedId == null || !ids.includes(state.selectedId)) {
          state.selectedId = action.payload[0]?.id ?? null;
        }
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Could not load your groups.";
      })
      .addCase(createGroup.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.saving = false;
        state.items = [action.payload, ...state.items.filter((group) => group.id !== action.payload.id)];
        state.selectedId = action.payload.id;
        state.status = "ready";
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Could not create that group.";
      })
      .addCase(joinGroup.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.saving = false;
        state.items = [action.payload, ...state.items.filter((group) => group.id !== action.payload.id)];
        state.selectedId = action.payload.id;
        state.status = "ready";
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Could not join with that code.";
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export const { selectGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
