import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlotList } from '@/components/PlotList';
import { useAppDispatch, useAppSelector } from '@/state/hooks';
import { removePlot, toggleFlag, type PlotEntry } from '@/state/plotsReducer';

type BoardSummary = {
  plots: number;
  individuals: number;
  flagged: number;
  sentence: string;
};

function summarize(entries: PlotEntry[]): BoardSummary {
  const individuals = entries.reduce((sum, entry) => sum + entry.count, 0);
  const flagged = entries.filter((entry) => entry.flagged).length;

  return {
    plots: entries.length,
    individuals,
    flagged,
    sentence: `${entries.length} ${entries.length === 1 ? 'plot' : 'plots'} on the board, ${individuals} ${individuals === 1 ? 'individual' : 'individuals'} counted, ${flagged} flagged for a second look.`,
  };
}

export default function PlotBoard() {
  const entries = useAppSelector((state) => state.plots.entries);
  const dispatch = useAppDispatch();
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const summary = summarize(entries);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.title = `Plot Log · ${summary.sentence}`;
  }, [summary.sentence]);

  const visibleEntries = flaggedOnly ? entries.filter((entry) => entry.flagged) : entries;
  const emptyMessage =
    entries.length === 0
      ? 'The board is empty. Log a sighting to start a new count.'
      : 'No plots are flagged. Show every plot to keep counting.';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Plot board' }} />
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.intro}>
          <Text style={styles.kicker}>Field notebook</Text>
          <Text style={styles.heading}>What is on the plots today</Text>
          <Text style={styles.sentence}>{summary.sentence}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary.plots}</Text>
            <Text style={styles.statLabel}>Plots</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary.individuals}</Text>
            <Text style={styles.statLabel}>Individuals</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary.flagged}</Text>
            <Text style={styles.statLabel}>Flagged</Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFlaggedOnly((current) => !current)}
            style={[styles.filter, flaggedOnly && styles.filterOn]}>
            <Text style={[styles.filterText, flaggedOnly && styles.filterTextOn]}>
              {flaggedOnly ? 'Show every plot' : 'Flagged only'}
            </Text>
          </Pressable>
          <Link href="/log" asChild>
            <Pressable accessibilityRole="button" style={styles.logLink}>
              <Text style={styles.logLinkText}>Log a sighting</Text>
            </Pressable>
          </Link>
        </View>

        <PlotList
          entries={visibleEntries}
          emptyMessage={emptyMessage}
          onRemove={(id) => dispatch(removePlot(id))}
          onToggleFlag={(id) => dispatch(toggleFlag(id))}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f3efe4',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 16,
    maxWidth: 720,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  intro: {
    gap: 6,
  },
  kicker: {
    color: '#1f3d2b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heading: {
    color: '#1c1915',
    fontSize: 28,
    fontWeight: '700',
  },
  sentence: {
    color: '#5c564c',
    fontSize: 15,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    backgroundColor: '#fffdf8',
    borderColor: '#e2d8c4',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statValue: {
    color: '#1c1915',
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: '#5c564c',
    fontSize: 12,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filter: {
    backgroundColor: '#efe8d8',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterOn: {
    backgroundColor: '#1f3d2b',
  },
  filterText: {
    color: '#1c1915',
    fontSize: 14,
    fontWeight: '700',
  },
  filterTextOn: {
    color: '#f6f1e6',
  },
  logLink: {
    backgroundColor: '#c4652d',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logLinkText: {
    color: '#fffaf3',
    fontSize: 14,
    fontWeight: '700',
  },
});
