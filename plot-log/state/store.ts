import { configureStore } from '@reduxjs/toolkit';

import plotsReducer from './plotsReducer';

export const store = configureStore({
  reducer: {
    plots: plotsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
