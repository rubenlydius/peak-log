import { Coordinates } from '@/utils/geo';

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

// Apple Health only exists on iOS; see health-workouts.ios.ts for the real thing.
export const isHealthAvailable = () => false;
export const requestWorkoutAccess = async () => false;
export const fetchRecentWorkouts = async (): Promise<WorkoutSummary[]> => [];
export const fetchWorkoutRoute = async (_id: string): Promise<Coordinates[] | undefined> => undefined;
