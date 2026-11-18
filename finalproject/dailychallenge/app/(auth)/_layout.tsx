import { Redirect, Stack } from "expo-router";

import { theme } from "@/constants/theme";
import { useAppSelector } from "@/state/hooks";

export default function AuthLayout() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === "authenticated") return <Redirect href="/today" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />;
}
