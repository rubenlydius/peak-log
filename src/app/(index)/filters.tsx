import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { peaks } from '@/data/peaks';
import { RangeSlider } from '@/components/range-slider';
import {
  ClimbedFilter,
  HEIGHT_MAX,
  HEIGHT_MIN,
  HEIGHT_STEP,
  usePeakFiltersStore,
} from '@/hooks/use-peak-filters';
import { useTheme } from '@/hooks/use-theme';

import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

const COUNTRIES = Array.from(new Set(peaks.flatMap((peak) => peak.countries))).sort((a, b) =>
  a.localeCompare(b),
);

// Sentinel list item for the "All" row; no country has this name.
const ALL_COUNTRIES = '__all__';

const CLIMBED_OPTIONS: { label: string; value: ClimbedFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Climbed', value: 'climbed' },
  { label: 'Unclimbed', value: 'unclimbed' },
];

const SegmentedControl = () => {
  const climbed = usePeakFiltersStore((state) => state.climbed);
  const setClimbed = usePeakFiltersStore((state) => state.setClimbed);

  return (
    <ThemedView type="backgroundElement" style={styles.segmentedControl}>
      {CLIMBED_OPTIONS.map((option) => {
        const selected = climbed === option.value;
        return (
          <Pressable key={option.value} onPress={() => setClimbed(option.value)} style={{ flex: 1 }}>
            <ThemedView
              type={selected ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.segment}>
              <ThemedText
                type="smallBold"
                themeColor={selected ? 'text' : 'textSecondary'}
                style={{ textAlign: 'center' }}>
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </ThemedView>
  );
};

const HeightSlider = () => {
  const minMeters = usePeakFiltersStore((state) => state.minMeters);
  const maxMeters = usePeakFiltersStore((state) => state.maxMeters);
  const setHeightRange = usePeakFiltersStore((state) => state.setHeightRange);

  return (
    <RangeSlider
      min={HEIGHT_MIN}
      max={HEIGHT_MAX}
      step={HEIGHT_STEP}
      low={minMeters}
      high={maxMeters}
      onChange={setHeightRange}
      formatLabel={(value) => `${value.toLocaleString('en-US')} m`}
    />
  );
};

const CountryRow = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <ThemedView style={styles.countryRow}>
        <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>{label}</ThemedText>
        {selected && (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            tintColor={theme.text}
            size={18}
          />
        )}
      </ThemedView>
    </Pressable>
  );
};

export default function FiltersScreen() {
  const theme = useTheme();
  const countries = usePeakFiltersStore((state) => state.countries);
  const toggleCountry = usePeakFiltersStore((state) => state.toggleCountry);
  const clearCountries = usePeakFiltersStore((state) => state.clearCountries);
  const reset = usePeakFiltersStore((state) => state.reset);
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(
    // "All" stays at the top, also while searching.
    () => [ALL_COUNTRIES, ...COUNTRIES.filter((name) => name.toLowerCase().includes(search.toLowerCase()))],
    [search],
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Filters',
          presentation: 'modal',
          headerRight: () => (
            <Pressable onPress={reset}>
              <ThemedText type="link">Reset</ThemedText>
            </Pressable>
          ),
        }}
      />

      <FlashList
        data={filteredCountries}
        keyExtractor={(item) => item}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <ThemedView style={{ gap: Spacing.four, padding: Spacing.three, paddingBottom: Spacing.two }}>
            <ThemedView style={{ gap: Spacing.two }}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Climbed status
              </ThemedText>
              <SegmentedControl />
            </ThemedView>

            <ThemedView style={{ gap: Spacing.two }}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Height (meters)
              </ThemedText>
              <HeightSlider />
            </ThemedView>

            <ThemedView style={{ gap: Spacing.two }}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Countries{countries.length ? ` (${countries.length} selected)` : ''}
              </ThemedText>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search countries"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
            </ThemedView>
          </ThemedView>
        }
        renderItem={({ item }) =>
          item === ALL_COUNTRIES ? (
            <CountryRow label="All" selected={countries.length === 0} onPress={clearCountries} />
          ) : (
            <CountryRow
              label={item}
              selected={countries.includes(item)}
              onPress={() => toggleCountry(item)}
            />
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: 'row',
    gap: Spacing.half,
    padding: Spacing.half,
    borderRadius: Spacing.two,
  },
  segment: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - Spacing.half,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flex: 1,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
