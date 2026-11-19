import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { font, theme } from "@/constants/theme";
import { initials } from "@/utils/format";

export function Button({
  label,
  onPress,
  disabled,
  tone = "clay",
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "clay" | "pine" | "ghost";
  loading?: boolean;
}) {
  const background = tone === "clay" ? theme.clay : tone === "pine" ? theme.pine : "transparent";
  const color = tone === "ghost" ? theme.ink : theme.cream;
  const borderColor = tone === "ghost" ? theme.line : background;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: background,
        borderColor,
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: "center",
        opacity: disabled || loading ? 0.55 : pressed ? 0.88 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ color, fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  ...input
}: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: font.medium, color: theme.ink, fontSize: 13 }}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.placeholder}
        {...input}
        style={[
          {
            backgroundColor: theme.card,
            borderColor: theme.line,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: input.multiline ? 12 : 0,
            minHeight: input.multiline ? 110 : 48,
            fontFamily: font.body,
            fontSize: 16,
            color: theme.ink,
          },
          input.style,
        ]}
      />
    </View>
  );
}

export function Card({ children, tone = "card" }: { children: ReactNode; tone?: "card" | "gold" | "pine" }) {
  const background = tone === "gold" ? theme.goldSoft : tone === "pine" ? theme.pineSoft : theme.card;
  return (
    <View
      style={{
        backgroundColor: background,
        borderColor: theme.line,
        borderWidth: 1,
        borderRadius: 22,
        padding: 18,
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}

export function Banner({ message, tone = "danger" }: { message: string; tone?: "danger" | "note" }) {
  const danger = tone === "danger";
  return (
    <View
      style={{
        backgroundColor: danger ? theme.dangerBg : theme.pineSoft,
        borderRadius: 14,
        padding: 12,
      }}
    >
      <Text style={{ color: danger ? theme.danger : theme.pine, fontFamily: font.medium, fontSize: 14 }}>
        {message}
      </Text>
    </View>
  );
}

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingVertical: 7,
        paddingHorizontal: 12,
        backgroundColor: active ? theme.ink : theme.bgDeep,
      }}
    >
      <Text style={{ color: active ? theme.cream : theme.ink, fontFamily: font.medium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.pine,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: theme.cream, fontFamily: font.semibold, fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function Kicker({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: font.semibold, letterSpacing: 1.2, color: theme.clay, fontSize: 12 }}>{children}</Text>
  );
}

export function ScreenScroll({
  children,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const narrow = width < 960;
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: width < 720 ? 16 : 28,
        paddingTop: 22,
        paddingBottom: (narrow ? 96 : 40) + insets.bottom,
        gap: 16,
        width: "100%",
        maxWidth: 1080,
        alignSelf: "center",
      }}
    >
      {refreshing ? <ActivityIndicator color={theme.clay} /> : null}
      {children}
      {onRefresh ? (
        <Pressable onPress={onRefresh} style={{ alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: font.medium, color: theme.muted }}>Refresh</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card>
      <Text style={{ fontFamily: font.display, fontSize: 28, color: theme.ink }}>{title}</Text>
      <Text style={{ fontFamily: font.body, fontSize: 16, color: theme.muted, lineHeight: 22 }}>{body}</Text>
      {action}
    </Card>
  );
}
