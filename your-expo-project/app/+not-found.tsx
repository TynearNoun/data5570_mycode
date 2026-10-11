import { Link, Stack } from 'expo-router';

import { StyleSheet, Text, View } from 'react-native';

import { Container } from '@/components/Container';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Container>
        <Text style={styles.title}>That page is not on the board.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to the plot board</Text>
        </Link>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3efe4',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 16,
    paddingVertical: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#1f3d2b',
    fontWeight: '700',
  },
});
