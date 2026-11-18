import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { errorText, request } from "@/services/api";
import type { Leaderboard } from "@/services/types";

import { logout } from "./authSlice";

export type LeaderboardState = {
  board: Leaderboard | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

const initialState: LeaderboardState = {
  board: null,
  status: "idle",
  error: null,
};

type Authed = { auth: { token: string | null } };

export const fetchLeaderboard = createAsyncThunk<Leaderboard, number, { state: Authed; rejectValue: string }>(
  "leaderboard/fetch",
  async (groupId, { getState, rejectWithValue }) => {
    try {
      return await request<Leaderboard>(`/leaderboard/?group=${groupId}`, {
        token: getState().auth.token,
      });
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not load the board."));
    }
  },
);

const leaderboardSlice = createSlice({
  name: "leaderboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboard.pending, (state) => {
        state.status = state.board ? "ready" : "loading";
        state.error = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.status = "ready";
        state.board = action.payload;
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Could not load the board.";
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default leaderboardSlice.reducer;
