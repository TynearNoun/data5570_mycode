import { Link } from "expo-router";
import { Text, View } from "react-native";

import { font, theme } from "@/constants/theme";

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text style={{ fontFamily: font.display, fontSize: 40, color: theme.ink }}>That page is gone.</Text>
      <Link href="/today" style={{ fontFamily: font.semibold, color: theme.clay, fontSize: 16 }}>
        Back to today
      </Link>
    </View>
  );
}
