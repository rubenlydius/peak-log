import { Image } from 'expo-image';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const UPDATE_INTERVAL_MS = 50;
// Keep the tilt small: it should feel like the photo sits behind glass, not like a toy.
const MAX_TILT_DEGREES = 6;
// How much phone rotation reaches that maximum; a quarter turn of the wrist is plenty.
const DEGREES_FOR_MAX_TILT = 25;
// A little movement with the tilt sells the depth, in points.
const MAX_SHIFT = 8;

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

/**
 * One photo shown large on top of the page, tilting slightly with the phone. Tapping anywhere
 * around the photo closes it; the photo itself swallows taps, so it can't be closed by accident.
 */
export const PhotoViewer = ({ uri, onClose }: { uri: string | null; onClose: () => void }) => {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  // The frame is sized to the photo itself, so everything around it closes the viewer. Proportions
  // are kept per photo, so reopening one doesn't have to measure it again.
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const aspectRatio = uri ? aspectRatios[uri] : undefined;
  // The first reading becomes the neutral position, so the photo lies flat however you hold it.
  const neutral = useRef<{ beta: number; gamma: number } | null>(null);

  useEffect(() => {
    if (!uri) return;

    neutral.current = null;
    tiltX.value = 0;
    tiltY.value = 0;

    let subscription: { remove: () => void } | undefined;

    DeviceMotion.isAvailableAsync().then((available) => {
      if (!available) return;

      DeviceMotion.setUpdateInterval(UPDATE_INTERVAL_MS);
      subscription = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;

        const beta = toDegrees(rotation.beta);
        const gamma = toDegrees(rotation.gamma);
        neutral.current ??= { beta, gamma };

        const pitch = clamp(beta - neutral.current.beta, DEGREES_FOR_MAX_TILT);
        const roll = clamp(gamma - neutral.current.gamma, DEGREES_FOR_MAX_TILT);
        const scale = MAX_TILT_DEGREES / DEGREES_FOR_MAX_TILT;

        // Springs keep the photo from jittering with every sensor sample.
        tiltX.value = withSpring(-pitch * scale, { damping: 20, stiffness: 90 });
        tiltY.value = withSpring(roll * scale, { damping: 20, stiffness: 90 });
      });
    });

    return () => subscription?.remove();
  }, [uri, tiltX, tiltY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
      { translateX: (tiltY.value / MAX_TILT_DEGREES) * MAX_SHIFT },
      { translateY: (-tiltX.value / MAX_TILT_DEGREES) * MAX_SHIFT },
    ],
  }));

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.frame, aspectRatio ? { aspectRatio } : styles.unmeasured, style]}>
          {/* Swallows taps, so only the area around the photo closes the viewer. */}
          <Pressable onPress={() => {}} style={styles.fill}>
            {!!uri && (
              <Image
                source={{ uri }}
                style={styles.fill}
                contentFit="contain"
                onLoad={({ source }) =>
                  setAspectRatios((known) => ({ ...known, [uri]: source.width / source.height }))
                }
              />
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  frame: {
    width: '100%',
    maxHeight: '100%',
  },
  // Until the photo's proportions are known there is nothing to fit the frame to.
  unmeasured: {
    height: '80%',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
