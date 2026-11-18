import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { font, theme } from "@/constants/theme";
import { useAppSelector } from "@/state/hooks";

export default function Index() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === "authenticated") return <Redirect href="/today" />;
  if (status === "unauthenticated") return <Redirect href="/login" />;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.clay} />
      <Text style={{ fontFamily: font.display, fontSize: 36, color: theme.ink }}>Rally</Text>
      <Text style={{ fontFamily: font.body, color: theme.muted }}>Checking your session</Text>
    </View>
  );
}
