import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from "@expo-google-fonts/outfit";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { font, theme } from "@/constants/theme";
import { bootstrap } from "@/state/bootstrap";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { store } from "@/state/store";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Session>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
        </Session>
      </SafeAreaProvider>
    </Provider>
  );
}

function Session({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const started = useRef(false);
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void dispatch(bootstrap());
  }, [dispatch]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {children}
      {status === "idle" ? (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 24, left: 20 }}
        >
          <Text style={{ fontFamily: font.body, color: theme.muted }}>Opening Daily Challenge</Text>
        </View>
      ) : null}
    </View>
  );
}
