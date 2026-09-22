import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ClimbedState {
  climbedIds: string[];
  isClimbed: (peakId: string) => boolean;
  toggleClimbed: (peakId: string) => void;
}

export const useClimbedStore = create<ClimbedState>()(
  persist(
    (set, get) => ({
      climbedIds: [],
      isClimbed: (peakId) => get().climbedIds.includes(peakId),
      toggleClimbed: (peakId) =>
        set((state) => ({
          climbedIds: state.climbedIds.includes(peakId)
            ? state.climbedIds.filter((id) => id !== peakId)
            : [...state.climbedIds, peakId],
        })),
    }),
    {
      name: 'climbed-peaks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ climbedIds: state.climbedIds }),
      // Version 0 stored numeric ids based on list position, which changed when the full dataset
      // was loaded. They can't be mapped to the new ids reliably, so they are dropped.
      version: 1,
      migrate: () => ({ climbedIds: [] }),
    },
  ),
);
