import { useMemo } from 'react';
import { create } from 'zustand';

import { peaks } from '@/data/peaks';
import { useClimbedStore } from '@/hooks/use-climbed-store';

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

// Lowercase without accents, so "monch" finds "Mönch".
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const searchableNames = new Map(peaks.map((peak) => [peak.id, normalize(peak.name)]));

/** The peaks matching the search query and the active filters, shared by the list and the map. */
export const useFilteredPeaks = (query: string) => {
  const climbedIds = useClimbedStore((state) => state.climbedIds);
  const filters = usePeakFiltersStore();

  return useMemo(() => {
    const heightActive = isHeightFilterActive(filters);
    const search = normalize(query);

    return peaks.filter((peak) => {
      if (search && !searchableNames.get(peak.id)!.includes(search)) return false;
      if (filters.climbed === 'climbed' && !climbedIds.includes(peak.id)) return false;
      if (filters.climbed === 'unclimbed' && climbedIds.includes(peak.id)) return false;
      if (heightActive) {
        // Peaks without a known height can't satisfy a narrowed height range.
        if (peak.meters === null) return false;
        if (peak.meters < filters.minMeters || peak.meters > filters.maxMeters) return false;
      }
      if (
        filters.countries.length > 0 &&
        !peak.countries.some((country) => filters.countries.includes(country))
      ) {
        return false;
      }
      return true;
    });
  }, [climbedIds, filters, query]);
};
