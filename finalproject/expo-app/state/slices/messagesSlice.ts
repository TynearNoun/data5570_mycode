import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { errorText, request } from "@/services/api";
import type { ChatMessage } from "@/services/types";

import { logout } from "./authSlice";

export type MessagesState = {
  items: ChatMessage[];
  groupId: number | null;
  status: "idle" | "loading" | "ready" | "error";
  saving: boolean;
  error: string | null;
};

const initialState: MessagesState = {
  items: [],
  groupId: null,
  status: "idle",
  saving: false,
  error: null,
};

type Authed = { auth: { token: string | null } };

export const fetchMessages = createAsyncThunk<
  { groupId: number; messages: ChatMessage[] },
  number,
  { state: Authed; rejectValue: string }
>("messages/fetch", async (groupId, { getState, rejectWithValue }) => {
  try {
    const messages = await request<ChatMessage[]>(`/messages/?group=${groupId}`, {
      token: getState().auth.token,
    });
    return { groupId, messages };
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not load messages."));
  }
});

export const sendMessage = createAsyncThunk<
  ChatMessage,
  { groupId: number; body: string },
  { state: Authed; rejectValue: string }
>("messages/send", async ({ groupId, body }, { getState, rejectWithValue }) => {
  try {
    return await request<ChatMessage>("/messages/", {
      method: "POST",
      token: getState().auth.token,
      body: { group: groupId, body },
    });
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not send that message."));
  }
});

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.status = state.items.length ? "ready" : "loading";
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = "ready";
        state.groupId = action.payload.groupId;
        state.items = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Could not load messages.";
      })
      .addCase(sendMessage.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.saving = false;
        state.items = [...state.items, action.payload];
        state.status = "ready";
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Could not send that message.";
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default messagesSlice.reducer;
