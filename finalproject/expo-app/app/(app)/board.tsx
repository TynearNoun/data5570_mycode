import { useEffect } from "react";
import { Text, View } from "react-native";

import { Banner, Card, EmptyState, Kicker, ScreenScroll } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { fetchLeaderboard } from "@/state/slices/leaderboardSlice";

export default function BoardScreen() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.groups.selectedId);
  const group = useAppSelector((state) => state.groups.items.find((item) => item.id === selectedId));
  const board = useAppSelector((state) => state.leaderboard.board);
  const status = useAppSelector((state) => state.leaderboard.status);
  const error = useAppSelector((state) => state.leaderboard.error);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const standings = board?.group.id === selectedId ? board.standings : [];

  useEffect(() => {
    if (selectedId) void dispatch(fetchLeaderboard(selectedId));
  }, [dispatch, selectedId]);

  if (!group) {
    return (
      <ScreenScroll>
        <EmptyState title="No board yet" body="Join a group and the points for that circle show up here." />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll onRefresh={() => selectedId && void dispatch(fetchLeaderboard(selectedId))}>
      <Kicker>{group.name.toUpperCase()}</Kicker>
      <Text style={{ fontFamily: font.display, fontSize: 42, color: theme.ink }}>Board</Text>
      <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 16, maxWidth: 560 }}>
        Proof is 10 points. A reaction on your proof is 2. A custom dare you write is 3. Streaks count daily challenges in a row, Denver time.
      </Text>
      {error ? <Banner message={error} /> : null}
      {status === "loading" && standings.length === 0 ? (
        <Text style={{ fontFamily: font.body, color: theme.muted }}>Adding up points</Text>
      ) : null}
      {standings.map((row) => {
        const mine = row.user.id === userId;
        return (
          <Card key={row.user.id} tone={row.rank === 1 ? "gold" : mine ? "pine" : "card"}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, color: theme.muted }}>#{row.rank}</Text>
                <Text style={{ fontFamily: font.display, fontSize: 28, color: theme.ink }}>{row.user.display_name}</Text>
                <Text style={{ fontFamily: font.body, color: theme.muted }}>
                  {row.current_streak}-day streak · best {row.best_streak} · {row.submissions} proofs
                </Text>
              </View>
              <Text style={{ fontFamily: font.display, fontSize: 36, color: theme.clay }}>{row.points}</Text>
            </View>
          </Card>
        );
      })}
    </ScreenScroll>
  );
}
