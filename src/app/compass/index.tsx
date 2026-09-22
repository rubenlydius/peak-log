import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCompassHeading } from '@/hooks/use-compass-heading';
import { useTheme } from '@/hooks/use-theme';

import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

const DIAL_SIZE = 280;
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

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Compass' }} />

      {available === false ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          The magnetometer and accelerometer aren&apos;t available on this device.
        </ThemedText>
      ) : (
        <>
          <View style={styles.readout}>
            <ThemedText type="title">{heading}°</ThemedText>
            <ThemedText type="subtitle">{cardinalFor(heading)}</ThemedText>
          </View>

          <View style={styles.dialWrapper}>
            <View style={[styles.pointer, { borderTopColor: NORTH_COLOR }]} />
            <Animated.View
              style={[styles.dial, { borderColor: theme.textSecondary }, dialStyle]}>
              {TICK_ANGLES.map((angle) => (
                <View
                  key={angle}
                  style={[styles.spoke, { transform: [{ rotate: `${angle}deg` }] }]}>
                  <View
                    style={[
                      styles.tick,
                      {
                        backgroundColor: theme.textSecondary,
                        height: angle % 90 === 0 ? 0 : angle % 30 === 0 ? 14 : 7,
                      },
                    ]}
                  />
                </View>
              ))}
              {LABELS.map(({ text, angle }) => (
                <View
                  key={text}
                  style={[styles.spoke, { transform: [{ rotate: `${angle}deg` }] }]}>
                  <ThemedText
                    type="subtitle"
                    style={[styles.label, text === 'N' && { color: NORTH_COLOR }]}>
                    {text}
                  </ThemedText>
                </View>
              ))}
            </Animated.View>
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            Keep your phone roughly level, with the top edge pointing where you&apos;re heading.
          </ThemedText>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: 16,
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
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 18,
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
    marginTop: 18,
  },
  message: {
    textAlign: 'center',
  },
});
