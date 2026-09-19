import { ThemedView } from '@/components/themed-view';
import { Stack } from 'expo-router';

export default function ProfileScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Profile' }} />
    </ThemedView>
  );
}
