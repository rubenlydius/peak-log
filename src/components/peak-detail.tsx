import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { peaks } from '@/data/peaks';
import { Ascent, formatAscentDate, useAscentsForPeak } from '@/hooks/use-logbook-store';
import { useMountainsViewStore } from '@/hooks/use-mountains-view-store';
import { useTheme } from '@/hooks/use-theme';

import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <ThemedView style={{ gap: Spacing.one }}>
    <ThemedText type="smallBold" themeColor="textSecondary">
      {label}
    </ThemedText>
    {children}
  </ThemedView>
);

const AscentCard = ({ ascent, onPress }: { ascent: Ascent; onPress: () => void }) => {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.ascentCard}>
        <ThemedView type="backgroundElement" style={styles.rowBetween}>
          <ThemedText type="smallBold">{formatAscentDate(ascent.date)}</ThemedText>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={theme.textSecondary}
            size={14}
          />
        </ThemedView>

        {!!ascent.notes && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
            {ascent.notes}
          </ThemedText>
        )}

        {ascent.photoUris.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {ascent.photoUris.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
            ))}
          </ScrollView>
        )}
      </ThemedView>
    </Pressable>
  );
};

/** The detail page for the peak in the `id` route param, used by both the Mountains and Profile stacks. */
export function PeakDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const peak = peaks.find((item) => item.id === id);

  const ascents = useAscentsForPeak(peak?.id);
  const showOnMap = useMountainsViewStore((state) => state.showOnMap);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The same screen lives in two stacks, so the log form is opened in whichever one is showing.
  const segments = useSegments();
  const stack = segments[0] === 'profile' ? '/profile' : '/(index)';

  // The map only exists on iOS, and only peaks with coordinates are on it.
  const canShowOnMap = Platform.OS === 'ios' && peak?.latitude != null && peak?.longitude != null;

  const viewOnMap = () => {
    if (!peak) return;
    showOnMap(peak.id);
    // Goes back to the Mountains screen, also switching tabs when opened from the Profile stack.
    router.navigate('/(index)');
  };

  const openForm = (ascentId?: string) => {
    if (!peak) return;
    router.push(`${stack}/log/${peak.id}${ascentId ? `?ascent=${ascentId}` : ''}` as never);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: peak?.name ?? 'Mountain' }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
        ]}>
        <ThemedText type="title">{peak?.name}</ThemedText>

        <Field label="Height">
          <ThemedText>
            {peak && peak.meters !== null && peak.feet !== null
              ? `${peak.meters.toLocaleString('en-US')} m (${peak.feet.toLocaleString('en-US')} ft)`
              : 'Unknown'}
          </ThemedText>
        </Field>

        <Field label="Country">
          <ThemedText>{peak?.countries.length ? peak.countries.join(', ') : peak?.continent}</ThemedText>
        </Field>

        {!!peak?.regions.length && (
          <Field label="Region">
            <ThemedText>{peak.regions.join(', ')}</ThemedText>
          </Field>
        )}

        {canShowOnMap && (
          <Pressable onPress={viewOnMap}>
            <ThemedText type="link">View on map</ThemedText>
          </Pressable>
        )}

        {!!peak && (
          <ThemedView style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Logbook{ascents.length ? ` (${ascents.length})` : ''}
            </ThemedText>

            {ascents.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                No climbs logged yet.
              </ThemedText>
            )}

            {ascents.map((ascent) => (
              <AscentCard key={ascent.id} ascent={ascent} onPress={() => openForm(ascent.id)} />
            ))}

            <Pressable onPress={() => openForm()}>
              <ThemedView type="backgroundElement" style={styles.logButton}>
                <ThemedText type="smallBold">
                  {ascents.length ? 'Log another climb' : 'Log a climb'}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  ascentCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  photoRow: {
    gap: Spacing.two,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: Spacing.two,
  },
  logButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
});
