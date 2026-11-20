import { type ReactNode, useEffect } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { font, theme } from "@/constants/theme";
import { saveGroupId } from "@/services/storage";
import { fetchGroups } from "@/state/slices/groupsSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";

const NAV = [
  { href: "/today", label: "Today" },
  { href: "/groups", label: "Groups" },
  { href: "/create", label: "Create" },
  { href: "/board", label: "Board" },
  { href: "/messages", label: "Chat" },
  { href: "/account", label: "Account" },
] as const;

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const status = useAppSelector((state) => state.auth.status);
  const selectedId = useAppSelector((state) => state.groups.selectedId);

  useEffect(() => {
    if (status === "authenticated") {
      void dispatch(fetchGroups());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (status === "authenticated") {
      void saveGroupId(selectedId);
    }
  }, [selectedId, status]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, flexDirection: wide ? "row" : "column" }}>
      {wide ? (
        <View
          style={{
            width: 228,
            backgroundColor: theme.pine,
            paddingTop: insets.top + 28,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 18,
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 28 }}>
            <View>
              <Text style={{ fontFamily: font.semibold, color: theme.mist, letterSpacing: 1.2, fontSize: 12 }}>
                DAILY CHALLENGE
              </Text>
              <Text style={{ fontFamily: font.display, color: theme.cream, fontSize: 32, marginTop: 8 }}>
                Show up today.
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              {NAV.map((item) => {
                const on = active(pathname, item.href);
                return (
                  <Pressable
                    key={item.href}
                    onPress={() => router.push(item.href)}
                    style={{
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: on ? "rgba(255,251,246,0.12)" : "transparent",
                    }}
                  >
                    <Text style={{ color: theme.cream, fontFamily: on ? font.semibold : font.medium, fontSize: 16 }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Text style={{ color: theme.mist, fontFamily: font.body, fontSize: 14 }} numberOfLines={2}>
            {user?.display_name ?? "Signed in"}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>{children}</View>
      {wide ? null : (
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderTopColor: theme.line,
            backgroundColor: theme.card,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          }}
        >
          {NAV.map((item) => {
            const on = active(pathname, item.href);
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href)}
                style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
              >
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: on ? font.semibold : font.medium,
                    color: on ? theme.clay : theme.muted,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
