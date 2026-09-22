import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { peaks } from '@/data/peaks';

import { FlashList } from '@shopify/flash-list';
import { Link, Stack } from 'expo-router';

const PeakList = () => {
  return (
    <FlashList
      data={peaks}
      keyExtractor={(item) => String(item.id)}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item }) => (
        <Link href={`/(index)/${item.id}`}>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
            <ThemedView style={{ flex: 1 }}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="small">{item.countries.join(', ') || item.continent}</ThemedText>
            </ThemedView>
            <ThemedText type="small">{item.meters.toLocaleString('en-US')} m</ThemedText>
          </ThemedView>
        </Link>
      )}
    />
  );
};

export default function HomeScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Mountains' }} />
      <PeakList />
    </ThemedView>
  );
}
