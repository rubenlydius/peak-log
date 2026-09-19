import peaksData from './peaks.json';

// Source: https://github.com/open-peaks/data (_index.geojson), flattened and sorted by height.
export type Peak = {
  id: number;
  name: string;
  meters: number;
  feet: number;
  latitude: number;
  longitude: number;
  continent: string;
  countries: string[];
  regions: string[];
}

export const peaks: Peak[] = peaksData;
