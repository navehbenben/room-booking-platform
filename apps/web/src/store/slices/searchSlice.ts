import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../api/client';
import { friendlyError } from '../../utils/errorMessages';
import { defaultStart, defaultEnd, dateToStartISO, dateToEndISO } from '../../utils/date';
import { SEARCH_LIMIT } from '../../constants/search';
import type { Room, SearchParams } from '../../types';

// ── sessionStorage persistence ────────────────────────────────────────────────
// Params are saved to sessionStorage after each search so that navigating to a
// room detail page and pressing "Back" restores the previous filters exactly.
const PARAMS_KEY = 'rb_search_params';

function loadPersistedParams(): SearchParams {
  try {
    const raw = sessionStorage.getItem(PARAMS_KEY);
    if (raw) return JSON.parse(raw) as SearchParams;
  } catch {}
  return {
    start: dateToStartISO(defaultStart()),
    end: dateToEndISO(defaultEnd()),
    capacity: 2,
    featuresText: '',
    page: 1,
  };
}

function persistParams(params: SearchParams) {
  try {
    sessionStorage.setItem(PARAMS_KEY, JSON.stringify(params));
  } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────
export interface SearchState {
  params: SearchParams;
  results: Room[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: string;
}

const initialState: SearchState = {
  params: loadPersistedParams(),
  results: [],
  total: 0,
  page: 1,
  hasMore: false,
  loading: false,
  error: '',
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const searchRooms = createAsyncThunk(
  'search/searchRooms',
  async (page: number, { getState, rejectWithValue }) => {
    const { params } = (getState() as { search: SearchState }).search;

    if (params.start && params.end && new Date(params.start) >= new Date(params.end)) {
      return rejectWithValue('Check-out must be after check-in.');
    }

    const features = params.featuresText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await api.search({
        start: new Date(params.start).toISOString(),
        end: new Date(params.end).toISOString(),
        capacity: params.capacity,
        features,
        page,
      });
      return { ...res, page };
    } catch (e) {
      return rejectWithValue(friendlyError(e));
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    /** Update a single search param (e.g. capacity, start date). */
    updateParams: (state, action: PayloadAction<Partial<SearchParams>>) => {
      state.params = { ...state.params, ...action.payload };
    },
    /** Merge URL-provided overrides on mount (used by SearchPage). */
    applyUrlOverrides: (state, action: PayloadAction<Partial<SearchParams>>) => {
      state.params = { ...state.params, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchRooms.pending, (state, action) => {
        state.loading = true;
        state.error = '';
        if (action.meta.arg === 1) state.hasMore = false;
      })
      .addCase(searchRooms.fulfilled, (state, action) => {
        const { results, total, page } = action.payload;
        // Page 1 replaces results; subsequent pages accumulate (infinite scroll)
        state.results = page === 1 ? (results as Room[]) : [...state.results, ...(results as Room[])];
        state.total = total;
        state.page = page;
        state.hasMore = results.length > 0 && page * SEARCH_LIMIT < total;
        state.loading = false;
        persistParams(state.params);
      })
      .addCase(searchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Search failed. Please try again.';
      });
  },
});

export const { updateParams, applyUrlOverrides } = searchSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectSearchParams = (state: { search: SearchState }) => state.search.params;
export const selectSearchResults = (state: { search: SearchState }) => state.search.results;
export const selectSearchMeta = (state: { search: SearchState }) => ({
  total: state.search.total,
  page: state.search.page,
  hasMore: state.search.hasMore,
  loading: state.search.loading,
  error: state.search.error,
});

export default searchSlice.reducer;
