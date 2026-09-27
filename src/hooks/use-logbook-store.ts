import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinates } from '@/utils/geo';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * A workout from Apple Health attached to a climb. It is stored as a copy rather than as a
 * reference, so the entry keeps its numbers even if the workout is later removed from Health.
 */
export interface AscentActivity {
  /** HealthKit's identifier, so the same workout isn't attached to two climbs by accident. */
  id: string;
  type: string;
  start: string;
  durationSeconds: number;
  distanceMeters?: number;
  elevationMeters?: number;
  energyKcal?: number;
  /** The GPS track, thinned out. Missing for sources that don't sync routes, such as COROS. */
  route?: Coordinates[];
}

/** One visit to a peak. The same peak can be climbed more than once, so each visit is its own entry. */
export interface Ascent {
  id: string;
  peakId: string;
  /** The day of the summit as `yyyy-mm-dd`, or null when it isn't known. */
  date: string | null;
  notes: string;
  /** Photos copied into the app's own folder; see `save-ascent-photo`. */
  photoUris: string[];
  /** The workout this climb was recorded with, when one was attached. */
  activity?: AscentActivity;
}

export type AscentDraft = Omit<Ascent, 'id'>;

interface LogbookState {
  ascents: Ascent[];
  addAscent: (draft: AscentDraft) => void;
  updateAscent: (id: string, draft: AscentDraft) => void;
  removeAscent: (id: string) => void;
}

// Newest first, with undated entries last, so lists and "last climbed" read the same everywhere.
const byDateDesc = (a: Ascent, b: Ascent) => (b.date ?? '').localeCompare(a.date ?? '');

export const useLogbookStore = create<LogbookState>()(
  persist(
    (set) => ({
      ascents: [],
      addAscent: (draft) =>
        set((state) => ({
          ascents: [{ ...draft, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }, ...state.ascents].sort(
            byDateDesc,
          ),
        })),
      updateAscent: (id, draft) =>
        set((state) => ({
          ascents: state.ascents
            .map((ascent) => (ascent.id === id ? { ...draft, id } : ascent))
            .sort(byDateDesc),
        })),
      removeAscent: (id) =>
        set((state) => ({ ascents: state.ascents.filter((ascent) => ascent.id !== id) })),
    }),
    {
      name: 'climbed-peaks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ ascents: state.ascents }),
      // Version 0 stored numeric ids based on list position, which changed when the full dataset
      // was loaded. They can't be mapped to the new ids reliably, so they were dropped. Version 1
      // stored a plain list of climbed peak ids, which becomes one undated entry per peak.
      version: 2,
      migrate: (persisted, version) => {
        if (version >= 2) return persisted as { ascents: Ascent[] };
        const climbedIds = version === 1 ? ((persisted as { climbedIds?: string[] }).climbedIds ?? []) : [];
        return {
          ascents: climbedIds.map((peakId, index) => ({
            id: `migrated-${index}`,
            peakId,
            date: null,
            notes: '',
            photoUris: [],
          })),
        };
      },
    },
  ),
);

/** The ids of every peak with at least one logged ascent, for the list, map and filters. */
export const useClimbedPeakIds = () => {
  const ascents = useLogbookStore((state) => state.ascents);
  return useMemo(() => new Set(ascents.map((ascent) => ascent.peakId)), [ascents]);
};

export const useAscentsForPeak = (peakId: string | undefined) => {
  const ascents = useLogbookStore((state) => state.ascents);
  return useMemo(
    () => (peakId ? ascents.filter((ascent) => ascent.peakId === peakId) : []),
    [ascents, peakId],
  );
};

export const useAscent = (ascentId: string | undefined) => {
  const ascents = useLogbookStore((state) => state.ascents);
  return ascentId ? ascents.find((ascent) => ascent.id === ascentId) : undefined;
};

export const formatAscentDate = (date: string | null) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Date unknown';

/** `yyyy-mm-dd` in the device's own timezone, so picking "today" doesn't land on yesterday. */
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
