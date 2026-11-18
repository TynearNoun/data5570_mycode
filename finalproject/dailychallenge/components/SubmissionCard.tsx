import { Image, Pressable, Text, View } from "react-native";

import { Avatar, Card } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import type { ReactionKind, Submission } from "@/services/types";
import { formatWhen } from "@/utils/format";

const REACTIONS: { kind: ReactionKind; label: string }[] = [
  { kind: "fire", label: "Fire" },
  { kind: "cheer", label: "Cheer" },
  { kind: "laugh", label: "Laugh" },
];

export function SubmissionCard({
  submission,
  mine,
  onReact,
}: {
  submission: Submission;
  mine: boolean;
  onReact: (kind: ReactionKind, existingId: number | null) => void;
}) {
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Avatar name={submission.user.display_name} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, color: theme.ink, fontSize: 16 }}>
            {submission.user.display_name}
            {mine ? " · you" : ""}
          </Text>
          <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 13 }}>
            {formatWhen(submission.created_at)}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: font.body, color: theme.ink, fontSize: 16, lineHeight: 23 }}>{submission.body}</Text>
      {submission.photo_url ? (
        <Image
          source={{ uri: submission.photo_url }}
          style={{ width: "100%", height: 220, borderRadius: 16, backgroundColor: theme.bgDeep }}
          resizeMode="cover"
        />
      ) : null}
      {submission.video_url ? (
        <Text style={{ fontFamily: font.medium, color: theme.pine, fontSize: 14 }}>{submission.video_url}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {REACTIONS.map((reaction) => {
          const existing = submission.reactions.mine.find((item) => item.kind === reaction.kind);
          const count = submission.reactions[reaction.kind];
          return (
            <Pressable
              key={reaction.kind}
              onPress={() => onReact(reaction.kind, existing?.id ?? null)}
              disabled={mine}
              style={{
                borderRadius: 999,
                paddingVertical: 7,
                paddingHorizontal: 12,
                backgroundColor: existing ? theme.ink : theme.bg,
                opacity: mine ? 0.45 : 1,
              }}
            >
              <Text style={{ color: existing ? theme.cream : theme.ink, fontFamily: font.medium, fontSize: 13 }}>
                {reaction.label} {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
