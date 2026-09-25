import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { formatMeters, peaks } from '@/data/peaks';
import { useClimbedPeakIds } from '@/hooks/use-logbook-store';
import { useTheme } from '@/hooks/use-theme';
import { bearingDegrees, Coordinates, distanceKm, formatDistance, LocatedPeak } from '@/utils/geo';

import { Host, Slider } from '@expo/ui/swift-ui';
import { FlashList } from '@shopify/flash-list';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

export const RADIUS_MIN_KM = 5;
export const RADIUS_MAX_KM = 500;
export const RADIUS_STEP_KM = 5;
// More than this many rows is no longer a useful list, and the nearest ones are what matter.
const MAX_ROWS = 100;

const peaksWithCoordinates = peaks.filter(
  (peak): peak is LocatedPeak => peak.latitude !== null && peak.longitude !== null,
);

type NearbyPeak = LocatedPeak & { distance: number; bearing: number };

/** An arrow pointing at the peak, turning with the phone just like the compass dial. */
const BearingArrow = ({ bearing, rotation }: { bearing: number; rotation: SharedValue<number> }) => {
  const theme = useTheme();
  // `rotation` is the dial's rotation (-heading), so this lands on bearing - heading.
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${bearing + rotation.value}deg` }] }));

  return (
    <Animated.View style={style}>
      <SymbolView
        name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
        tintColor={theme.textSecondary}
        size={18}
      />
    </Animated.View>
  );
};

const NearbyRow = ({
  peak,
  rotation,
}: {
  peak: NearbyPeak;
  /** Null when there is no compass, in which case no direction can be shown. */
  rotation: SharedValue<number> | null;
}) => {
  const theme = useTheme();
  const climbed = useClimbedPeakIds().has(peak.id);

  return (
    <Link href={`/compass/${peak.id}`} asChild>
      <Pressable>
        {/* The layout lives on this inner view: Link's asChild doesn't pass a style function through. */}
        <ThemedView style={styles.row}>
          {rotation && <BearingArrow bearing={peak.bearing} rotation={rotation} />}

          <ThemedView style={{ flex: 1 }}>
            <ThemedView style={styles.nameRow}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {peak.name}
              </ThemedText>
              {climbed && (
                <SymbolView
                  name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                  tintColor={theme.text}
                  size={14}
                />
              )}
            </ThemedView>
            <ThemedText type="small" themeColor="textSecondary">
              {formatMeters(peak)}
            </ThemedText>
          </ThemedView>

          <ThemedText type="smallBold">{formatDistance(peak.distance)}</ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
};

export const RadiusSlider = ({
  radiusKm,
  onChange,
}: {
  radiusKm: number;
  onChange: (radiusKm: number) => void;
}) => (
  <ThemedView style={styles.sliderBlock}>
    <ThemedView style={styles.nameRow}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Range
      </ThemedText>
      <ThemedText type="smallBold">{formatDistance(radiusKm)}</ThemedText>
    </ThemedView>
    {/* A SwiftUI slider has no width of its own, so the host is sized instead of matching content. */}
    <Host style={styles.slider}>
      <Slider
        value={radiusKm}
        min={RADIUS_MIN_KM}
        max={RADIUS_MAX_KM}
        step={RADIUS_STEP_KM}
        onValueChange={(value) => onChange(Math.round(value))}
      />
    </Host>
  </ThemedView>
);

/** The peaks within `radiusKm` of `coordinates`, nearest first. */
export const useNearbyPeaks = (coordinates: Coordinates | null, radiusKm: number) =>
  useMemo(() => {
    if (!coordinates) return [];

    return peaksWithCoordinates
      .map((peak) => ({ ...peak, distance: distanceKm(coordinates, peak), bearing: 0 }))
      .filter((peak) => peak.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_ROWS)
      .map((peak) => ({ ...peak, bearing: bearingDegrees(coordinates, peak) }));
  }, [coordinates, radiusKm]);

export const NearbyPeaksList = ({
  nearbyPeaks,
  rotation,
  emptyMessage,
}: {
  nearbyPeaks: NearbyPeak[];
  rotation: SharedValue<number> | null;
  emptyMessage: string;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <FlashList
      data={nearbyPeaks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NearbyRow peak={item} rotation={rotation} />}
      contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.three }}
      ListEmptyComponent={
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {emptyMessage}
        </ThemedText>
      }
    />
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  slider: {
    height: 36,
  },
  sliderBlock: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  message: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
});
