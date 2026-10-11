import { Link, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { useAppDispatch } from '@/state/hooks';
import { addPlot } from '@/state/plotsReducer';

export default function LogSighting() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [site, setSite] = useState('');
  const [species, setSpecies] = useState('');
  const [countText, setCountText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    const siteValue = site.trim();
    const speciesValue = species.trim();
    const count = Number(countText);

    if (!siteValue || !speciesValue) {
      setError('Add both a site name and a species before saving.');
      return;
    }

    if (!Number.isInteger(count) || count < 1) {
      setError('Count needs to be a whole number of at least 1.');
      return;
    }

    dispatch(
      addPlot({
        site: siteValue,
        species: speciesValue,
        count,
        note: note.trim(),
      })
    );
    setError(null);
    router.replace('/');
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Log a sighting' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
        <View style={styles.intro}>
          <Text style={styles.heading}>Add a count to the board</Text>
          <Text style={styles.sentence}>
            Write down the site, what you saw, and how many. Saving adds the count to the board.
          </Text>
        </View>

        <Field label="Site" onChangeText={setSite} placeholder="Site name" value={site} />
        <Field
          label="Species"
          onChangeText={setSpecies}
          placeholder="Species name"
          value={species}
        />
        <Field
          keyboardType="number-pad"
          label="Count"
          onChangeText={setCountText}
          placeholder="How many"
          value={countText}
        />
        <Field
          label="Field note"
          multiline
          onChangeText={setNote}
          placeholder="Optional note"
          value={note}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable accessibilityRole="button" onPress={onSave} style={styles.save}>
          <Text style={styles.saveText}>Save sighting</Text>
        </Pressable>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>Back to the board</Text>
          </Pressable>
        </Link>
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
    gap: 14,
    maxWidth: 720,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  intro: {
    gap: 6,
    marginBottom: 4,
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
  errorBox: {
    backgroundColor: '#f8ece8',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#8c3a32',
    fontSize: 14,
    lineHeight: 20,
  },
  save: {
    alignItems: 'center',
    backgroundColor: '#1f3d2b',
    borderRadius: 999,
    paddingVertical: 14,
  },
  saveText: {
    color: '#f6f1e6',
    fontSize: 16,
    fontWeight: '700',
  },
  back: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: '#1f3d2b',
    fontSize: 15,
    fontWeight: '700',
  },
});
