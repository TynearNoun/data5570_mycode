import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { appendPhoto, errorText, request } from "@/services/api";
import type { PhotoPick, ReactionKind, Submission } from "@/services/types";

import { logout } from "./authSlice";

export type SubmissionsState = {
  items: Submission[];
  challengeId: number | null;
  status: "idle" | "loading" | "ready" | "error";
  saving: boolean;
  error: string | null;
};

const initialState: SubmissionsState = {
  items: [],
  challengeId: null,
  status: "idle",
  saving: false,
  error: null,
};

type Authed = { auth: { token: string | null } };

function replace(items: Submission[], submission: Submission): Submission[] {
  const index = items.findIndex((item) => item.id === submission.id);
  if (index < 0) return [submission, ...items];
  const next = items.slice();
  next[index] = submission;
  return next;
}

export const fetchSubmissions = createAsyncThunk<
  { challengeId: number; submissions: Submission[] },
  { challengeId: number },
  { state: Authed; rejectValue: string }
>("submissions/fetch", async ({ challengeId }, { getState, rejectWithValue }) => {
  try {
    const submissions = await request<Submission[]>(`/submissions/?challenge=${challengeId}`, {
      token: getState().auth.token,
    });
    return { challengeId, submissions };
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not load proof."));
  }
});

export const createSubmission = createAsyncThunk<
  Submission,
  { challengeId: number; body: string; videoUrl: string; photo: PhotoPick | null },
  { state: Authed; rejectValue: string }
>("submissions/create", async (input, { getState, rejectWithValue }) => {
  try {
    const form = new FormData();
    form.append("challenge", String(input.challengeId));
    form.append("body", input.body);
    if (input.videoUrl.trim()) form.append("video_url", input.videoUrl.trim());
    if (input.photo) await appendPhoto(form, input.photo);
    return await request<Submission>("/submissions/", {
      method: "POST",
      token: getState().auth.token,
      form,
    });
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not send that proof."));
  }
});

export const addReaction = createAsyncThunk<
  Submission,
  { submissionId: number; kind: ReactionKind },
  { state: Authed; rejectValue: string }
>("submissions/react", async ({ submissionId, kind }, { getState, rejectWithValue }) => {
  try {
    return await request<Submission>("/reactions/", {
      method: "POST",
      token: getState().auth.token,
      body: { submission: submissionId, kind },
    });
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not react."));
  }
});

export const removeReaction = createAsyncThunk<Submission, number, { state: Authed; rejectValue: string }>(
  "submissions/unreact",
  async (reactionId, { getState, rejectWithValue }) => {
    try {
      return await request<Submission>(`/reactions/${reactionId}/`, {
        method: "DELETE",
        token: getState().auth.token,
      });
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not remove that reaction."));
    }
  },
);

const submissionsSlice = createSlice({
  name: "submissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubmissions.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSubmissions.fulfilled, (state, action) => {
        state.status = "ready";
        state.challengeId = action.payload.challengeId;
        state.items = action.payload.submissions;
      })
      .addCase(fetchSubmissions.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Could not load proof.";
      })
      .addCase(createSubmission.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createSubmission.fulfilled, (state, action) => {
        state.saving = false;
        state.status = "ready";
        state.challengeId = action.payload.challenge;
        state.items = replace(state.items, action.payload);
      })
      .addCase(createSubmission.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Could not send that proof.";
      })
      .addCase(addReaction.fulfilled, (state, action) => {
        state.items = replace(state.items, action.payload);
        state.error = null;
      })
      .addCase(addReaction.rejected, (state, action) => {
        state.error = action.payload ?? "Could not react.";
      })
      .addCase(removeReaction.fulfilled, (state, action) => {
        state.items = replace(state.items, action.payload);
      })
      .addCase(removeReaction.rejected, (state, action) => {
        state.error = action.payload ?? "Could not remove that reaction.";
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default submissionsSlice.reducer;
