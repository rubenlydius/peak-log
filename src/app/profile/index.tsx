import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { formatMeters, Peak, peaks } from '@/data/peaks';
import { useClimbedPeakIds, useLogbookStore } from '@/hooks/use-logbook-store';
import { useTheme } from '@/hooks/use-theme';

import { Link, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTINENTS = Array.from(new Set(peaks.map((peak) => peak.continent))).sort((a, b) =>
  a.localeCompare(b),
);

const PEAKS_PER_CONTINENT = new Map(
  CONTINENTS.map((continent) => [continent, peaks.filter((peak) => peak.continent === continent).length]),
);

// The highest peak of each continent, which in this dataset is the Seven Summits.
const CONTINENT_HIGH_POINTS = CONTINENTS.map((continent) =>
  peaks
    .filter((peak) => peak.continent === continent && peak.meters !== null)
    .reduce((highest, peak) => (peak.meters! > highest.meters! ? peak : highest)),
).sort((a, b) => b.meters! - a.meters!);

const StatTile = ({ label, value, detail }: { label: string; value: string; detail?: string }) => (
  <ThemedView type="backgroundElement" style={styles.tile}>
    <ThemedText type="small" themeColor="textSecondary">
      {label}
    </ThemedText>
    <ThemedText type="subtitle" numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </ThemedText>
    {!!detail && (
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {detail}
      </ThemedText>
    )}
  </ThemedView>
);

const ProgressRow = ({ label, count, total }: { label: string; count: number; total: number }) => {
  const theme = useTheme();

  return (
    <ThemedView style={{ gap: Spacing.one }}>
      <ThemedView style={styles.rowBetween}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {count} / {total}
        </ThemedText>
      </ThemedView>
      <ThemedView type="backgroundSelected" style={styles.bar}>
        <ThemedView
          style={[
            styles.barFill,
            // Keep a sliver visible once something is climbed, even when the share rounds to ~0%.
            { width: `${count ? Math.max((count / total) * 100, 2) : 0}%`, backgroundColor: theme.accent },
          ]}
        />
      </ThemedView>
    </ThemedView>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <ThemedView style={{ gap: Spacing.two }}>
    <ThemedText type="smallBold" themeColor="textSecondary">
      {title}
    </ThemedText>
    {children}
  </ThemedView>
);

const CheckRow = ({ peak, climbed, subtitle }: { peak: Peak; climbed: boolean; subtitle: string }) => {
  const theme = useTheme();

  return (
    <Link href={`/profile/${peak.id}`} asChild>
      <Pressable>
        {/* The layout lives on this inner view: Link's asChild doesn't pass a style function through. */}
        <ThemedView style={styles.rowBetween}>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 }}>
            <SymbolView
              name={
                climbed
                  ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                  : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
              }
              tintColor={climbed ? theme.accent : theme.textSecondary}
              size={18}
            />
            <ThemedView style={{ flex: 1 }}>
              <ThemedText type="small">{peak.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            {formatMeters(peak)}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const climbedSet = useClimbedPeakIds();
  const ascentCount = useLogbookStore((state) => state.ascents.length);

  const stats = useMemo(() => {
    // `peaks` is sorted by height, so this list is too.
    const climbed = peaks.filter((peak) => climbedSet.has(peak.id));

    return {
      climbedSet,
      climbed,
      highest: climbed.find((peak) => peak.meters !== null),
      totalMeters: climbed.reduce((sum, peak) => sum + (peak.meters ?? 0), 0),
      countries: new Set(climbed.flatMap((peak) => peak.countries)).size,
      perContinent: CONTINENTS.map((continent) => ({
        continent,
        count: climbed.filter((peak) => peak.continent === continent).length,
        total: PEAKS_PER_CONTINENT.get(continent)!,
      })),
    };
  }, [climbedSet]);

  const summitCount = CONTINENT_HIGH_POINTS.filter((peak) => stats.climbedSet.has(peak.id)).length;

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Profile' }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
        ]}>
        {stats.climbed.length === 0 && (
          <ThemedView type="backgroundElement" style={styles.tile}>
            <ThemedText type="smallBold">No peaks climbed yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Open a mountain and tap &quot;Log a climb&quot; to start your logbook.
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.tiles}>
          <StatTile
            label="Peaks climbed"
            value={stats.climbed.length.toLocaleString('en-US')}
            detail={`${ascentCount.toLocaleString('en-US')} climb${ascentCount === 1 ? '' : 's'} logged`}
          />
          <StatTile
            label="Highest peak"
            value={stats.highest ? formatMeters(stats.highest) : '–'}
            detail={stats.highest?.name}
          />
          <StatTile
            label="Total elevation"
            value={`${stats.totalMeters.toLocaleString('en-US')} m`}
            detail="summit heights added up"
          />
          <StatTile
            label="Countries"
            value={String(stats.countries)}
            detail={`${stats.perContinent.filter((row) => row.count > 0).length} of ${CONTINENTS.length} continents`}
          />
        </ThemedView>

        <Section title={`Seven Summits · ${summitCount} / ${CONTINENT_HIGH_POINTS.length}`}>
          {CONTINENT_HIGH_POINTS.map((peak) => (
            <CheckRow
              key={peak.id}
              peak={peak}
              climbed={stats.climbedSet.has(peak.id)}
              subtitle={peak.continent}
            />
          ))}
        </Section>

        <Section title="By continent">
          {stats.perContinent.map((row) => (
            <ProgressRow key={row.continent} label={row.continent} count={row.count} total={row.total} />
          ))}
        </Section>

        {stats.climbed.length > 0 && (
          <Section title="Climbed peaks">
            {stats.climbed.map((peak) => (
              <CheckRow
                key={peak.id}
                peak={peak}
                climbed
                subtitle={peak.countries.join(', ') || peak.continent}
              />
            ))}
          </Section>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
