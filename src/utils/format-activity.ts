/** The pieces of an activity these formatters need, shared by the picker and the logbook. */
interface ActivityLike {
  start: string;
  durationSeconds: number;
  distanceMeters?: number;
  elevationMeters?: number;
}

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes.toString().padStart(2, '0')}` : `${minutes} min`;
};

export const formatWorkoutDate = (start: string) =>
  new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** "12.4 km · 1,240 m up · 4h 07", leaving out whatever the source didn't record. */
export const workoutDetails = (activity: ActivityLike) =>
  [
    activity.distanceMeters ? `${(activity.distanceMeters / 1000).toFixed(1)} km` : null,
    activity.elevationMeters ? `${Math.round(activity.elevationMeters).toLocaleString('en-US')} m up` : null,
    formatDuration(activity.durationSeconds),
  ]
    .filter(Boolean)
    .join(' · ');
