import { configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import challengesReducer from "./slices/challengesSlice";
import groupsReducer from "./slices/groupsSlice";
import leaderboardReducer, { fetchLeaderboard } from "./slices/leaderboardSlice";
import messagesReducer from "./slices/messagesSlice";
import submissionsReducer, { addReaction, createSubmission, removeReaction } from "./slices/submissionsSlice";

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  matcher: isAnyOf(createSubmission.fulfilled, addReaction.fulfilled, removeReaction.fulfilled),
  effect: async (_action, api) => {
    const groupId = (api.getState() as { groups: { selectedId: number | null } }).groups.selectedId;
    if (groupId != null) {
      await api.dispatch(fetchLeaderboard(groupId) as never);
    }
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupsReducer,
    challenges: challengesReducer,
    submissions: submissionsReducer,
    messages: messagesReducer,
    leaderboard: leaderboardReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
