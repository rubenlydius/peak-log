import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { peaks } from '@/data/peaks';
import { Stack, useLocalSearchParams } from 'expo-router';

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const peak = peaks.find((peak) => peak.id === Number(id));

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
            {peak ? `${peak.meters.toLocaleString('en-US')} m (${peak.feet.toLocaleString('en-US')} ft)` : ''}
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
    </ThemedView>
  );
}
