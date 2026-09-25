import { HorizonStrip } from '@/components/horizon-strip';
import { NearbyPeaksList, RadiusSlider, useNearbyPeaks } from '@/components/nearby-peaks';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useCompassHeading } from '@/hooks/use-compass-heading';
import { isDevLocationEnabled, useDevLocationStore } from '@/hooks/use-dev-location';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/utils/geo';

import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

const DIAL_SIZE = 150;
const NORTH_COLOR = '#E5484D';
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const TICK_ANGLES = Array.from({ length: 36 }, (_, i) => i * 10);
const LABELS = [
  { text: 'N', angle: 0 },
  { text: 'E', angle: 90 },
  { text: 'S', angle: 180 },
  { text: 'W', angle: 270 },
];

const cardinalFor = (heading: number) => CARDINALS[Math.round(heading / 45) % 8];

export default function CompassScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { available, heading, rotation } = useCompassHeading();
  const { status, coordinates } = useDeviceLocation();
  const [radiusKm, setRadiusKm] = useState(50);

  // Development only: a long press on the dial steps through stand-in locations, so the mountain
  // features can be tried out far away from any mountain.
  const devOverride = useDevLocationStore((state) => state.override);
  const cycleDevLocation = useDevLocationStore((state) => state.cycle);
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const devMessageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNextDevLocation = () => {
    const next = cycleDevLocation();
    setDevMessage(next ? `Location set to ${next.name}` : 'Back to your own location');
    if (devMessageTimeout.current) clearTimeout(devMessageTimeout.current);
    devMessageTimeout.current = setTimeout(() => setDevMessage(null), 2500);
  };
  const nearbyPeaks = useNearbyPeaks(coordinates, radiusKm);

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const emptyMessage = {
    pending: 'Waiting for your location…',
    denied: 'Allow location access in Settings to see the mountains around you.',
    unavailable: "Your location isn't available on this device.",
    granted: coordinates
      ? `No mountains within ${formatDistance(radiusKm)}. Drag the slider to look further.`
      : 'Waiting for your location…',
  }[status];

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Compass' }} />

      {available === false ? (
        // Without a compass nothing can be laid out by direction, so the peaks stay a plain list.
        <>
          {/* Long-pressable as well, so the development location switch stays reachable here. */}
          <Pressable
            onLongPress={isDevLocationEnabled ? showNextDevLocation : undefined}
            delayLongPress={1500}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              No compass on this device, so the mountains around you are listed by distance.
            </ThemedText>
          </Pressable>
          <NearbyPeaksList nearbyPeaks={nearbyPeaks} rotation={null} emptyMessage={emptyMessage} />
        </>
      ) : (
        <HorizonStrip
          nearbyPeaks={nearbyPeaks}
          rotation={rotation}
          radiusKm={radiusKm}
          message={nearbyPeaks.length ? undefined : emptyMessage}
        />
      )}

      {available !== false && (
        <View style={styles.compass}>
          <Pressable
            onLongPress={isDevLocationEnabled ? showNextDevLocation : undefined}
            delayLongPress={1500}
            style={styles.dialWrapper}>
            <View style={[styles.pointer, { borderTopColor: NORTH_COLOR }]} />
            <Animated.View style={[styles.dial, { borderColor: theme.textSecondary }, dialStyle]}>
              {TICK_ANGLES.map((angle) => (
                <View key={angle} style={[styles.spoke, { transform: [{ rotate: `${angle}deg` }] }]}>
                  <View
                    style={[
                      styles.tick,
                      {
                        backgroundColor: theme.textSecondary,
                        height: angle % 90 === 0 ? 0 : angle % 30 === 0 ? 10 : 5,
                      },
                    ]}
                  />
                </View>
              ))}
              {LABELS.map(({ text, angle }) => (
                <View key={text} style={[styles.spoke, { transform: [{ rotate: `${angle}deg` }] }]}>
                  <ThemedText
                    type="smallBold"
                    style={[styles.label, text === 'N' && { color: NORTH_COLOR }]}>
                    {text}
                  </ThemedText>
                </View>
              ))}
            </Animated.View>
          </Pressable>

          <View style={styles.readout}>
            <ThemedText type="subtitle">
              {heading}° {cardinalFor(heading)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {nearbyPeaks.length
                ? `${nearbyPeaks.length} mountain${nearbyPeaks.length === 1 ? '' : 's'} within ${formatDistance(radiusKm)}`
                : 'No mountains in range'}
            </ThemedText>
          </View>
        </View>
      )}

      {!!devMessage && (
        <ThemedView type="backgroundSelected" style={styles.devMessage}>
          <ThemedText type="smallBold">{devMessage}</ThemedText>
        </ThemedView>
      )}

      {/* The tab bar floats over the screen, so the slider keeps clear of it. */}
      <View style={{ paddingBottom: insets.bottom + BottomTabInset }}>
        {!!devOverride && (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.devBadge}>
            Standing in {devOverride.name} (dev)
          </ThemedText>
        )}
        <RadiusSlider radiusKm={radiusKm} onChange={setRadiusKm} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  compass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  readout: {
    flex: 1,
    gap: Spacing.one,
  },
  dialWrapper: {
    alignItems: 'center',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 6,
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: 2,
  },
  spoke: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
  },
  tick: {
    width: 2,
    marginTop: 4,
  },
  label: {
    marginTop: 12,
  },
  message: {
    textAlign: 'center',
    padding: Spacing.three,
  },
  devBadge: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  devMessage: {
    position: 'absolute',
    alignSelf: 'center',
    top: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
});
