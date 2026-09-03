import {
  registerPushDevice,
  unregisterPushDevice,
} from "@/api/notificationApi";
import { PushDevicePlatform } from "@/api/types";
import { getAccessToken } from "@/utils/authTokenStorage";
import type { RemoteMessage } from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import {
  PermissionsAndroid,
  Platform,
  TurboModuleRegistry,
  type PermissionStatus,
} from "react-native";

const INSTALLATION_ID_KEY = "pushNotifications:installationId";
const LAST_BACKGROUND_MESSAGE_KEY =
  "pushNotifications:lastBackgroundMessage";
const FIREBASE_PUSH_ENABLED =
  process.env.EXPO_PUBLIC_FIREBASE_PUSH_ENABLED === "true";

type FirebaseMessagingModule =
  typeof import("@react-native-firebase/messaging");

let firebaseMessagingModule: FirebaseMessagingModule | null = null;
let didWarnAboutUnavailableFirebase = false;
const pendingRegistrations = new Map<string, Promise<boolean>>();

function getFirebaseMessagingModule(): FirebaseMessagingModule | null {
  if (!FIREBASE_PUSH_ENABLED || !getPushDevicePlatform()) return null;
  if (firebaseMessagingModule) return firebaseMessagingModule;

  const hasFirebaseNativeModules =
    TurboModuleRegistry.get("NativeRNFBTurboApp") !== null &&
    TurboModuleRegistry.get("NativeRNFBTurboMessaging") !== null;

  if (!hasFirebaseNativeModules) {
    if (!didWarnAboutUnavailableFirebase) {
      didWarnAboutUnavailableFirebase = true;
      console.info(
        "[Push] 현재 앱 빌드에 Firebase 네이티브 모듈이 없어 푸시 알림을 비활성화합니다.",
      );
    }
    return null;
  }

  try {
    // 네이티브 모듈이 포함된 Development/Store Build에서만 로드합니다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    firebaseMessagingModule = require("@react-native-firebase/messaging");
    return firebaseMessagingModule;
  } catch (error) {
    if (!didWarnAboutUnavailableFirebase) {
      didWarnAboutUnavailableFirebase = true;
      console.info(
        "[Push] Firebase 네이티브 설정이 없어 푸시 알림을 비활성화합니다.",
        error instanceof Error ? error.message : String(error),
      );
    }
    return null;
  }
}

export interface PushMessage {
  messageId?: string;
  data?: Record<string, string | object>;
}

interface PushNotificationListeners {
  onForegroundMessage: (message: PushMessage) => void;
  onNotificationOpened: (message: PushMessage) => void;
}

async function getInstallationId(): Promise<string> {
  const storedId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (storedId) return storedId;

  const installationId = randomUUID();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

function getPushDevicePlatform(): PushDevicePlatform | null {
  if (Platform.OS === "android") return "ANDROID";
  if (Platform.OS === "ios") return "IOS";
  return null;
}

async function requestNotificationPermission(
  firebaseMessaging: FirebaseMessagingModule,
): Promise<boolean> {
  if (Platform.OS === "android") {
    if (Number(Platform.Version) < 33) return true;

    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const currentStatus = await PermissionsAndroid.check(permission);
    if (currentStatus) return true;

    const status: PermissionStatus =
      await PermissionsAndroid.request(permission);
    return status === PermissionsAndroid.RESULTS.GRANTED;
  }

  if (Platform.OS === "ios") {
    const status = await firebaseMessaging.requestPermission(
      firebaseMessaging.getMessaging(),
    );
    return (
      status === firebaseMessaging.AuthorizationStatus.AUTHORIZED ||
      status === firebaseMessaging.AuthorizationStatus.PROVISIONAL
    );
  }

  return false;
}

async function sendTokenToServer(
  token: string,
  expectedAccessToken?: string,
): Promise<boolean> {
  const platform = getPushDevicePlatform();
  const accessToken = await getAccessToken();
  if (
    !platform ||
    !accessToken ||
    (expectedAccessToken && accessToken !== expectedAccessToken)
  ) {
    return false;
  }

  await registerPushDevice({
    installationId: await getInstallationId(),
    token,
    platform,
  });
  return true;
}

async function performPushRegistration(
  firebaseMessaging: FirebaseMessagingModule,
  accessToken: string,
): Promise<boolean> {
  try {
    const permissionGranted =
      await requestNotificationPermission(firebaseMessaging);
    if (!permissionGranted) return false;

    const messaging = firebaseMessaging.getMessaging();
    await firebaseMessaging.setAutoInitEnabled(messaging, true);
    if (!firebaseMessaging.isDeviceRegisteredForRemoteMessages(messaging)) {
      await firebaseMessaging.registerDeviceForRemoteMessages(messaging);
    }
    const token = await firebaseMessaging.getToken(messaging);
    if (__DEV__) {
      console.info("[Push][FCM_TOKEN]", token);
    }
    return await sendTokenToServer(token, accessToken);
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;
    if (
      Platform.OS === "ios" &&
      errorCode === "messaging/registration-timeout"
    ) {
      console.info(
        "[Push] APNs 기기 등록이 응답하지 않았습니다. ARM64 iOS 시뮬레이터에서는 FCM 토큰이 발급되지 않으므로 실제 iPhone에서 테스트해 주세요.",
      );
      return false;
    }

    console.warn("[Push] FCM 토큰 등록 실패", error);
    return false;
  }
}

export async function registerForPushNotifications(
  expectedAccessToken?: string,
): Promise<boolean> {
  const firebaseMessaging = getFirebaseMessagingModule();
  const accessToken = await getAccessToken();
  if (
    !firebaseMessaging ||
    !getPushDevicePlatform() ||
    !accessToken ||
    (expectedAccessToken && accessToken !== expectedAccessToken)
  ) {
    return false;
  }

  const pendingRegistration = pendingRegistrations.get(accessToken);
  if (pendingRegistration) return pendingRegistration;

  const registration = performPushRegistration(
    firebaseMessaging,
    accessToken,
  ).finally(() => {
    if (pendingRegistrations.get(accessToken) === registration) {
      pendingRegistrations.delete(accessToken);
    }
  });
  pendingRegistrations.set(accessToken, registration);
  return registration;
}

/**
 * FCM/APNs 등록을 이 기기에서 폐기합니다.
 *
 * 인증이 만료되어 서버 API를 호출할 수 없는 경우에도 이전 토큰으로 이 기기에
 * 알림이 도착하지 않도록 로컬 Firebase 토큰은 별도로 삭제합니다.
 */
export async function deleteLocalPushToken(): Promise<boolean> {
  const firebaseMessaging = getFirebaseMessagingModule();
  if (!firebaseMessaging || !getPushDevicePlatform()) {
    try {
      await AsyncStorage.removeItem(LAST_BACKGROUND_MESSAGE_KEY);
      return true;
    } catch (error) {
      console.warn("[Push] 백그라운드 알림 정보 삭제 실패", error);
      return false;
    }
  }

  let succeeded = true;
  const messaging = firebaseMessaging.getMessaging();

  try {
    await firebaseMessaging.setAutoInitEnabled(messaging, false);
  } catch (error) {
    succeeded = false;
    console.warn("[Push] FCM 자동 초기화 비활성화 실패", error);
  }

  try {
    await firebaseMessaging.deleteToken(messaging);
  } catch (error) {
    succeeded = false;
    console.warn("[Push] 로컬 FCM 토큰 삭제 실패", error);
  }

  if (
    Platform.OS === "ios" &&
    firebaseMessaging.isDeviceRegisteredForRemoteMessages(messaging)
  ) {
    try {
      await firebaseMessaging.unregisterDeviceForRemoteMessages(messaging);
    } catch (error) {
      succeeded = false;
      console.warn("[Push] APNs 기기 등록 해제 실패", error);
    }
  }

  try {
    await AsyncStorage.removeItem(LAST_BACKGROUND_MESSAGE_KEY);
  } catch (error) {
    succeeded = false;
    console.warn("[Push] 백그라운드 알림 정보 삭제 실패", error);
  }

  return succeeded;
}

/**
 * 로그아웃 전에 서버의 사용자-기기 연결을 끊고 로컬 푸시 토큰을 폐기합니다.
 * installationId는 앱 설치 단위 식별자이므로 재로그인 시 재등록할 수 있게 유지합니다.
 */
export async function unregisterForPushNotifications(): Promise<boolean> {
  let serverSucceeded = true;

  try {
    const [installationId, accessToken] = await Promise.all([
      AsyncStorage.getItem(INSTALLATION_ID_KEY),
      getAccessToken(),
    ]);

    if (installationId && accessToken) {
      await unregisterPushDevice(installationId);
    }
  } catch (error) {
    serverSucceeded = false;
    console.warn("[Push] 서버 기기 등록 해제 실패", error);
  }

  const localSucceeded = await deleteLocalPushToken();
  return serverSucceeded && localSucceeded;
}

export function listenForPushNotifications({
  onForegroundMessage: handleForegroundMessage,
  onNotificationOpened: handleNotificationOpened,
}: PushNotificationListeners): () => void {
  const firebaseMessaging = getFirebaseMessagingModule();
  if (!firebaseMessaging || !getPushDevicePlatform()) return () => {};

  try {
    const messaging = firebaseMessaging.getMessaging();
    const unsubscribeForeground = firebaseMessaging.onMessage(
      messaging,
      handleForegroundMessage,
    );
    const unsubscribeOpened = firebaseMessaging.onNotificationOpenedApp(
      messaging,
      handleNotificationOpened,
    );
    const unsubscribeTokenRefresh = firebaseMessaging.onTokenRefresh(
      messaging,
      (token) => {
        if (__DEV__) {
          console.info("[Push][FCM_TOKEN_REFRESHED]", token);
        }
        void sendTokenToServer(token).catch((error) => {
          console.warn("[Push] 갱신된 FCM 토큰 등록 실패", error);
        });
      },
    );

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
      unsubscribeTokenRefresh();
    };
  } catch (error) {
    console.warn("[Push] FCM 리스너 초기화 실패", error);
    return () => {};
  }
}

export async function getInitialPushNotification(): Promise<PushMessage | null> {
  const firebaseMessaging = getFirebaseMessagingModule();
  if (!firebaseMessaging || !getPushDevicePlatform()) return null;

  try {
    return await firebaseMessaging.getInitialNotification(
      firebaseMessaging.getMessaging(),
    );
  } catch (error) {
    console.warn("[Push] 최초 알림 확인 실패", error);
    return null;
  }
}

function registerBackgroundMessageHandler() {
  const firebaseMessaging = getFirebaseMessagingModule();
  if (!firebaseMessaging || !getPushDevicePlatform()) return;

  try {
    firebaseMessaging.setBackgroundMessageHandler(
      firebaseMessaging.getMessaging(),
      async (message: RemoteMessage) => {
        await AsyncStorage.setItem(
          LAST_BACKGROUND_MESSAGE_KEY,
          JSON.stringify({
            messageId: message.messageId,
            receivedAt: new Date().toISOString(),
          }),
        );
      },
    );
  } catch (error) {
    console.warn("[Push] 백그라운드 FCM 핸들러 초기화 실패", error);
  }
}

registerBackgroundMessageHandler();
