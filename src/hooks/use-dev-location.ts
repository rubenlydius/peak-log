import { create } from 'zustand';

import { Coordinates } from '@/utils/geo';

/**
 * A development-only stand-in for the device's position, so the mountain features can be tried out
 * from anywhere. It is only reachable in development builds, never in a release build, and it is
 * deliberately not saved: restarting the app always returns to the real location.
 */
export const DEV_LOCATIONS: { name: string; coordinates: Coordinates }[] = [
  { name: 'Chamonix', coordinates: { latitude: 45.9237, longitude: 6.8694 } },
  { name: 'Kathmandu', coordinates: { latitude: 27.7172, longitude: 85.324 } },
];

interface DevLocationState {
  /** The stand-in in use, or null while the real location is used. */
  override: { name: string; coordinates: Coordinates } | null;
  /** Steps to the next stand-in, wrapping back to the real location, and returns the new one. */
  cycle: () => DevLocationState['override'];
}

export const useDevLocationStore = create<DevLocationState>()((set, get) => ({
  override: null,
  cycle: () => {
    const current = get().override;
    const index = current ? DEV_LOCATIONS.findIndex((location) => location.name === current.name) : -1;
    // One past the last entry means back to the device's own location.
    const next = index + 1 < DEV_LOCATIONS.length ? DEV_LOCATIONS[index + 1] : null;
    set({ override: next });
    return next;
  },
}));

export const isDevLocationEnabled = __DEV__;
