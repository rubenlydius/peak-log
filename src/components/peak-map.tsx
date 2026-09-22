import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Peak } from '@/data/peaks';

// The map uses the Expo UI SwiftUI popover, so it only exists in the iOS app.
export const PeakMap = (_props: { peaks: Peak[] }) => (
  <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <ThemedText themeColor="textSecondary">The map is only available in the iOS app.</ThemedText>
  </ThemedView>
);
