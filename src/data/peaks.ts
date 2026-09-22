import peaksData from './peaks.json';

// Source: https://github.com/open-peaks/data, built from the individual peak files rather than
// _index.geojson, which leaves out every peak without coordinates. Sorted by height.
export type Peak = {
  /** The peak's file path in the source repo, e.g. `asia.nepal.mount-everest`. */
  id: string;
  name: string;
  meters: number | null;
  feet: number | null;
  latitude: number | null;
  longitude: number | null;
  continent: string;
  countries: string[];
  regions: string[];
}

export const peaks: Peak[] = peaksData;

export const formatMeters = (peak: Peak) =>
  peak.meters === null ? 'Unknown height' : `${peak.meters.toLocaleString('en-US')} m`;
