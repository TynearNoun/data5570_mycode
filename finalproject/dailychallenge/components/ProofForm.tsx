import { useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Banner, Button, Card, Field, Kicker } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import type { PhotoPick, ProofKind } from "@/services/types";
import { proofLabel } from "@/utils/format";

export function ProofForm({
  proof,
  saving,
  error,
  onSubmit,
}: {
  proof: ProofKind;
  saving: boolean;
  error: string | null;
  onSubmit: (body: string, videoUrl: string, photo: PhotoPick | null) => void;
}) {
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photo, setPhoto] = useState<PhotoPick | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function pickPhoto() {
    setLocalError(null);
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setLocalError("Photo access is off. You can still write the proof if this dare allows words.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? "proof.jpg",
      type: asset.mimeType ?? "image/jpeg",
    });
  }

  function submit() {
    setLocalError(null);
    if (!body.trim()) {
      setLocalError("Write a few words with your proof.");
      return;
    }
    if (proof === "photo" && !photo) {
      setLocalError("This dare asks for a photo.");
      return;
    }
    if (proof === "video" && !videoUrl.trim()) {
      setLocalError("Paste a video link for this dare.");
      return;
    }
    onSubmit(body.trim(), videoUrl.trim(), photo);
  }

  return (
    <Card>
      <Kicker>YOUR PROOF</Kicker>
      <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 15 }}>
        This one wants {proofLabel(proof).toLowerCase()}. The group sees it as soon as you send it.
      </Text>
      {error ? <Banner message={error} /> : null}
      {localError ? <Banner message={localError} /> : null}
      <Field
        label="What did you do?"
        value={body}
        onChangeText={setBody}
        multiline
        placeholder="Where you ended up, what you made, what you heard."
      />
      {proof === "photo" || proof === "any" ? (
        <View style={{ gap: 8 }}>
          <Button label={photo ? "Choose a different photo" : "Add a photo"} tone="ghost" onPress={() => void pickPhoto()} />
          {photo ? (
            <Image source={{ uri: photo.uri }} style={{ width: "100%", height: 180, borderRadius: 16 }} />
          ) : null}
        </View>
      ) : null}
      {proof === "video" || proof === "any" ? (
        <Field
          label="Video link"
          value={videoUrl}
          onChangeText={setVideoUrl}
          autoCapitalize="none"
          placeholder="https://"
        />
      ) : null}
      <Button label="Send proof" onPress={submit} loading={saving} />
    </Card>
  );
}
