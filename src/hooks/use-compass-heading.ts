import { useFocusEffect } from 'expo-router';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

const UPDATE_INTERVAL_MS = 20;
// Low-pass time constants (seconds). Gravity is noisy from hand movement, so it gets more smoothing.
const ACCELEROMETER_TAU = 0.25;
const MAGNETOMETER_TAU = 0.1;
// iOS reports the acceleration of gravity pointing down, Android points up.
const UP_SIGN = Platform.OS === 'ios' ? -1 : 1;

type Vec3 = { x: number; y: number; z: number };

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

/**
 * Degrees clockwise from magnetic north (0-360) of the phone's top edge, compensated for tilt.
 * `up` is the gravity direction pointing to the sky, `field` the magnetic field, both in device axes.
 * Returns null when the two vectors are almost parallel and no horizontal direction can be derived.
 */
export function tiltCompensatedHeading(up: Vec3, field: Vec3) {
  const east = cross(field, up);
  const eastLength = length(east);
  if (eastLength < 0.1 * length(up) * length(field)) return null;

  const upLength = length(up);
  const upUnit = { x: up.x / upLength, y: up.y / upLength, z: up.z / upLength };
  const eastUnit = { x: east.x / eastLength, y: east.y / eastLength, z: east.z / eastLength };
  const north = cross(upUnit, eastUnit);

  const heading = Math.atan2(eastUnit.y, north.y) * (180 / Math.PI);
  return (heading + 360) % 360;
}

const smooth = (previous: Vec3 | null, next: Vec3, alpha: number): Vec3 =>
  previous
    ? {
        x: previous.x + alpha * (next.x - previous.x),
        y: previous.y + alpha * (next.y - previous.y),
        z: previous.z + alpha * (next.z - previous.z),
      }
    : next;

/**
 * Tilt-compensated, smoothed compass heading from the magnetometer and accelerometer,
 * running only while the screen is focused.
 *
 * - `available` is `null` until the sensor check has finished.
 * - `heading` is the rounded heading in degrees, only updating when the shown value changes.
 * - `rotation` is a shared value with the unwrapped dial rotation in degrees (-heading), for
 *   animating without re-rendering on every sensor sample.
 */
export function useCompassHeading() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [heading, setHeading] = useState(0);
  const rotation = useSharedValue(0);

  const gravity = useRef<Vec3 | null>(null);
  const field = useRef<Vec3 | null>(null);
  const lastHeading = useRef<number | null>(null);
  const lastSample = useRef({ accelerometer: 0, magnetometer: 0 });

  useEffect(() => {
    Promise.all([Magnetometer.isAvailableAsync(), Accelerometer.isAvailableAsync()]).then(
      ([magnetometer, accelerometer]) => setAvailable(magnetometer && accelerometer),
      () => setAvailable(false),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!available) return;

      gravity.current = null;
      field.current = null;
      lastHeading.current = null;
      lastSample.current = { accelerometer: 0, magnetometer: 0 };

      const alphaFor = (sensor: 'accelerometer' | 'magnetometer', tau: number) => {
        const now = Date.now();
        const dt = lastSample.current[sensor] ? (now - lastSample.current[sensor]) / 1000 : Infinity;
        lastSample.current[sensor] = now;
        return dt / (tau + dt);
      };

      const update = () => {
        if (!gravity.current || !field.current) return;
        const next = tiltCompensatedHeading(gravity.current, field.current);
        if (next === null) return;

        // Unwrap so the dial turns the short way across 359° -> 0°.
        const previous = lastHeading.current;
        const delta = previous === null ? 0 : ((next - previous + 540) % 360) - 180;
        rotation.value = previous === null ? -next : rotation.value - delta;
        lastHeading.current = next;
        setHeading((shown) => {
          const rounded = Math.round(next) % 360;
          return rounded === shown ? shown : rounded;
        });
      };

      Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
      Magnetometer.setUpdateInterval(UPDATE_INTERVAL_MS);

      const accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
        gravity.current = smooth(
          gravity.current,
          { x: x * UP_SIGN, y: y * UP_SIGN, z: z * UP_SIGN },
          alphaFor('accelerometer', ACCELEROMETER_TAU),
        );
      });
      const magnetometerSubscription = Magnetometer.addListener(({ x, y, z }) => {
        field.current = smooth(field.current, { x, y, z }, alphaFor('magnetometer', MAGNETOMETER_TAU));
        update();
      });

      return () => {
        accelerometerSubscription.remove();
        magnetometerSubscription.remove();
      };
    }, [available, rotation]),
  );

  return { available, heading, rotation };
}
