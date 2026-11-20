import { useEffect } from "react";
import { Text } from "react-native";

import { Banner, Card, Kicker, ScreenScroll } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import type { ProofKind } from "@/services/types";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { fetchDareBank } from "@/state/slices/challengesSlice";

const PROOF_LABEL: Record<ProofKind, string> = {
  text: "Words",
  photo: "Photo",
  video: "Video",
  any: "Anything",
};

export default function DaresScreen() {
  const dispatch = useAppDispatch();
  const dares = useAppSelector((state) => state.challenges.bank);
  const status = useAppSelector((state) => state.challenges.bankStatus);
  const error = useAppSelector((state) => state.challenges.error);

  useEffect(() => {
    void dispatch(fetchDareBank());
  }, [dispatch]);

  return (
    <ScreenScroll onRefresh={() => void dispatch(fetchDareBank())} refreshing={status === "loading"}>
      <Kicker>THE LIST</Kicker>
      <Text style={{ fontFamily: font.display, fontSize: 42, color: theme.ink }}>Challenges List</Text>
      <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 16, maxWidth: 560 }}>
        Every group is given one of these each day. This is the full list, not only the dare for today.
      </Text>
      {status === "error" && error ? <Banner message={error} /> : null}
      {status === "loading" && dares.length === 0 ? (
        <Text style={{ fontFamily: font.body, color: theme.muted }}>Loading the list</Text>
      ) : null}
      {dares.map((dare, index) => (
        <Card key={dare.title}>
          <Text style={{ fontFamily: font.medium, color: theme.muted, fontSize: 13 }}>
            {index + 1} · {PROOF_LABEL[dare.proof]}
          </Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 18, color: theme.ink }}>{dare.title}</Text>
          <Text style={{ fontFamily: font.body, color: theme.ink, lineHeight: 22 }}>{dare.prompt}</Text>
        </Card>
      ))}
    </ScreenScroll>
  );
}
