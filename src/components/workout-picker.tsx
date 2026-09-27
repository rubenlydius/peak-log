import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { AscentActivity } from '@/hooks/use-logbook-store';
import { useTheme } from '@/hooks/use-theme';
import { formatWorkoutDate, workoutDetails } from '@/utils/format-activity';
import {
  fetchRecentWorkouts,
  fetchWorkoutRoute,
  isHealthAvailable,
  requestWorkoutAccess,
  WorkoutSummary,
} from '@/utils/health-workouts';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Status = 'loading' | 'ready' | 'denied' | 'unavailable';

const WorkoutRow = ({ workout, onPress }: { workout: WorkoutSummary; onPress: () => void }) => (
  <Pressable onPress={onPress}>
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedView type="backgroundElement" style={styles.rowHeader}>
        <ThemedText type="smallBold">{workout.type}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatWorkoutDate(workout.start)}
        </ThemedText>
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        {workoutDetails(workout)}
      </ThemedText>
    </ThemedView>
  </Pressable>
);

/**
 * Picks one workout from Apple Health. HealthKit has no picker of its own and the Health app can't
 * hand a workout to another app, so the list is built here from the workouts we're allowed to read.
 */
export const WorkoutPicker = ({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (activity: AscentActivity) => void;
  onClose: () => void;
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>('loading');
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const load = async () => {
      if (!isHealthAvailable()) {
        if (!cancelled) setStatus('unavailable');
        return;
      }
      if (!(await requestWorkoutAccess())) {
        if (!cancelled) setStatus('denied');
        return;
      }

      try {
        const recent = await fetchRecentWorkouts();
        if (cancelled) return;
        setWorkouts(recent);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('denied');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const select = async (workout: WorkoutSummary) => {
    // The route is only fetched for the workout actually picked; loading all of them is wasteful.
    const route = await fetchWorkoutRoute(workout.id);
    onSelect({ ...workout, route });
  };

  const message = {
    loading: null,
    ready: workouts.length ? null : 'No hikes, walks, runs or climbs found in Apple Health.',
    denied:
      'Peak Log has no access to your workouts. You can grant it in Settings → Privacy & Security → Health.',
    unavailable: "Apple Health isn't available on this device.",
  }[status];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={{ flex: 1 }}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Add activity</ThemedText>
          <Pressable onPress={onClose}>
            <ThemedText type="link">Cancel</ThemedText>
          </Pressable>
        </ThemedView>

        {status === 'loading' && <ActivityIndicator style={styles.loader} color={theme.textSecondary} />}

        {!!message && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            {message}
          </ThemedText>
        )}

        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.four }]}>
          {workouts.map((workout) => (
            <WorkoutRow key={workout.id} workout={workout} onPress={() => select(workout)} />
          ))}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  loader: {
    paddingVertical: Spacing.four,
  },
  message: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
