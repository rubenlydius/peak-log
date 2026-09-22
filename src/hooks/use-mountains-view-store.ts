import { create } from 'zustand';

export type ViewMode = 'list' | 'map';

interface MountainsViewState {
  viewMode: ViewMode;
  /**
   * The peak the map centers and zooms in on. A new object per request, so asking for the same peak
   * again (after panning away) still moves the map.
   */
  focus: { peakId: string } | null;
  setViewMode: (viewMode: ViewMode) => void;
  showOnMap: (peakId: string) => void;
}

export const useMountainsViewStore = create<MountainsViewState>()((set) => ({
  viewMode: 'list',
  focus: null,
  // Switching views by hand ends the focus, so the map opens on the world view again.
  setViewMode: (viewMode) => set({ viewMode, focus: null }),
  showOnMap: (peakId) => set({ viewMode: 'map', focus: { peakId } }),
}));
