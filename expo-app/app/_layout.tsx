import { Stack } from 'expo-router';
import { Provider } from 'react-redux';

import { store } from '@/state/store';

export default function Layout() {
  return (
    <Provider store={store}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1f3d2b' },
          headerTintColor: '#f6f1e6',
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#f3efe4' },
        }}
      />
    </Provider>
  );
}
