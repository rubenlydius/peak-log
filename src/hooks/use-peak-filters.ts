import { create } from 'zustand';

import { peaks } from '@/data/peaks';

export type ClimbedFilter = 'all' | 'climbed' | 'unclimbed';

export const HEIGHT_STEP = 100;
export const HEIGHT_MIN = 0;
export const HEIGHT_MAX =
  Math.ceil(Math.max(...peaks.map((peak) => peak.meters ?? 0)) / HEIGHT_STEP) * HEIGHT_STEP;

interface PeakFiltersState {
  climbed: ClimbedFilter;
  minMeters: number;
  maxMeters: number;
  /** Selected countries; empty means all countries. */
  countries: string[];
  setClimbed: (climbed: ClimbedFilter) => void;
  setHeightRange: (minMeters: number, maxMeters: number) => void;
  toggleCountry: (country: string) => void;
  clearCountries: () => void;
  reset: () => void;
}

const initialState = {
  climbed: 'all' as ClimbedFilter,
  minMeters: HEIGHT_MIN,
  maxMeters: HEIGHT_MAX,
  countries: [] as string[],
};

export const usePeakFiltersStore = create<PeakFiltersState>()((set) => ({
  ...initialState,
  setClimbed: (climbed) => set({ climbed }),
  setHeightRange: (minMeters, maxMeters) => set({ minMeters, maxMeters }),
  toggleCountry: (country) =>
    set((state) => ({
      countries: state.countries.includes(country)
        ? state.countries.filter((name) => name !== country)
        : [...state.countries, country],
    })),
  clearCountries: () => set({ countries: [] }),
  reset: () => set(initialState),
}));

export const isHeightFilterActive = (state: Pick<PeakFiltersState, 'minMeters' | 'maxMeters'>) =>
  state.minMeters > HEIGHT_MIN || state.maxMeters < HEIGHT_MAX;

export const isPeakFiltersActive = (state: PeakFiltersState) =>
  state.climbed !== 'all' || isHeightFilterActive(state) || state.countries.length > 0;
