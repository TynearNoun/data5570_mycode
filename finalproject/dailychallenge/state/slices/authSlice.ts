import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { errorText, request } from "@/services/api";
import { saveToken } from "@/services/storage";
import type { AuthResponse, SessionUser } from "@/services/types";

export type AuthState = {
  user: SessionUser | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  saving: boolean;
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  token: null,
  status: "idle",
  saving: false,
  error: null,
};

type Credentials = {
  username: string;
  password: string;
};

type Registration = Credentials & {
  email: string;
  display_name: string;
};

export const login = createAsyncThunk<AuthResponse, Credentials, { rejectValue: string }>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await request<AuthResponse>("/auth/login/", {
        method: "POST",
        body: credentials,
      });
      await saveToken(result.token);
      return result;
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not sign in."));
    }
  },
);

export const register = createAsyncThunk<AuthResponse, Registration, { rejectValue: string }>(
  "auth/register",
  async (draft, { rejectWithValue }) => {
    try {
      const result = await request<AuthResponse>("/auth/register/", {
        method: "POST",
        body: draft,
      });
      await saveToken(result.token);
      return result;
    } catch (error) {
      return rejectWithValue(errorText(error, "Could not create that account."));
    }
  },
);

export const logout = createAsyncThunk<void, void, { rejectValue: string; state: { auth: AuthState } }>(
  "auth/logout",
  async (_, { getState }) => {
    const token = getState().auth.token;
    try {
      if (token) {
        await request<void>("/auth/logout/", { method: "POST", token });
      }
    } catch {
      // The local session still ends if the server is unreachable.
    }
    await saveToken(null);
  },
);

export const updateProfile = createAsyncThunk<
  SessionUser,
  { display_name: string; bio: string },
  { rejectValue: string; state: { auth: AuthState } }
>("auth/updateProfile", async (draft, { getState, rejectWithValue }) => {
  try {
    return await request<SessionUser>("/users/me/", {
      method: "PUT",
      token: getState().auth.token,
      body: draft,
    });
  } catch (error) {
    return rejectWithValue(errorText(error, "Could not save your profile."));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionReady(state, action: PayloadAction<AuthResponse | null>) {
      if (!action.payload) {
        state.user = null;
        state.token = null;
        state.status = "unauthenticated";
        state.error = null;
        return;
      }
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = "authenticated";
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.saving = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.status = "authenticated";
      })
      .addCase(login.rejected, (state, action) => {
        state.saving = false;
        state.status = "unauthenticated";
        state.error = action.payload ?? "Could not sign in.";
      })
      .addCase(register.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.saving = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.status = "authenticated";
      })
      .addCase(register.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Could not create that account.";
      })
      .addCase(logout.fulfilled, () => ({
        ...initialState,
        status: "unauthenticated" as const,
      }))
      .addCase(updateProfile.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Could not save your profile.";
      });
  },
});

export const { sessionReady, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
