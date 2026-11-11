import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { DJANGO_API_BASE } from '@/services/djangoApi';

export type PlotEntry = {
  id: number;
  site: string;
  species: string;
  count: number;
  note: string;
  flagged: boolean;
};

export type PlotDraft = {
  site: string;
  species: string;
  count: number;
  note: string;
};

export type PlotsState = {
  entries: PlotEntry[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  saving: boolean;
  pendingIds: number[];
};

const initialState: PlotsState = {
  entries: [],
  status: 'idle',
  error: null,
  saving: false,
  pendingIds: [],
};

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

function networkMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch' || error.message.includes('Network request failed')) {
      return 'The field server did not respond. Start Django on port 8000, or set EXPO_PUBLIC_DJANGO_API_URL to the server address.';
    }
    return error.message;
  }
  return fallback;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as unknown;
    if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') {
      return data.detail;
    }
    if (data && typeof data === 'object') {
      const parts = Object.entries(data).map(([key, value]) => {
        const message = Array.isArray(value) ? value.join(' ') : String(value);
        return `${key}: ${message}`;
      });
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
  } catch {
    // The body was not JSON.
  }
  return text || `The server returned HTTP ${response.status}.`;
}

export const fetchPlots = createAsyncThunk<PlotEntry[], void, { rejectValue: string }>(
  'plots/fetchPlots',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${DJANGO_API_BASE}/plots/`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return rejectWithValue(await readError(response));
      }
      return (await response.json()) as PlotEntry[];
    } catch (error) {
      return rejectWithValue(networkMessage(error, 'Could not load the plot board.'));
    }
  }
);

export const createPlot = createAsyncThunk<PlotEntry, PlotDraft, { rejectValue: string }>(
  'plots/createPlot',
  async (draft, { rejectWithValue }) => {
    try {
      const response = await fetch(`${DJANGO_API_BASE}/plots/`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        return rejectWithValue(await readError(response));
      }
      return (await response.json()) as PlotEntry;
    } catch (error) {
      return rejectWithValue(networkMessage(error, 'Could not save that sighting.'));
    }
  }
);

export const togglePlotFlag = createAsyncThunk<
  PlotEntry,
  number,
  { rejectValue: string; state: { plots: PlotsState } }
>('plots/toggleFlag', async (id, { getState, rejectWithValue }) => {
  const current = getState().plots.entries.find((entry) => entry.id === id);
  if (!current) {
    return rejectWithValue('That plot is no longer on the board.');
  }

  try {
    const response = await fetch(`${DJANGO_API_BASE}/plots/${id}/`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ flagged: !current.flagged }),
    });
    if (!response.ok) {
      return rejectWithValue(await readError(response));
    }
    return (await response.json()) as PlotEntry;
  } catch (error) {
    return rejectWithValue(networkMessage(error, 'Could not update that flag.'));
  }
});

export const deletePlot = createAsyncThunk<number, number, { rejectValue: string }>(
  'plots/deletePlot',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${DJANGO_API_BASE}/plots/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return rejectWithValue(await readError(response));
      }
      return id;
    } catch (error) {
      return rejectWithValue(networkMessage(error, 'Could not remove that plot.'));
    }
  }
);

function dropPending(pendingIds: number[], id: number) {
  return pendingIds.filter((pendingId) => pendingId !== id);
}

const plotsSlice = createSlice({
  name: 'plots',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlots.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPlots.fulfilled, (state, action) => {
        state.status = 'ready';
        state.entries = action.payload;
        state.error = null;
      })
      .addCase(fetchPlots.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Could not load the plot board.';
      })
      .addCase(createPlot.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createPlot.fulfilled, (state, action) => {
        state.saving = false;
        state.entries.unshift(action.payload);
        state.status = 'ready';
      })
      .addCase(createPlot.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Could not save that sighting.';
      })
      .addCase(togglePlotFlag.pending, (state, action) => {
        state.pendingIds.push(action.meta.arg);
        state.error = null;
      })
      .addCase(togglePlotFlag.fulfilled, (state, action) => {
        state.pendingIds = dropPending(state.pendingIds, action.payload.id);
        const index = state.entries.findIndex((entry) => entry.id === action.payload.id);
        if (index >= 0) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(togglePlotFlag.rejected, (state, action) => {
        state.pendingIds = dropPending(state.pendingIds, action.meta.arg);
        state.error = action.payload ?? 'Could not update that flag.';
      })
      .addCase(deletePlot.pending, (state, action) => {
        state.pendingIds.push(action.meta.arg);
        state.error = null;
      })
      .addCase(deletePlot.fulfilled, (state, action) => {
        state.pendingIds = dropPending(state.pendingIds, action.payload);
        state.entries = state.entries.filter((entry) => entry.id !== action.payload);
      })
      .addCase(deletePlot.rejected, (state, action) => {
        state.pendingIds = dropPending(state.pendingIds, action.meta.arg);
        state.error = action.payload ?? 'Could not remove that plot.';
      });
  },
});

export default plotsSlice.reducer;
