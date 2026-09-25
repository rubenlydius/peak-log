import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Coordinates } from '@/utils/geo';

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

/**
 * The device's position, updated while the screen is focused.
 *
 * - `status` is `pending` until the permission prompt has been answered.
 * - `coordinates` is null until the first fix comes in.
 */
export function useDeviceLocation() {
  const [status, setStatus] = useState<LocationStatus>('pending');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  useFocusEffect(
    useCallback(() => {
      let subscription: Location.LocationSubscription | undefined;
      // The screen can lose focus while the permission prompt is still open.
      let cancelled = false;

      const start = async () => {
        try {
          const { status: permission } = await Location.requestForegroundPermissionsAsync();
          if (cancelled) return;
          if (permission !== 'granted') {
            setStatus('denied');
            return;
          }
          setStatus('granted');

          subscription = await Location.watchPositionAsync(
            // Peaks are kilometers away, so a rough fix is plenty and saves battery.
            { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 50 },
            ({ coords }) => setCoordinates({ latitude: coords.latitude, longitude: coords.longitude }),
          );
          if (cancelled) subscription.remove();
        } catch {
          if (!cancelled) setStatus('unavailable');
        }
      };

      start();

      return () => {
        cancelled = true;
        subscription?.remove();
      };
    }, []),
  );

  return { status, coordinates };
}
