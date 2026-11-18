import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { AppShell } from "@/components/AppShell";
import { font, theme } from "@/constants/theme";
import { useAppSelector } from "@/state/hooks";

export default function AppLayout() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === "idle" || status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg, gap: 10 }}>
        <ActivityIndicator color={theme.clay} />
        <Text style={{ fontFamily: font.body, color: theme.muted }}>Opening Daily Challenge</Text>
      </View>
    );
  }
  if (status !== "authenticated") return <Redirect href="/login" />;
  return (
    <AppShell>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
    </AppShell>
  );
}
