import { StyleSheet, Text, View } from 'react-native';

import type { PlotEntry } from '@/state/plotsReducer';

import { PlotCard } from './PlotCard';

type PlotListProps = {
  entries: PlotEntry[];
  emptyMessage: string;
  pendingIds: number[];
  onToggleFlag: (id: number) => void;
  onRemove: (id: number) => void;
};

export function PlotList({
  entries,
  emptyMessage,
  pendingIds,
  onToggleFlag,
  onRemove,
}: PlotListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {entries.map((entry) => (
        <PlotCard
          key={entry.id}
          entry={entry}
          pending={pendingIds.includes(entry.id)}
          onToggleFlag={onToggleFlag}
          onRemove={onRemove}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  empty: {
    backgroundColor: '#fffdf8',
    borderColor: '#e2d8c4',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  emptyText: {
    color: '#5c564c',
    fontSize: 15,
    lineHeight: 22,
  },
});
