import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlotEntry } from '@/state/plotsReducer';

type PlotCardProps = {
  entry: PlotEntry;
  onToggleFlag: (id: string) => void;
  onRemove: (id: string) => void;
};

export function PlotCard({ entry, onToggleFlag, onRemove }: PlotCardProps) {
  const flagLabel = entry.flagged ? 'Clear flag' : 'Flag for review';

  return (
    <View style={[styles.card, entry.flagged && styles.cardFlagged]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.species}>{entry.species}</Text>
          <Text style={styles.site}>{entry.site}</Text>
        </View>
        <View style={styles.countBlock}>
          <Text style={styles.count}>{entry.count}</Text>
          <Text style={styles.countLabel}>{entry.count === 1 ? 'individual' : 'individuals'}</Text>
        </View>
      </View>
      <Text style={styles.note}>{entry.note || 'No field note.'}</Text>
      {entry.flagged ? <Text style={styles.flagBadge}>Flagged for a second look</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onToggleFlag(entry.id)}
          style={[styles.action, entry.flagged ? styles.actionMuted : styles.actionFlag]}>
          <Text style={[styles.actionText, entry.flagged && styles.actionTextMuted]}>
            {flagLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onRemove(entry.id)}
          style={[styles.action, styles.actionRemove]}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffdf8',
    borderColor: '#e2d8c4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardFlagged: {
    borderColor: '#e0c08a',
    backgroundColor: '#fff8ec',
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  species: {
    color: '#1c1915',
    fontSize: 18,
    fontWeight: '700',
  },
  site: {
    color: '#5c564c',
    fontSize: 14,
  },
  countBlock: {
    alignItems: 'flex-end',
    minWidth: 84,
  },
  count: {
    color: '#1f3d2b',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  countLabel: {
    color: '#5c564c',
    fontSize: 12,
  },
  note: {
    color: '#1c1915',
    fontSize: 15,
    lineHeight: 22,
  },
  flagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3e2c4',
    borderRadius: 999,
    color: '#7a4b08',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionFlag: {
    backgroundColor: '#1f3d2b',
  },
  actionMuted: {
    backgroundColor: '#efe8d8',
  },
  actionRemove: {
    backgroundColor: '#f8ece8',
  },
  actionText: {
    color: '#f6f1e6',
    fontSize: 14,
    fontWeight: '600',
  },
  actionTextMuted: {
    color: '#1c1915',
  },
  removeText: {
    color: '#8c3a32',
    fontSize: 14,
    fontWeight: '600',
  },
});
