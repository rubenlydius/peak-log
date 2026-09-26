import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 4;

type RangeSliderProps = {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  /** Called when a thumb is released. */
  onChange: (low: number, high: number) => void;
  formatLabel?: (value: number) => string;
};

type Range = { low: number; high: number };

/** A slider with two thumbs for picking a range between `min` and `max`. */
export function RangeSlider({ min, max, step, low, high, onChange, formatLabel = String }: RangeSliderProps) {
  const theme = useTheme();
  // The range under the thumbs while dragging; null when the props are the source of truth.
  const [dragRange, setDragRange] = useState<Range | null>(null);
  const labels = dragRange ?? { low, high };

  // Thumb positions in px, from 0 to the track width minus a thumb.
  const width = useSharedValue(0);
  const lowX = useSharedValue(0);
  const highX = useSharedValue(0);
  const startX = useSharedValue(0);

  // Follow outside changes, e.g. resetting the filters.
  useEffect(() => {
    lowX.set(((low - min) / (max - min)) * width.get());
    highX.set(((high - min) / (max - min)) * width.get());
  }, [low, high, min, max, width, lowX, highX]);

  const toValue = (x: number) => {
    'worklet';
    if (width.get() === 0) return min;
    const raw = min + (x / width.get()) * (max - min);
    return Math.min(max, Math.max(min, Math.round(raw / step) * step));
  };

  const toX = (value: number) => {
    'worklet';
    return ((value - min) / (max - min)) * width.get();
  };

  const commit = (range: Range) => {
    setDragRange(null);
    onChange(range.low, range.high);
  };

  const makeGesture = (thumb: 'low' | 'high') =>
    Gesture.Pan()
      .activeOffsetX([-4, 4])
      .failOffsetY([-12, 12])
      .hitSlop(12)
      .onStart(() => {
        startX.set(thumb === 'low' ? lowX.get() : highX.get());
      })
      .onUpdate((event) => {
        const x = startX.get() + event.translationX;
        if (thumb === 'low') {
          lowX.set(Math.min(Math.max(x, 0), highX.get()));
        } else {
          highX.set(Math.max(Math.min(x, width.get()), lowX.get()));
        }
        scheduleOnRN(setDragRange, { low: toValue(lowX.get()), high: toValue(highX.get()) });
      })
      .onEnd(() => {
        const range = { low: toValue(lowX.get()), high: toValue(highX.get()) };
        // Snap the thumbs onto the step they represent.
        lowX.set(toX(range.low));
        highX.set(toX(range.high));
        scheduleOnRN(commit, range);
      });

  const lowThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lowX.get() }],
    // When both thumbs sit at the right end, the low one must be on top to be draggable.
    zIndex: lowX.get() > width.get() / 2 ? 2 : 1,
  }));
  const highThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: highX.get() }],
  }));
  const rangeStyle = useAnimatedStyle(() => ({
    left: lowX.get() + THUMB_SIZE / 2,
    width: highX.get() - lowX.get(),
  }));

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.labels}>
        <ThemedText type="small">{formatLabel(labels.low)}</ThemedText>
        <ThemedText type="small">{formatLabel(labels.high)}</ThemedText>
      </View>

      <View
        style={styles.container}
        onLayout={(event) => {
          // Writes from the JS thread reach the UI thread asynchronously, so reading `width`
          // back here would still give the old value. Use the measured width directly.
          const trackWidth = event.nativeEvent.layout.width - THUMB_SIZE;
          width.set(trackWidth);
          lowX.set(((low - min) / (max - min)) * trackWidth);
          highX.set(((high - min) / (max - min)) * trackWidth);
        }}>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]} />
        <Animated.View style={[styles.range, { backgroundColor: theme.accent }, rangeStyle]} />

        <GestureDetector gesture={makeGesture('low')}>
          <Animated.View style={[styles.thumb, lowThumbStyle]} />
        </GestureDetector>
        <GestureDetector gesture={makeGesture('high')}>
          <Animated.View style={[styles.thumb, highThumbStyle]} />
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: THUMB_SIZE / 2,
    right: THUMB_SIZE / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  range: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
