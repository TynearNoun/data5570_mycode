import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "rally.token";
const GROUP_KEY = "rally.groupId";

export async function loadToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function loadGroupId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(GROUP_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export async function saveGroupId(id: number | null): Promise<void> {
  if (id == null) {
    await AsyncStorage.removeItem(GROUP_KEY);
    return;
  }
  await AsyncStorage.setItem(GROUP_KEY, String(id));
}
