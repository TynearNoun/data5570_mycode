import { useEffect, useState } from "react";
import { Text } from "react-native";

import { Banner, Button, Card, Field, Kicker, ScreenScroll } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import { API_BASE, API_HOST_LABEL } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { logout, updateProfile } from "@/state/slices/authSlice";

export default function AccountScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const saving = useAppSelector((state) => state.auth.saving);
  const error = useAppSelector((state) => state.auth.error);
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
    setBio(user?.bio ?? "");
  }, [user?.display_name, user?.bio]);

  return (
    <ScreenScroll>
      <Kicker>YOU</Kicker>
      <Text style={{ fontFamily: font.display, fontSize: 42, color: theme.ink }}>{user?.display_name}</Text>
      <Text style={{ fontFamily: font.body, color: theme.muted }}>
        {user?.username} · {user?.email}
      </Text>
      {error ? <Banner message={error} /> : null}
      <Card>
        <Field label="Name" value={displayName} onChangeText={setDisplayName} />
        <Field label="Bio" value={bio} onChangeText={setBio} multiline placeholder="How your circle knows you." />
        <Button
          label="Save profile"
          loading={saving}
          onPress={() => {
            if (!displayName.trim()) return;
            void dispatch(updateProfile({ display_name: displayName.trim(), bio: bio.trim() }));
          }}
        />
      </Card>
      <Card>
        <Text style={{ fontFamily: font.semibold, color: theme.ink }}>Server</Text>
        <Text style={{ fontFamily: font.body, color: theme.muted, lineHeight: 21 }}>
          This session is talking to {API_HOST_LABEL}. The class host is the EC2 instance 13.56.184.13, key pair
          data5570finalproject. The key stays in your Downloads folder and is not part of this repo.
        </Text>
        <Text style={{ fontFamily: font.medium, color: theme.ink }}>{API_BASE}</Text>
      </Card>
      <Button label="Sign out" tone="ghost" onPress={() => void dispatch(logout())} />
    </ScreenScroll>
  );
}
