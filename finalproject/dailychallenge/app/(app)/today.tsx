import { useEffect } from "react";
import { Text, View, useWindowDimensions } from "react-native";

import { ProofForm } from "@/components/ProofForm";
import { SubmissionCard } from "@/components/SubmissionCard";
import { Banner, Card, EmptyState, Kicker, ScreenScroll } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import type { ReactionKind } from "@/services/types";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { ensureDaily, fetchChallenges } from "@/state/slices/challengesSlice";
import { addReaction, createSubmission, fetchSubmissions, removeReaction } from "@/state/slices/submissionsSlice";
import { formatChallengeDate, proofLabel } from "@/utils/format";

const NO_CHALLENGES: never[] = [];

export default function TodayScreen() {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const selectedId = useAppSelector((state) => state.groups.selectedId);
  const groupsStatus = useAppSelector((state) => state.groups.status);
  const group = useAppSelector((state) => state.groups.items.find((item) => item.id === state.groups.selectedId));
  const dailyId = useAppSelector((state) => state.challenges.dailyId);
  const challenges = useAppSelector((state) =>
    selectedId ? (state.challenges.byGroup[selectedId] ?? NO_CHALLENGES) : NO_CHALLENGES,
  );
  const daily = challenges.find((item) => item.id === dailyId) ?? null;
  const challengeError = useAppSelector((state) => state.challenges.error);
  const challengeStatus = useAppSelector((state) => state.challenges.status);
  const submissions = useAppSelector((state) => state.submissions.items);
  const submissionChallengeId = useAppSelector((state) => state.submissions.challengeId);
  const submissionStatus = useAppSelector((state) => state.submissions.status);
  const submissionError = useAppSelector((state) => state.submissions.error);
  const saving = useAppSelector((state) => state.submissions.saving);
  const userId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    if (!selectedId) return;
    void dispatch(ensureDaily(selectedId)).then(() => dispatch(fetchChallenges(selectedId)));
  }, [dispatch, selectedId]);

  useEffect(() => {
    if (!daily?.id) return;
    void dispatch(fetchSubmissions({ challengeId: daily.id }));
  }, [daily?.id, dispatch]);

  function reload() {
    if (!selectedId) return;
    void dispatch(ensureDaily(selectedId)).then(() => dispatch(fetchChallenges(selectedId)));
  }

  function react(submissionId: number, kind: ReactionKind, existingId: number | null) {
    if (existingId) {
      void dispatch(removeReaction(existingId));
      return;
    }
    void dispatch(addReaction({ submissionId, kind }));
  }

  if (groupsStatus === "loading" && !group) {
    return (
      <ScreenScroll>
        <Text style={{ fontFamily: font.body, color: theme.muted }}>Loading your circles</Text>
      </ScreenScroll>
    );
  }

  if (!group) {
    return (
      <ScreenScroll>
        <EmptyState
          title="No circle yet"
          body="Create a group or join one with an invite code. Today’s challenge shows up once you have people to do it with."
        />
      </ScreenScroll>
    );
  }

  const visibleSubmissions = submissionChallengeId === daily?.id ? submissions : [];
  const mine =
    visibleSubmissions.find((item) => item.user.id === userId) ?? daily?.my_submission ?? null;
  const others = visibleSubmissions.filter((item) => item.user.id !== userId);
  const earlier = challenges.filter((item) => item.id !== daily?.id);

  return (
    <ScreenScroll onRefresh={reload}>
      <View style={{ gap: 4 }}>
        <Kicker>{group.name.toUpperCase()}</Kicker>
        <Text style={{ fontFamily: font.display, fontSize: wide ? 48 : 36, color: theme.ink }}>Today</Text>
      </View>
      {challengeError ? <Banner message={challengeError} /> : null}
      {challengeStatus === "loading" && !daily ? (
        <Text style={{ fontFamily: font.body, color: theme.muted }}>Getting today’s challenge</Text>
      ) : null}
      {daily ? (
        <View style={{ flexDirection: wide ? "row" : "column", gap: 16, width: "100%" }}>
          <View style={wide ? { flex: 1.15, minWidth: 0, gap: 16 } : { width: "100%", gap: 16 }}>
            <Card tone="pine">
              <Kicker>DAILY CHALLENGE</Kicker>
              <Text style={{ fontFamily: font.body, color: theme.muted }}>
                {formatChallengeDate(daily.challenge_date)} · {proofLabel(daily.proof)}
              </Text>
              <Text style={{ fontFamily: font.display, fontSize: 34, color: theme.ink, lineHeight: 38 }}>{daily.title}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 17, color: theme.ink, lineHeight: 24 }}>{daily.prompt}</Text>
              <Text style={{ fontFamily: font.medium, color: theme.pine }}>
                {daily.submission_count} {daily.submission_count === 1 ? "proof" : "proofs"} in
              </Text>
            </Card>
            {mine ? (
              <SubmissionCard submission={mine} mine onReact={() => undefined} />
            ) : (
              <ProofForm
                proof={daily.proof}
                saving={saving}
                error={submissionError}
                onSubmit={(body, videoUrl, photo) => {
                  void dispatch(createSubmission({ challengeId: daily.id, body, videoUrl, photo }));
                }}
              />
            )}
          </View>
          <View style={wide ? { flex: 0.85, minWidth: 0, gap: 12 } : { width: "100%", gap: 12 }}>
            <Text style={{ fontFamily: font.semibold, color: theme.ink, fontSize: 16 }}>The circle</Text>
            {submissionError && mine ? <Banner message={submissionError} /> : null}
            {submissionStatus === "loading" && others.length === 0 ? (
              <Text style={{ fontFamily: font.body, color: theme.muted }}>Loading the circle</Text>
            ) : others.length === 0 ? (
              <EmptyState title="Nobody else yet" body="When someone sends proof, it lands here. Reactions add points to their streak." />
            ) : (
              others.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  mine={false}
                  onReact={(kind, existingId) => react(submission.id, kind, existingId)}
                />
              ))
            )}
          </View>
        </View>
      ) : null}
      {earlier.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: font.display, fontSize: 28, color: theme.ink }}>Earlier</Text>
          {earlier.map((challenge) => (
            <Card key={challenge.id}>
              <Text style={{ fontFamily: font.medium, color: theme.muted, fontSize: 13 }}>
                {challenge.kind === "daily" ? "Daily" : "Custom"} · {formatChallengeDate(challenge.challenge_date)} ·{" "}
                {proofLabel(challenge.proof)}
              </Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 18, color: theme.ink }}>{challenge.title}</Text>
              <Text style={{ fontFamily: font.body, color: theme.ink, lineHeight: 21 }}>{challenge.prompt}</Text>
              <Text style={{ fontFamily: font.medium, color: theme.pine }}>
                {challenge.submission_count} proofs
                {challenge.my_submission ? " · you showed up" : ""}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}
    </ScreenScroll>
  );
}
