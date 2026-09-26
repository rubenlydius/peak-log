import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { NearbyPeak } from '@/components/nearby-peaks';
import { useClimbedPeakIds } from '@/hooks/use-logbook-store';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/utils/geo';

import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

// How much of the horizon fits across the screen. Wider shows more peaks, narrower spreads them out.
const FIELD_OF_VIEW = 90;
// Peaks fade out over the last few degrees instead of blinking away at the edge.
const FADE_DEGREES = 10;
const MARKER_WIDTH = 120;
const MARKER_HEIGHT = 56;
// Labels this close together would sit on top of each other.
const MIN_GAP_X = MARKER_WIDTH * 0.9;
const MIN_GAP_Y = MARKER_HEIGHT + Spacing.one;
// Markers within this distance of each other are close enough that their heights get compared.
const NEIGHBOUR_X = MARKER_WIDTH * 2;
// Enough to fill the horizon; more only piles up labels that can't be read anyway.
const MAX_MARKERS = 40;
// The closest peak sits at the bottom of the strip and the furthest at the top, like a real horizon.
const STRIP_PADDING = Spacing.two;

const CARDINALS = [
  { label: 'N', bearing: 0 },
  { label: 'NE', bearing: 45 },
  { label: 'E', bearing: 90 },
  { label: 'SE', bearing: 135 },
  { label: 'S', bearing: 180 },
  { label: 'SW', bearing: 225 },
  { label: 'W', bearing: 270 },
  { label: 'NW', bearing: 315 },
];

/** The shortest angle from `a` to `b`, between -180 and 180. */
const angleBetween = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/**
 * Vertical positions for the markers: distance decides the height, nearest lowest, furthest
 * highest.
 *
 * Peaks are laid out nearest first, and each one is kept at or above every marker already placed
 * nearby, then moved further up until it covers none of them. Height therefore always reads as
 * distance: of two markers near each other, the higher one is the further one. A peak that runs
 * out of room at the top is left out, so a crowded horizon keeps its closest peaks.
 *
 * Two peaks in nearly the same direction stay the same distance apart on screen whatever the
 * heading, so a layout stays valid while turning and is only redone when the range or size changes.
 */
const layOutMarkers = (peaks: NearbyPeak[], radiusKm: number, width: number, height: number) => {
  const maxTop = Math.max(STRIP_PADDING, height - MARKER_HEIGHT - STRIP_PADDING);
  const placed: { x: number; top: number }[] = [];
  const markers: { peak: NearbyPeak; top: number }[] = [];

  peaks.forEach((peak) => {
    // Relative to the first peak, since only the distances between markers matter here.
    const x = (angleBetween(peaks[0].bearing, peak.bearing) / FIELD_OF_VIEW) * width;
    const naturalTop =
      STRIP_PADDING + (maxTop - STRIP_PADDING) * (1 - Math.min(1, peak.distance / radiusKm));

    // Never below a nearer marker close by, which would read as being nearer than it is.
    const neighbours = placed.filter((other) => Math.abs(other.x - x) < NEIGHBOUR_X);
    let top = Math.min(naturalTop, ...neighbours.map((other) => other.top));

    while (
      top >= STRIP_PADDING &&
      placed.some((other) => Math.abs(other.x - x) < MIN_GAP_X && Math.abs(other.top - top) < MIN_GAP_Y)
    ) {
      top -= MIN_GAP_Y;
    }

    // No room left above; the nearer peaks already there are the more useful ones.
    if (top < STRIP_PADDING) return;

    placed.push({ x, top });
    markers.push({ peak, top });
  });

  return markers;
};

/** Where a bearing sits on the strip, and how visible it is, for the current heading. */
const placeOnStrip = (bearing: number, rotation: number, width: number) => {
  'worklet';
  // `rotation` is the dial's rotation (-heading), so this is the angle away from where you point.
  const delta = ((((bearing + rotation) % 360) + 540) % 360) - 180;
  const edge = FIELD_OF_VIEW / 2;
  const fade = Math.min(1, Math.max(0, (edge - Math.abs(delta)) / FADE_DEGREES));
  return { x: width / 2 + (delta / FIELD_OF_VIEW) * width, opacity: fade };
};

const PeakMarker = ({
  peak,
  rotation,
  width,
  top,
}: {
  peak: NearbyPeak;
  rotation: SharedValue<number>;
  width: number;
  top: number;
}) => {
  const theme = useTheme();
  const climbed = useClimbedPeakIds().has(peak.id);

  const style = useAnimatedStyle(() => {
    const { x, opacity } = placeOnStrip(peak.bearing, rotation.value, width);
    return {
      opacity,
      transform: [{ translateX: x - MARKER_WIDTH / 2 }],
      // Nothing outside the field of view should catch a tap.
      pointerEvents: opacity === 0 ? 'none' : 'auto',
    };
  });

  return (
    <Animated.View style={[styles.marker, { top }, style]}>
      <Link href={`/compass/${peak.id}`} asChild>
        <Pressable>
          {/* The layout lives on this inner view: Link's asChild doesn't pass a style function through. */}
          <View style={styles.markerContent}>
            <SymbolView
              name={{ ios: 'triangle.fill', android: 'change_history', web: 'change_history' }}
              tintColor={climbed ? theme.accent : theme.textSecondary}
              size={12}
            />
            <ThemedText type="smallBold" numberOfLines={1} style={styles.markerLabel}>
              {peak.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDistance(peak.distance)}
            </ThemedText>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
};

const CardinalTick = ({
  label,
  bearing,
  rotation,
  width,
}: {
  label: string;
  bearing: number;
  rotation: SharedValue<number>;
  width: number;
}) => {
  const style = useAnimatedStyle(() => {
    const { x, opacity } = placeOnStrip(bearing, rotation.value, width);
    return { opacity, transform: [{ translateX: x - MARKER_WIDTH / 2 }] };
  });

  return (
    <Animated.View style={[styles.tick, style]} pointerEvents="none">
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Animated.View>
  );
};

/**
 * The peaks around you laid out like a skyline: left to right by direction, so they slide past as
 * you sweep the phone, and top to bottom by distance, with the nearest ones lowest.
 */
export const HorizonStrip = ({
  nearbyPeaks,
  rotation,
  radiusKm,
  message,
}: {
  nearbyPeaks: NearbyPeak[];
  rotation: SharedValue<number>;
  radiusKm: number;
  message?: string;
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const markers = useMemo(
    () =>
      size.width > 0
        ? layOutMarkers(nearbyPeaks.slice(0, MAX_MARKERS), radiusKm, size.width, size.height)
        : [],
    [nearbyPeaks, radiusKm, size],
  );

  return (
    <ThemedView
      style={styles.strip}
      onLayout={({ nativeEvent }) =>
        setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })
      }>
      {markers.map(({ peak, top }) => (
        <PeakMarker key={peak.id} peak={peak} rotation={rotation} width={size.width} top={top} />
      ))}

      {!!message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}

      <ThemedView style={styles.ticks}>
        {size.width > 0 &&
          CARDINALS.map((cardinal) => (
            <CardinalTick key={cardinal.label} {...cardinal} rotation={rotation} width={size.width} />
          ))}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  strip: {
    flex: 1,
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    left: 0,
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    alignItems: 'center',
  },
  markerContent: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.one,
  },
  markerLabel: {
    textAlign: 'center',
  },
  ticks: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
  },
  tick: {
    position: 'absolute',
    left: 0,
    width: MARKER_WIDTH,
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    padding: Spacing.three,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
});
