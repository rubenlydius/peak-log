import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { peaks } from '@/data/peaks';
import { useClimbedStore } from '@/hooks/use-climbed-store';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabInset } from '@/constants/theme';

/** The detail page for the peak in the `id` route param, used by both the Mountains and Profile stacks. */
export function PeakDetail() {
  const { id } = useLocalSearchParams();
  const peak = peaks.find((peak) => peak.id === id);

  const climbed = useClimbedStore((state) => (peak ? state.isClimbed(peak.id) : false));
  const toggleClimbed = useClimbedStore((state) => state.toggleClimbed);

  const insets = useSafeAreaInsets();


  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: peak?.name ?? 'Mountain' }} />

      <ThemedView style={{ padding: 16, gap: 16 }}>
        <ThemedText type="title">{peak?.name}</ThemedText>

        <ThemedView style={{ gap: 4 }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Height
          </ThemedText>
          <ThemedText>
            {peak && peak.meters !== null && peak.feet !== null
              ? `${peak.meters.toLocaleString('en-US')} m (${peak.feet.toLocaleString('en-US')} ft)`
              : 'Unknown'}
          </ThemedText>
        </ThemedView>

        <ThemedView style={{ gap: 4 }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Country
          </ThemedText>
          <ThemedText>
            {peak?.countries.length ? peak.countries.join(', ') : peak?.continent}
          </ThemedText>
        </ThemedView>

        {!!peak?.regions.length && (
          <ThemedView style={{ gap: 4 }}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Region
            </ThemedText>
            <ThemedText>{peak.regions.join(', ')}</ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {!!peak && (
        <ThemedView style={{ marginTop: 'auto', padding: 16, paddingBottom: insets.bottom + BottomTabInset, }}>
          <Button
            title={climbed ? 'Climbed ✓' : 'Mark as climbed'}
            onPress={() => toggleClimbed(peak.id)}
          />
        </ThemedView>
      )}
    </ThemedView>
  );
}
