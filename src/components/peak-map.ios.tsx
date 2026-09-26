import { ThemedView } from '@/components/themed-view';
import { BrandAccent, Spacing } from '@/constants/theme';
import { formatMeters, Peak, peaks as allPeaks } from '@/data/peaks';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useClimbedPeakIds } from '@/hooks/use-logbook-store';
import { useMountainsViewStore } from '@/hooks/use-mountains-view-store';
import { useTheme } from '@/hooks/use-theme';

import { Button, Host, HStack, Image, Popover, Rectangle, Text, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, font, foregroundStyle, frame, opacity, padding } from '@expo/ui/swift-ui/modifiers';
import { useIsFocused, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, type MapMarkerProps, type Point } from 'react-native-maps';

type MappablePeak = Peak & { latitude: number; longitude: number };

// Peaks without coordinates can't be placed on the map.
const withCoordinates = (peaks: Peak[]) =>
  peaks.filter((peak): peak is MappablePeak => peak.latitude !== null && peak.longitude !== null);

const INITIAL_REGION = {
  latitude: 30,
  longitude: 30,
  latitudeDelta: 100,
  longitudeDelta: 100,
};

// How far the map zooms in on a peak opened with "View on map", in degrees.
const FOCUSED_DELTA = 0.5;
// The button below zooms in less far, since what's around you matters more than the exact spot.
const MY_LOCATION_DELTA = 0.2;

const focusedRegion = (peak: MappablePeak) => ({
  latitude: peak.latitude,
  longitude: peak.longitude,
  latitudeDelta: FOCUSED_DELTA,
  longitudeDelta: FOCUSED_DELTA,
});

// The brand blue reads as "climbed"; the rest are a neutral slate so the map stays calm.
const CLIMBED_TINT = BrandAccent;
const UNCLIMBED_TINT = '#55606B';

// A selected marker balloon is roughly this tall, so the popover arrow points at its top.
const MARKER_HEIGHT = 56;

// Apple Maps hides pins that overlap, keeping the ones with the highest priority. Taller peaks and
// the ones you climbed stay visible, so zooming out shows the famous summits instead of whichever
// pin happens to be drawn first.
const HIGH_PRIORITY_METERS = 6000;
const REQUIRED_PRIORITY_METERS = 8000;

const displayPriority = (
  peak: MappablePeak,
  climbed: boolean,
): MapMarkerProps['displayPriority'] => {
  if (climbed || (peak.meters ?? 0) >= REQUIRED_PRIORITY_METERS) return 'required';
  return (peak.meters ?? 0) >= HIGH_PRIORITY_METERS ? 'high' : 'low';
};

export const PeakMap = ({ peaks }: { peaks: Peak[] }) => {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const climbedSet = useClimbedPeakIds();
  const { status: locationStatus, coordinates } = useDeviceLocation();
  const [selected, setSelected] = useState<{ peak: MappablePeak; point: Point } | null>(null);

  const focus = useMountainsViewStore((state) => state.focus);
  const focusedPeak = useMemo(
    () => (focus ? withCoordinates(allPeaks).find((peak) => peak.id === focus.peakId) : undefined),
    [focus],
  );

  // When the map opens for a focused peak, it starts there instead of animating from the world view.
  const [initialRegion] = useState(() => (focusedPeak ? focusedRegion(focusedPeak) : INITIAL_REGION));

  const showPopover = useCallback(async (peak: MappablePeak) => {
    try {
      const point = await mapRef.current?.pointForCoordinate({
        latitude: peak.latitude,
        longitude: peak.longitude,
      });
      if (point) setSelected({ peak, point });
    } catch {
      // The map can't place the peak yet; without a point there is nothing to anchor a popover to.
    }
  }, []);

  // Presenting the popover while the app is still switching to this screen interrupts that
  // transition, so it waits until the map is actually in front.
  const isFocused = useIsFocused();

  // A peak the map is still moving to; its popover opens once the map has arrived and is in front.
  const pendingFocus = useRef<MappablePeak | null>(null);
  // Asking the map where a peak sits on screen only works once it has loaded.
  const [isMapReady, setIsMapReady] = useState(false);

  const openPendingFocus = useCallback(() => {
    const peak = pendingFocus.current;
    if (!peak || !isFocused || !isMapReady) return;
    pendingFocus.current = null;
    showPopover(peak);
  }, [isFocused, isMapReady, showPopover]);

  useEffect(() => {
    if (!focusedPeak) return;
    pendingFocus.current = focusedPeak;
    mapRef.current?.animateToRegion(focusedRegion(focusedPeak));
    openPendingFocus();
  }, [focusedPeak, openPendingFocus]);

  useEffect(openPendingFocus, [openPendingFocus]);

  const mappablePeaks = useMemo(() => {
    const filtered = withCoordinates(peaks);
    // Keep the focused peak visible, even when the current filters or search hide it.
    return focusedPeak && !filtered.includes(focusedPeak) ? [...filtered, focusedPeak] : filtered;
  }, [peaks, focusedPeak]);
  const peaksById = useMemo(() => new Map(mappablePeaks.map((peak) => [peak.id, peak])), [mappablePeaks]);

  // Kept separate from the popover state, so opening it doesn't re-render thousands of markers.
  const markers = useMemo(
    () =>
      mappablePeaks.map((peak) => {
        const climbed = climbedSet.has(peak.id);
        return (
          <Marker
            key={peak.id}
            identifier={peak.id}
            coordinate={{ latitude: peak.latitude, longitude: peak.longitude }}
            pinColor={climbed ? CLIMBED_TINT : UNCLIMBED_TINT}
            displayPriority={displayPriority(peak, climbed)}
          />
        );
      }),
    [mappablePeaks, climbedSet],
  );

  const openDetail = (peak: Peak) => {
    setSelected(null);
    router.push(`/(index)/${peak.id}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsCompass
        showsScale
        showsUserLocation={locationStatus === 'granted'}
        onMapReady={() => setIsMapReady(true)}
        onRegionChangeComplete={openPendingFocus}
        onMarkerPress={(event) => {
          const peak = peaksById.get(event.nativeEvent.id);
          if (peak) showPopover(peak);
        }}>
        {markers}
      </MapView>

      {!!coordinates && (
        <Pressable
          onPress={() =>
            mapRef.current?.animateToRegion({
              ...coordinates,
              latitudeDelta: MY_LOCATION_DELTA,
              longitudeDelta: MY_LOCATION_DELTA,
            })
          }
          style={[styles.myLocation, { bottom: insets.bottom + Spacing.three }]}>
          <ThemedView type="backgroundElement" style={styles.myLocationButton}>
            <SymbolView
              name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
              tintColor={theme.text}
              size={18}
            />
          </ThemedView>
        </Pressable>
      )}

      {/* Invisible anchor at the top of the tapped marker that the popover points to. */}
      {selected && (
        <Host
          matchContents
          style={[styles.anchor, { left: selected.point.x, top: selected.point.y - MARKER_HEIGHT }]}>
          <Popover
            isPresented
            onIsPresentedChange={(isPresented) => {
              if (!isPresented) setSelected(null);
            }}
            attachmentAnchor="top"
            arrowEdge="bottom">
            <Popover.Trigger>
              <Rectangle modifiers={[frame({ width: 1, height: 1 }), opacity(0)]} />
            </Popover.Trigger>
            <Popover.Content>
              <Button onPress={() => openDetail(selected.peak)} modifiers={[buttonStyle('plain')]}>
                <HStack spacing={12} modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
                  <VStack alignment="leading" spacing={2}>
                    <Text modifiers={[font({ textStyle: 'headline' })]}>{selected.peak.name}</Text>
                    <Text
                      modifiers={[
                        font({ textStyle: 'subheadline' }),
                        foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                      ]}>
                      {formatMeters(selected.peak)}
                    </Text>
                  </VStack>
                  <Image
                    systemName="chevron.right"
                    size={14}
                    modifiers={[foregroundStyle({ type: 'hierarchical', style: 'tertiary' })]}
                  />
                </HStack>
              </Button>
            </Popover.Content>
          </Popover>
        </Host>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  myLocation: {
    position: 'absolute',
    right: Spacing.three,
  },
  myLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  anchor: {
    position: 'absolute',
  },
});
