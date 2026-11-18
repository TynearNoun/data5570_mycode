import { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { Avatar, Banner, Button, Card, Field, Kicker, ScreenScroll } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { createGroup, fetchGroups, joinGroup, selectGroup } from "@/state/slices/groupsSlice";

export default function GroupsScreen() {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const groups = useAppSelector((state) => state.groups.items);
  const selectedId = useAppSelector((state) => state.groups.selectedId);
  const saving = useAppSelector((state) => state.groups.saving);
  const error = useAppSelector((state) => state.groups.error);
  const status = useAppSelector((state) => state.groups.status);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");

  const selected = groups.find((group) => group.id === selectedId) ?? null;

  return (
    <ScreenScroll onRefresh={() => void dispatch(fetchGroups())}>
      <Kicker>PEOPLE</Kicker>
      <Text style={{ fontFamily: font.display, fontSize: wide ? 48 : 36, color: theme.ink }}>Groups</Text>
      <Text style={{ fontFamily: font.body, color: theme.muted, fontSize: 16, maxWidth: 560 }}>
        A group shares one daily dare, one chat, and one board. Switch circles by tapping a card.
      </Text>
      {error ? <Banner message={error} /> : null}
      {status === "loading" && groups.length === 0 ? (
        <Text style={{ fontFamily: font.body, color: theme.muted }}>Loading groups</Text>
      ) : null}
      {groups.length === 0 && status !== "loading" ? (
        <Card>
          <Text style={{ fontFamily: font.display, fontSize: 28, color: theme.ink }}>Start a circle or join one.</Text>
          <Text style={{ fontFamily: font.body, color: theme.muted, lineHeight: 22 }}>
            The seeded invite code is WEEKNIGHT, if that circle is on this server.
          </Text>
        </Card>
      ) : null}
      <View style={{ gap: 12 }}>
        {groups.map((group) => {
          const on = group.id === selectedId;
          return (
            <Pressable key={group.id} onPress={() => dispatch(selectGroup(group.id))}>
              <Card tone={on ? "pine" : "card"}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 18, color: theme.ink }}>{group.name}</Text>
                    <Text style={{ fontFamily: font.body, color: theme.muted }}>{group.description || "No description yet."}</Text>
                  </View>
                  <Text style={{ fontFamily: font.medium, color: on ? theme.pine : theme.muted }}>
                    {on ? "Selected" : group.role}
                  </Text>
                </View>
                <Text style={{ fontFamily: font.semibold, color: theme.ink }}>Invite {group.invite_code}</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {group.members.map((member) => (
                    <View key={member.id} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <Avatar name={member.display_name} size={28} />
                      <Text style={{ fontFamily: font.medium, color: theme.ink }}>{member.display_name}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Card>
            <Kicker>NEW GROUP</Kicker>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Weeknight Crew" />
            <Field
              label="What is this circle for?"
              value={description}
              onChangeText={setDescription}
              placeholder="One dare a day."
            />
            <Button
              label="Create group"
              loading={saving}
              onPress={() => {
                if (!name.trim()) return;
                void dispatch(createGroup({ name: name.trim(), description: description.trim() })).then((action) => {
                  if (createGroup.fulfilled.match(action)) {
                    setName("");
                    setDescription("");
                  }
                });
              }}
            />
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card>
            <Kicker>JOIN</Kicker>
            <Field label="Invite code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="WEEKNIGHT" />
            <Button
              label="Join group"
              tone="pine"
              loading={saving}
              onPress={() => {
                if (!code.trim()) return;
                void dispatch(joinGroup(code.trim())).then((action) => {
                  if (joinGroup.fulfilled.match(action)) setCode("");
                });
              }}
            />
            {selected ? (
              <Text style={{ fontFamily: font.body, color: theme.muted }}>
                Share {selected.invite_code} so someone else can join {selected.name}.
              </Text>
            ) : null}
          </Card>
        </View>
      </View>
    </ScreenScroll>
  );
}
