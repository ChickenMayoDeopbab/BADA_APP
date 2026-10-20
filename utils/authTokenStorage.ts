import { AuthSessionChangedError } from "./authSessionError";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { jwtDecode } from "jwt-decode";
import { clearTrainingCallScenarios } from "./trainingCallScenario";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const LOGIN_METHOD_KEY = "auth:loginMethod";

export type AuthLoginMethod = "password" | "oauth";

/** 토큰 자체를 저장하지 않고 로그인 방식이 속한 계정의 식별자만 추출한다. */
const getTokenSubject = (token: string): string | null => {
  try {
    const { sub } = jwtDecode<{ sub?: string }>(token);
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
};

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const readToken = async (key: string): Promise<string | null> => {
  const readVersion = authSessionVersion;
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }

  const secureToken = await SecureStore.getItemAsync(key, secureStoreOptions);
  if (secureToken) {
    await AsyncStorage.removeItem(key).catch(() => {});
    return secureToken;
  }

  // 기존 버전에서 AsyncStorage에 저장한 토큰을 한 번만 안전 저장소로 이전합니다.
  const legacyToken = await AsyncStorage.getItem(key);
  if (!legacyToken) return null;

  await enqueueTokenMutation(async () => {
    if (readVersion !== authSessionVersion) return;
    await SecureStore.setItemAsync(key, legacyToken, secureStoreOptions);
    await AsyncStorage.removeItem(key).catch(() => {});
  });

  return readVersion === authSessionVersion ? legacyToken : null;
};

const writeToken = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value, secureStoreOptions);
  await AsyncStorage.removeItem(key).catch(() => {});
};

export const getAccessToken = async (): Promise<string | null> => {
  await tokenMutationQueue.catch(() => {});
  return readToken(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  await tokenMutationQueue.catch(() => {});
  return readToken(REFRESH_TOKEN_KEY);
};

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

/** Wait for every native write/delete before allowing the next token mutation. */
const settleTokenOperations = async (operations: Promise<void>[]): Promise<void> => {
  const results = await Promise.allSettled(operations);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
};

const writeAuthTokens = async (
  { accessToken, refreshToken }: AuthTokens,
  loginMethod?: AuthLoginMethod,
): Promise<void> => {
  await settleTokenOperations([
    writeToken(ACCESS_TOKEN_KEY, accessToken),
    writeToken(REFRESH_TOKEN_KEY, refreshToken),
  ]);

  if (loginMethod) {
    const subject = getTokenSubject(accessToken);
    if (!subject) {
      await AsyncStorage.removeItem(LOGIN_METHOD_KEY);
      return;
    }
    await AsyncStorage.setItem(
      LOGIN_METHOD_KEY,
      JSON.stringify({ subject, method: loginMethod }),
    );
  }
};

let authSessionVersion = 0;
let tokenMutationQueue: Promise<void> = Promise.resolve();

/** Synchronously identify logout/login boundaries even while storage is busy. */
export const getAuthSessionVersion = () => authSessionVersion;

/** Serialize token pairs and deletes so a pending write cannot undo logout. */
const enqueueTokenMutation = (operation: () => Promise<void>): Promise<void> => {
  const task = tokenMutationQueue.catch(() => {}).then(operation);
  tokenMutationQueue = task;
  return task;
};

/** Refresh may commit only to the session from which its request originated. */
export const setAuthTokens = (
  tokens: AuthTokens,
  loginMethod?: AuthLoginMethod,
  expectedVersion?: number,
): Promise<void> => {
  if (expectedVersion !== undefined && expectedVersion !== authSessionVersion) {
    return Promise.reject(new AuthSessionChangedError());
  }
  const writeVersion = ++authSessionVersion;
  return enqueueTokenMutation(async () => {
    if (expectedVersion !== undefined && writeVersion !== authSessionVersion) {
      throw new AuthSessionChangedError();
    }
    await writeAuthTokens(tokens, loginMethod);
    if (expectedVersion !== undefined && writeVersion !== authSessionVersion) {
      throw new AuthSessionChangedError();
    }
  });
};

/** 현재 계정과 일치하는 로그인 방식만 반환하며 기존 세션의 방식은 추정하지 않는다. */
export const getAuthLoginMethod = async (): Promise<AuthLoginMethod | null> => {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const subject = getTokenSubject(token);
    if (!subject) return null;
    const stored = await AsyncStorage.getItem(LOGIN_METHOD_KEY);
    if (!stored) return null;
    const record = JSON.parse(stored);
    if (record?.subject !== subject) return null;
    return record.method === "password" || record.method === "oauth"
      ? record.method
      : null;
  } catch {
    return null;
  }
};

const deleteAuthTokens = async (): Promise<void> => {
  const deletions: Promise<void>[] = [
    // 예약 정리 실패가 토큰 폐기까지 막지 않도록 독립적으로 처리한다.
    clearTrainingCallScenarios().catch(() => {}),
    // 웹 저장소와 이전 버전의 잔여 토큰을 함께 제거합니다.
    AsyncStorage.multiRemove([
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      LOGIN_METHOD_KEY,
    ]),
  ];

  if (Platform.OS !== "web") {
    deletions.push(
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, secureStoreOptions),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, secureStoreOptions),
    );
  }

  await settleTokenOperations(deletions);
};

/** Invalidate in-flight refresh immediately, then remove all queued credentials. */
export const clearAuthTokens = (): Promise<void> => {
  authSessionVersion++;
  return enqueueTokenMutation(deleteAuthTokens);
};
