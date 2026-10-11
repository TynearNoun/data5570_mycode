import type { UnknownAction } from 'redux';

export type PlotEntry = {
  id: string;
  site: string;
  species: string;
  count: number;
  note: string;
  flagged: boolean;
};

export type PlotsState = {
  entries: PlotEntry[];
};

export const ADD_PLOT = 'plots/ADD_PLOT';
export const TOGGLE_FLAG = 'plots/TOGGLE_FLAG';
export const REMOVE_PLOT = 'plots/REMOVE_PLOT';

type AddPlotAction = {
  type: typeof ADD_PLOT;
  payload: PlotEntry;
};

type ToggleFlagAction = {
  type: typeof TOGGLE_FLAG;
  payload: { id: string };
};

type RemovePlotAction = {
  type: typeof REMOVE_PLOT;
  payload: { id: string };
};

export type PlotsAction = AddPlotAction | ToggleFlagAction | RemovePlotAction;

const initialState: PlotsState = {
  entries: [
    {
      id: 'plot-cedar-bend',
      site: 'Cedar Bend',
      species: 'American robin',
      count: 6,
      note: 'Foraging along the gravel bar after the rain.',
      flagged: false,
    },
    {
      id: 'plot-mill-race',
      site: 'Mill Race',
      species: 'Painted turtle',
      count: 2,
      note: 'Basking on the south log. Both looked like adults.',
      flagged: false,
    },
    {
      id: 'plot-oak-ridge',
      site: 'Oak Ridge',
      species: 'Monarch',
      count: 11,
      note: 'Nectaring on milkweed along the west edge.',
      flagged: true,
    },
  ],
};

export function addPlot(input: {
  site: string;
  species: string;
  count: number;
  note: string;
}): AddPlotAction {
  return {
    type: ADD_PLOT,
    payload: {
      id: `plot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      site: input.site,
      species: input.species,
      count: input.count,
      note: input.note,
      flagged: false,
    },
  };
}

export function toggleFlag(id: string): ToggleFlagAction {
  return { type: TOGGLE_FLAG, payload: { id } };
}

export function removePlot(id: string): RemovePlotAction {
  return { type: REMOVE_PLOT, payload: { id } };
}

function isPlotsAction(action: UnknownAction): action is PlotsAction {
  return action.type === ADD_PLOT || action.type === TOGGLE_FLAG || action.type === REMOVE_PLOT;
}

export default function plotsReducer(
  state: PlotsState = initialState,
  action: UnknownAction
): PlotsState {
  if (!isPlotsAction(action)) {
    return state;
  }

  switch (action.type) {
    case ADD_PLOT:
      return { ...state, entries: [action.payload, ...state.entries] };
    case TOGGLE_FLAG:
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.payload.id ? { ...entry, flagged: !entry.flagged } : entry
        ),
      };
    case REMOVE_PLOT:
      return {
        ...state,
        entries: state.entries.filter((entry) => entry.id !== action.payload.id),
      };
    default:
      return state;
  }
}
