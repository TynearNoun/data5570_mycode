import { Link } from "expo-router";
import { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";

import { Banner, Button, Field } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { register } from "@/state/slices/authSlice";

export default function SignupScreen() {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.auth.saving);
  const error = useAppSelector((state) => state.auth.error);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 880;

  function submit() {
    if (!displayName.trim() || !username.trim() || !email.trim() || password.length < 8) {
      setLocalError("Name, username, email, and a password of at least 8 characters.");
      return;
    }
    setLocalError(null);
    void dispatch(
      register({
        display_name: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      }),
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: "center", padding: wide ? 48 : 20 }}>
      <View style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 14 }}>
        <Text style={{ fontFamily: font.semibold, color: theme.clay, letterSpacing: 1.2 }}>DAILY CHALLENGE</Text>
        <Text style={{ fontFamily: font.display, fontSize: 40, color: theme.ink }}>Make an account</Text>
        <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 16 }}>
          You’ll start with no circle. Create one, or join Weeknight Crew with the code WEEKNIGHT.
        </Text>
        {localError ? <Banner message={localError} /> : null}
        {error ? <Banner message={error} /> : null}
        <Field label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Mara Chen" />
        <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button label="Create account" onPress={submit} loading={saving} />
        <Link href="/login" style={{ fontFamily: font.semibold, color: theme.clay }}>
          I already have an account
        </Link>
      </View>
    </View>
  );
}
