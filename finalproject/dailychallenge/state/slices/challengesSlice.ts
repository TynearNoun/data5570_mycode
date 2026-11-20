import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { errorText, request } from "@/services/api";
import type { Challenge, Dare, ProofKind } from "@/services/types";

import { logout } from "./authSlice";
import { createSubmission } from "./submissionsSlice";

export type ChallengesState = {
  byGroup: Record<number, Challenge[]>;
  dailyId: number | null;
  bank: Dare[];
  bankStatus: "idle" | "loading" | "ready" | "error";
  status: "idle" | "loading" | "ready" | "error";
  saving: boolean;
  error: string | null;
};

const initialState: ChallengesState = {
  byGroup: {},
  dailyId: null,
  bank: [],
  bankStatus: "idle",
  status: "idle",
  saving: false,
  error: null,
};

type Authed = { auth: { token: string | null } };

function upsert(list: Challenge[] | undefined, challenge: Challenge): Challenge[] {
  const rest = (list ?? []).filter((item) => item.id !== challenge.id);
  return [challenge, ...rest];
}

export const fetchDareBank = createAsyncThunk<Dare[], void, { state: Authed; rejectValue: string }>(
  "challenges/bank",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await request<Dare[]>("/dares/", { token: getState().auth.token });
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not load the dares."));
    }
  },
);

export const fetchChallenges = createAsyncThunk<
  { groupId: number; challenges: Challenge[] },
  number,
  { state: Authed; rejectValue: string }
>("challenges/fetch", async (groupId, { getState, rejectWithValue }) => {
  try {
    const challenges = await request<Challenge[]>(`/challenges/?group=${groupId}`, {
      token: getState().auth.token,
    });
    return { groupId, challenges };
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not load challenges."));
  }
});

export const ensureDaily = createAsyncThunk<Challenge, number, { state: Authed; rejectValue: string }>(
  "challenges/daily",
  async (groupId, { getState, rejectWithValue }) => {
    try {
      return await request<Challenge>("/challenges/daily/", {
        method: "POST",
        token: getState().auth.token,
        body: { group: groupId },
      });
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not open today's challenge."));
    }
  },
);

export const createChallenge = createAsyncThunk<
  Challenge,
  { group: number; title: string; prompt: string; proof: ProofKind; challenge_date: string | null },
  { state: Authed; rejectValue: string }
>("challenges/create", async (draft, { getState, rejectWithValue }) => {
  try {
    return await request<Challenge>("/challenges/", {
      method: "POST",
      token: getState().auth.token,
      body: draft,
    });
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not save that challenge."));
  }
});

const challengesSlice = createSlice({
  name: "challenges",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDareBank.pending, (state) => {
        state.bankStatus = "loading";
        state.error = null;
      })
      .addCase(fetchDareBank.fulfilled, (state, action) => {
        state.bankStatus = "ready";
        state.bank = action.payload;
      })
      .addCase(fetchDareBank.rejected, (state, action) => {
        state.bankStatus = "error";
        state.error = action.payload ?? "Could not load the dares.";
      })
      .addCase(fetchChallenges.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchChallenges.fulfilled, (state, action) => {
        state.status = "ready";
        state.byGroup[action.payload.groupId] = action.payload.challenges;
      })
      .addCase(fetchChallenges.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Could not load challenges.";
      })
      .addCase(ensureDaily.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.dailyId = null;
      })
      .addCase(ensureDaily.fulfilled, (state, action) => {
        state.status = "ready";
        state.dailyId = action.payload.id;
        const groupId = action.payload.group;
        state.byGroup[groupId] = upsert(state.byGroup[groupId], action.payload);
      })
      .addCase(ensureDaily.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Could not open today's challenge.";
      })
      .addCase(createChallenge.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createChallenge.fulfilled, (state, action) => {
        state.saving = false;
        const groupId = action.payload.group;
        state.byGroup[groupId] = upsert(state.byGroup[groupId], action.payload);
      })
      .addCase(createChallenge.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Could not save that challenge.";
      })
      .addCase(createSubmission.fulfilled, (state, action) => {
        const submission = action.payload;
        for (const list of Object.values(state.byGroup)) {
          const challenge = list.find((item) => item.id === submission.challenge);
          if (!challenge) continue;
          const hadProof = challenge.my_submission != null;
          challenge.my_submission = submission;
          if (!hadProof) challenge.submission_count += 1;
        }
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default challengesSlice.reducer;
