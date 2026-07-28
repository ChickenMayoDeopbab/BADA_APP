import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const readToken = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }

  const secureToken = await SecureStore.getItemAsync(
    key,
    secureStoreOptions,
  );
  if (secureToken) {
    await AsyncStorage.removeItem(key);
    return secureToken;
  }

  // 기존 버전에서 AsyncStorage에 저장한 토큰을 한 번만 안전 저장소로 이전합니다.
  const legacyToken = await AsyncStorage.getItem(key);
  if (!legacyToken) return null;

  await SecureStore.setItemAsync(key, legacyToken, secureStoreOptions);
  await AsyncStorage.removeItem(key);

  return legacyToken;
};

const writeToken = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value, secureStoreOptions);
  await AsyncStorage.removeItem(key);
};

export const getAccessToken = (): Promise<string | null> =>
  readToken(ACCESS_TOKEN_KEY);

export const getRefreshToken = (): Promise<string | null> =>
  readToken(REFRESH_TOKEN_KEY);

export const getAuthTokens = async (): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> => {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  return { accessToken, refreshToken };
};

export const setAuthTokens = async ({
  accessToken,
  refreshToken,
}: AuthTokens): Promise<void> => {
  await Promise.all([
    writeToken(ACCESS_TOKEN_KEY, accessToken),
    writeToken(REFRESH_TOKEN_KEY, refreshToken),
  ]);
};

export const clearAuthTokens = async (): Promise<void> => {
  const deletions: Promise<void>[] = [
    // 웹 저장소와 이전 버전의 잔여 토큰을 함께 제거합니다.
    AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]),
  ];

  if (Platform.OS !== "web") {
    deletions.push(
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, secureStoreOptions),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, secureStoreOptions),
    );
  }

  await Promise.all(deletions);
};
