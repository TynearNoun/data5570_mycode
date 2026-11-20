import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Banner, Button, EmptyState, Field } from "@/components/ui";
import { font, theme } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { fetchMessages, sendMessage } from "@/state/slices/messagesSlice";
import { formatWhen } from "@/utils/format";
import type { ChatMessage } from "@/services/types";

const NO_MESSAGES: ChatMessage[] = [];

export default function MessagesScreen() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const selectedId = useAppSelector((state) => state.groups.selectedId);
  const group = useAppSelector((state) => state.groups.items.find((item) => item.id === selectedId));
  const messageGroupId = useAppSelector((state) => state.messages.groupId);
  const storedMessages = useAppSelector((state) => state.messages.items);
  const messages = messageGroupId === selectedId ? storedMessages : NO_MESSAGES;
  const status = useAppSelector((state) => state.messages.status);
  const error = useAppSelector((state) => state.messages.error);
  const saving = useAppSelector((state) => state.messages.saving);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (selectedId) void dispatch(fetchMessages(selectedId));
  }, [dispatch, selectedId]);

  if (!group) {
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <EmptyState title="No chat yet" body="Messages stay inside a group. Join or create one first." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 4 }}>
        <Text style={{ fontFamily: font.semibold, color: theme.clay, letterSpacing: 1.1 }}>{group.name.toUpperCase()}</Text>
        <Text style={{ fontFamily: font.display, fontSize: 36, color: theme.ink }}>Chat</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}>
        {error ? <Banner message={error} /> : null}
        {status === "loading" && messages.length === 0 ? (
          <Text style={{ fontFamily: font.body, color: theme.muted }}>Loading the thread</Text>
        ) : null}
        {status !== "loading" && messages.length === 0 ? (
          <EmptyState title="The chat is quiet" body="Say which part of the challenge you are doing." />
        ) : null}
        {messages.map((message) => {
          const mine = message.user.id === userId;
          return (
            <View key={message.id} style={{ flexDirection: "row", gap: 10, justifyContent: mine ? "flex-end" : "flex-start" }}>
              {mine ? null : <Avatar name={message.user.display_name} />}
              <View
                style={{
                  maxWidth: "78%",
                  backgroundColor: mine ? theme.pine : theme.card,
                  borderRadius: 18,
                  padding: 12,
                  gap: 4,
                  borderWidth: mine ? 0 : 1,
                  borderColor: theme.line,
                }}
              >
                <Text style={{ fontFamily: font.semibold, color: mine ? theme.cream : theme.ink }}>
                  {mine ? "You" : message.user.display_name}
                </Text>
                <Text style={{ fontFamily: font.body, color: mine ? theme.cream : theme.ink, fontSize: 16, lineHeight: 22 }}>
                  {message.body}
                </Text>
                <Text style={{ fontFamily: font.body, color: mine ? theme.mist : theme.muted, fontSize: 12 }}>
                  {formatWhen(message.created_at)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ padding: 12, paddingBottom: 12 + insets.bottom, gap: 8, borderTopWidth: 1, borderTopColor: theme.line }}>
        <Field label="Message" value={body} onChangeText={setBody} placeholder={`Say something to ${group.name}`} />
        <Button
          label="Send"
          loading={saving}
          onPress={() => {
            const text = body.trim();
            if (!text || !selectedId) return;
            void dispatch(sendMessage({ groupId: selectedId, body: text })).then((action) => {
              if (sendMessage.fulfilled.match(action)) setBody("");
            });
          }}
        />
      </View>
    </View>
  );
}
