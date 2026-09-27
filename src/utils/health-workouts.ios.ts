import type * as HealthKit from '@kingstinct/react-native-healthkit';

import { Coordinates } from '@/utils/geo';

type WorkoutProxyTyped = Awaited<ReturnType<typeof HealthKit.queryWorkoutSamples>>[number];

/** A workout from Apple Health, flattened to the bits the logbook needs. */
export interface WorkoutSummary {
  /** HealthKit's identifier for the workout, kept so the same one isn't attached twice. */
  id: string;
  /** "Hike", "Walk", "Run" or "Climb". */
  type: string;
  /** When the workout started, as an ISO timestamp. */
  start: string;
  durationSeconds: number;
  distanceMeters?: number;
  elevationMeters?: number;
  energyKcal?: number;
}

/**
 * HealthKit is a native module, so it only exists in a development or release build. Loading it
 * lazily keeps the app running in Expo Go, where the picker simply reports it as unavailable.
 */
const loadHealthKit = (): typeof HealthKit | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@kingstinct/react-native-healthkit');
  } catch {
    return null;
  }
};

/** The four kinds of activity that can lead to a summit, by their HealthKit numbers. */
const ACTIVITY_LABELS = new Map<number, string>([
  [24, 'Hike'],
  [52, 'Walk'],
  [37, 'Run'],
  [9, 'Climb'],
]);

// Enough to cover a season of walking without making the list endless.
const WORKOUT_LIMIT = 50;
// A route can hold thousands of points; this many keeps the shape while staying small to store.
const MAX_ROUTE_POINTS = 300;

// The native workout objects behind the last query, so a route can be fetched after picking one.
const proxiesById = new Map<string, WorkoutProxyTyped>();

export const isHealthAvailable = () => {
  const healthKit = loadHealthKit();
  try {
    return healthKit?.isHealthDataAvailable() ?? false;
  } catch {
    return false;
  }
};

/** Asks for read access to workouts and their routes. Returns false when it isn't granted. */
export const requestWorkoutAccess = async () => {
  const healthKit = loadHealthKit();
  if (!healthKit) return false;

  try {
    return await healthKit.requestAuthorization({
      toRead: ['HKWorkoutTypeIdentifier', 'HKWorkoutRouteTypeIdentifier'],
    });
  } catch {
    return false;
  }
};

const toSummary = (workout: WorkoutProxyTyped): WorkoutSummary => ({
  id: workout.uuid,
  type: ACTIVITY_LABELS.get(workout.workoutActivityType) ?? 'Activity',
  start: workout.startDate.toISOString(),
  durationSeconds: workout.duration.quantity,
  distanceMeters: workout.totalDistance?.quantity,
  // Apple Watch records the climb; sources like COROS often leave it out.
  elevationMeters: workout.metadata?.HKElevationAscended?.quantity,
  energyKcal: workout.totalEnergyBurned?.quantity,
});

/** The most recent hikes, walks, runs and climbs, newest first. */
export const fetchRecentWorkouts = async (): Promise<WorkoutSummary[]> => {
  const healthKit = loadHealthKit();
  if (!healthKit) return [];

  const workouts = await healthKit.queryWorkoutSamples({
    limit: WORKOUT_LIMIT,
    ascending: false,
    filter: {
      OR: [...ACTIVITY_LABELS.keys()].map((workoutActivityType) => ({ workoutActivityType })),
    },
  });

  proxiesById.clear();
  workouts.forEach((workout) => proxiesById.set(workout.uuid, workout));

  return workouts.map(toSummary);
};

/**
 * The GPS track of a workout, thinned out to a few hundred points, or undefined when the source
 * didn't record one. COROS, for instance, syncs its stats to Health but not its routes.
 */
export const fetchWorkoutRoute = async (id: string): Promise<Coordinates[] | undefined> => {
  const workout = proxiesById.get(id);
  if (!workout) return undefined;

  try {
    const routes = await workout.getWorkoutRoutes();
    const locations = routes.flatMap((route) => route.locations);
    if (locations.length === 0) return undefined;

    const step = Math.ceil(locations.length / MAX_ROUTE_POINTS);
    return locations
      .filter((_, index) => index % step === 0)
      .map(({ latitude, longitude }) => ({ latitude, longitude }));
  } catch {
    // No permission for routes, or none recorded; the stats are still worth keeping.
    return undefined;
  }
};
