import {
  NearbyPeaksList,
  RadiusSlider,
  useNearbyPeaks,
} from '@/components/nearby-peaks';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCompassHeading } from '@/hooks/use-compass-heading';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/utils/geo';

import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

const DIAL_SIZE = 180;
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
  const { available, heading, rotation } = useCompassHeading();
  const { status, coordinates } = useDeviceLocation();
  const [radiusKm, setRadiusKm] = useState(50);
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
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          No compass on this device, so only the distance to each mountain is shown.
        </ThemedText>
      ) : (
        <View style={styles.compass}>
          <View style={styles.readout}>
            <ThemedText type="title">{heading}°</ThemedText>
            <ThemedText type="subtitle">{cardinalFor(heading)}</ThemedText>
          </View>

          <View style={styles.dialWrapper}>
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
          </View>
        </View>
      )}

      <RadiusSlider radiusKm={radiusKm} onChange={setRadiusKm} />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.listHeader}>
        {nearbyPeaks.length
          ? `${nearbyPeaks.length} mountain${nearbyPeaks.length === 1 ? '' : 's'} within ${formatDistance(radiusKm)}`
          : 'Nearby mountains'}
      </ThemedText>

      <NearbyPeaksList
        nearbyPeaks={nearbyPeaks}
        rotation={available === false ? null : rotation}
        emptyMessage={emptyMessage}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  compass: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  readout: {
    alignItems: 'center',
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
  listHeader: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  message: {
    textAlign: 'center',
    padding: Spacing.three,
  },
});
