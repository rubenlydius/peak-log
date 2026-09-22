import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMeters, Peak, peaks } from '@/data/peaks';
import { useClimbedStore } from '@/hooks/use-climbed-store';
import {
  isHeightFilterActive,
  isPeakFiltersActive,
  usePeakFiltersStore,
} from '@/hooks/use-peak-filters';
import { useTheme } from '@/hooks/use-theme';

import { FlashList } from '@shopify/flash-list';
import { Link, Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, TextInput } from 'react-native';

// Lowercase without accents, so "monch" finds "Mönch".
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const searchableNames = new Map(peaks.map((peak) => [peak.id, normalize(peak.name)]));

const PeakRow = ({ item }: { item: Peak }) => {
  const theme = useTheme();
  const climbed = useClimbedStore((state) => state.isClimbed(item.id));

  return (
    <Link href={`/(index)/${item.id}`}>
      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
        <ThemedView style={{ width: 20, alignItems: 'center' }}>
          {climbed && (
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={theme.text}
              size={18}
            />
          )}
        </ThemedView>
        <ThemedView style={{ flex: 1 }}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          <ThemedText type="small">{item.countries.join(', ') || item.continent}</ThemedText>
        </ThemedView>
        <ThemedText type="small">{formatMeters(item)}</ThemedText>
      </ThemedView>
    </Link>
  );
};

const SearchBar = ({ query, onChangeQuery }: { query: string; onChangeQuery: (query: string) => void }) => {
  const theme = useTheme();

  return (
    <ThemedView style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 }}>
      <ThemedView
        type="backgroundElement"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 12 }}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          tintColor={theme.textSecondary}
          size={16}
        />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search mountains"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{ flex: 1, paddingVertical: 8, color: theme.text }}
        />
      </ThemedView>
    </ThemedView>
  );
};

const PeakList = ({ query }: { query: string }) => {
  const climbedIds = useClimbedStore((state) => state.climbedIds);
  const filters = usePeakFiltersStore();

  const filteredPeaks = useMemo(() => {
    const heightActive = isHeightFilterActive(filters);
    const search = normalize(query);

    return peaks.filter((peak) => {
      if (search && !searchableNames.get(peak.id)!.includes(search)) return false;
      if (filters.climbed === 'climbed' && !climbedIds.includes(peak.id)) return false;
      if (filters.climbed === 'unclimbed' && climbedIds.includes(peak.id)) return false;
      if (heightActive) {
        // Peaks without a known height can't satisfy a narrowed height range.
        if (peak.meters === null) return false;
        if (peak.meters < filters.minMeters || peak.meters > filters.maxMeters) return false;
      }
      if (
        filters.countries.length > 0 &&
        !peak.countries.some((country) => filters.countries.includes(country))
      ) {
        return false;
      }
      return true;
    });
  }, [climbedIds, filters, query]);

  return (
    <FlashList
      data={filteredPeaks}
      keyExtractor={(item) => String(item.id)}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item }) => <PeakRow item={item} />}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <ThemedView style={{ padding: 16 }}>
          <ThemedText themeColor="textSecondary">
            {query ? `No mountains match "${query.trim()}".` : 'No mountains match these filters.'}
          </ThemedText>
        </ThemedView>
      }
    />
  );
};

const FiltersButton = () => {
  const theme = useTheme();
  const router = useRouter();
  const active = usePeakFiltersStore(isPeakFiltersActive);

  return (
    <Pressable onPress={() => router.push('/(index)/filters')}>
      <SymbolView
        name={{
          ios: active ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease.circle',
          android: 'filter_list',
          web: 'filter_list',
        }}
        tintColor={theme.text}
        size={22}
      />
    </Pressable>
  );
};

const SearchButton = ({ active, onPress }: { active: boolean; onPress: () => void }) => {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <SymbolView
        name={{
          ios: active ? 'xmark' : 'magnifyingglass',
          android: active ? 'close' : 'search',
          web: active ? 'close' : 'search',
        }}
        tintColor={theme.text}
        size={20}
      />
    </Pressable>
  );
};

export default function HomeScreen() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');

  const toggleSearch = () => {
    // Closing the search also clears it, so the full list comes back.
    if (searchVisible) setQuery('');
    setSearchVisible(!searchVisible);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Mountains',
          headerLeft: () => <SearchButton active={searchVisible} onPress={toggleSearch} />,
          headerRight: () => <FiltersButton />,
        }}
      />
      {searchVisible && <SearchBar query={query} onChangeQuery={setQuery} />}
      <PeakList query={query} />
    </ThemedView>
  );
}
