import { useState } from "react";
import { Text, View } from "react-native";

import { Banner, Button, Card, EmptyState, Field, Kicker, Pill, ScreenScroll } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import type { ProofKind } from "@/services/types";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { createChallenge } from "@/state/slices/challengesSlice";
import { formatChallengeDate, proofLabel } from "@/utils/format";
import type { Challenge } from "@/services/types";

const NO_CHALLENGES: Challenge[] = [];

const PROOFS: ProofKind[] = ["any", "text", "photo", "video"];

export default function CreateScreen() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.groups.selectedId);
  const group = useAppSelector((state) => state.groups.items.find((item) => item.id === selectedId));
  const saving = useAppSelector((state) => state.challenges.saving);
  const error = useAppSelector((state) => state.challenges.error);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const challenges = useAppSelector((state) =>
    selectedId ? (state.challenges.byGroup[selectedId] ?? NO_CHALLENGES) : NO_CHALLENGES,
  );
  const mine = challenges.filter(
    (challenge) => challenge.kind === "custom" && challenge.created_by?.id === userId,
  );
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [proof, setProof] = useState<ProofKind>("any");
  const [date, setDate] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    if (!selectedId) return;
    if (!title.trim() || !prompt.trim()) {
      setLocalError("Give the dare a title and say what people should do.");
      return;
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setLocalError("Use a date like 2026-11-18, or leave it blank.");
      return;
    }
    setLocalError(null);
    void dispatch(
      createChallenge({
        group: selectedId,
        title: title.trim(),
        prompt: prompt.trim(),
        proof,
        challenge_date: date || null,
      }),
    ).then((action) => {
      if (createChallenge.fulfilled.match(action)) {
        setTitle("");
        setPrompt("");
        setDate("");
      }
    });
  }

  if (!group) {
    return (
      <ScreenScroll>
        <EmptyState title="Pick a group first" body="Custom dares belong to a circle. Open Groups and select one." />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Kicker>{group.name.toUpperCase()}</Kicker>
      <Text style={{ fontFamily: font.display, fontSize: 40, color: theme.ink }}>Make a dare</Text>
      <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 16, maxWidth: 560 }}>
        The daily one is generated for the group. This is an extra challenge you write. Making one is worth 3 points.
      </Text>
      {localError ? <Banner message={localError} /> : null}
      {error ? <Banner message={error} /> : null}
      <Card>
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Bring a snack" />
        <Field
          label="Prompt"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          placeholder="Tell them exactly what counts as done."
        />
        <Text style={{ fontFamily: font.medium, color: theme.ink }}>Proof</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {PROOFS.map((item) => (
            <Pill key={item} label={proofLabel(item)} active={proof === item} onPress={() => setProof(item)} />
          ))}
        </View>
        <Field label="Date, optional" value={date} onChangeText={setDate} placeholder="2026-11-18" autoCapitalize="none" />
        <Button label="Save challenge" onPress={submit} loading={saving} />
      </Card>
      <Text style={{ fontFamily: font.display, fontSize: 28, color: theme.ink }}>Yours</Text>
      {mine.length === 0 ? (
        <Text style={{ fontFamily: font.body, color: theme.muted }}>Nothing custom from you in this circle yet.</Text>
      ) : (
        mine.map((challenge) => (
          <Card key={challenge.id}>
            <Text style={{ fontFamily: font.medium, color: theme.muted }}>
              {formatChallengeDate(challenge.challenge_date)} · {proofLabel(challenge.proof)}
            </Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 18, color: theme.ink }}>{challenge.title}</Text>
            <Text style={{ fontFamily: font.body, color: theme.ink }}>{challenge.prompt}</Text>
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}
