import { PeakMap } from '@/components/peak-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatMeters, Peak } from '@/data/peaks';
import { useClimbedPeakIds } from '@/hooks/use-logbook-store';
import { useMountainsViewStore, ViewMode } from '@/hooks/use-mountains-view-store';
import { isPeakFiltersActive, useFilteredPeaks, usePeakFiltersStore } from '@/hooks/use-peak-filters';
import { useTheme } from '@/hooks/use-theme';

import { FlashList } from '@shopify/flash-list';
import { Link, Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Leaves room below the last row, so the view mode button doesn't cover it.
const VIEW_MODE_BUTTON_SPACE = 64;

const PeakRow = ({ item }: { item: Peak }) => {
  const theme = useTheme();
  const climbed = useClimbedPeakIds().has(item.id);

  return (
    <Link href={`/(index)/${item.id}`}>
      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
        <ThemedView style={{ flex: 1 }}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          <ThemedText type="small">{item.countries.join(', ') || item.continent}</ThemedText>
        </ThemedView>
        <ThemedView style={{ width: 20, alignItems: 'center', paddingRight: 8 }}>
          {climbed && (
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={theme.text}
              size={18}
            />
          )}
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
          autoCapitalize="none"
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

const PeakList = ({ peaks, query }: { peaks: Peak[]; query: string }) => {
  return (
    <FlashList
      data={peaks}
      keyExtractor={(item) => String(item.id)}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item }) => <PeakRow item={item} />}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={<ThemedView style={{ height: VIEW_MODE_BUTTON_SPACE }} />}
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

const ViewModeButton = ({ mode, onPress }: { mode: ViewMode; onPress: () => void }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The button shows the view it switches to.
  const showsMap = mode === 'list';

  return (
    <ThemedView
      pointerEvents="box-none"
      style={[styles.viewModeContainer, { bottom: insets.bottom + Spacing.three }]}>
      <Pressable onPress={onPress}>
        <ThemedView type="backgroundElement" style={styles.viewModeButton}>
          <SymbolView
            name={{
              ios: showsMap ? 'map' : 'list.bullet',
              android: showsMap ? 'map' : 'list',
              web: showsMap ? 'map' : 'list',
            }}
            tintColor={theme.text}
            size={18}
          />
          <ThemedText type="smallBold">{showsMap ? 'Map' : 'List'}</ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
};

export default function HomeScreen() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const viewMode = useMountainsViewStore((state) => state.viewMode);
  const setViewMode = useMountainsViewStore((state) => state.setViewMode);
  const filteredPeaks = useFilteredPeaks(query);

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
      {viewMode === 'list' ? (
        <PeakList peaks={filteredPeaks} query={query} />
      ) : (
        <PeakMap peaks={filteredPeaks} />
      )}
      <ViewModeButton
        mode={viewMode}
        onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  viewModeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
});
