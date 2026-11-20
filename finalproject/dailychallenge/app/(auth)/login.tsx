import { Link } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Banner, Button, Card, Field } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import { API_HOST_LABEL } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { login } from "@/state/slices/authSlice";

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.auth.saving);
  const error = useAppSelector((state) => state.auth.error);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 880;

  function submit(nextUser = username, nextPassword = password) {
    if (!nextUser.trim() || !nextPassword) return;
    void dispatch(login({ username: nextUser.trim(), password: nextPassword }));
  }

  const form = (
    <View style={{ width: "100%", maxWidth: 440, alignSelf: "center", gap: 14 }}>
      <Text style={{ fontFamily: font.display, fontSize: wide ? 36 : 32, color: theme.ink }}>Sign in</Text>
      <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 16, lineHeight: 22 }}>
        Use the seeded circle, or an account you already made.
      </Text>
      {error ? <Banner message={error} /> : null}
      <Field label="Username or email" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button label="Sign in" onPress={() => submit()} loading={saving} />
      <Card tone="gold">
        <Text style={{ fontFamily: font.semibold, color: theme.ink }}>Weeknight Crew is already on the server.</Text>
        <Text style={{ fontFamily: font.body, color: theme.ink, lineHeight: 21 }}>
          Mara has not sent today’s proof. Ellis has.
        </Text>
        <Text style={{ fontFamily: font.semibold, color: theme.ink }}>Password Rally-demo-19</Text>
        <Button
          label="Sign in as Mara"
          tone="pine"
          onPress={() => {
            setUsername("mara");
            setPassword("Rally-demo-19");
            submit("mara", "Rally-demo-19");
          }}
        />
      </Card>
      <Link href="/signup" style={{ fontFamily: font.semibold, color: theme.clay, fontSize: 15 }}>
        Create an account
      </Link>
      {wide ? null : (
        <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 13 }}>API {API_HOST_LABEL}</Text>
      )}
    </View>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: theme.bg }}>
        <View
          style={{
            flex: 1.05,
            backgroundColor: theme.pine,
            padding: 40,
            paddingTop: 48,
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <Text style={{ fontFamily: font.semibold, color: theme.mist, letterSpacing: 1.2 }}>DAILY CHALLENGE</Text>
          <View style={{ gap: 12, maxWidth: 460 }}>
            <Text style={{ fontFamily: font.display, fontSize: 58, color: theme.cream, lineHeight: 62 }}>
              A small challenge, every day.
            </Text>
            <Text style={{ fontFamily: font.body, color: theme.mist, fontSize: 18, lineHeight: 26 }}>
              Make a circle, take the daily challenge, and leave proof the others can see.
            </Text>
          </View>
          <Text style={{ fontFamily: font.body, color: theme.mist }}>API {API_HOST_LABEL}</Text>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {form}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          backgroundColor: theme.pine,
          paddingHorizontal: 20,
          paddingTop: insets.top + 18,
          paddingBottom: 22,
          gap: 10,
        }}
      >
        <Text style={{ fontFamily: font.semibold, color: theme.mist, letterSpacing: 1.2, fontSize: 12 }}>
          DAILY CHALLENGE
        </Text>
        <Text style={{ fontFamily: font.display, fontSize: 32, color: theme.cream, lineHeight: 36 }}>
          A small challenge, every day.
        </Text>
        <Text style={{ fontFamily: font.body, color: theme.mist, fontSize: 16, lineHeight: 22 }}>
          Make a circle, take the daily challenge, and leave proof the others can see.
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>{form}</View>
    </ScrollView>
  );
}
