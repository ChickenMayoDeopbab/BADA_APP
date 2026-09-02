import { registerPushDevice } from "@/api/notificationApi";
import { PushDevicePlatform } from "@/api/types";
import { getAccessToken } from "@/utils/authTokenStorage";
import type { RemoteMessage } from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import {
  PermissionsAndroid,
  Platform,
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

function getFirebaseMessagingModule(): FirebaseMessagingModule | null {
  if (!FIREBASE_PUSH_ENABLED) return null;
  if (firebaseMessagingModule) return firebaseMessagingModule;

  try {
    // Firebase 앱 등록 전에는 네이티브 모듈을 로드하지 않아 Expo Go/기존
    // Development Build에서도 앱이 시작될 수 있게 합니다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    firebaseMessagingModule = require("@react-native-firebase/messaging");
    return firebaseMessagingModule;
  } catch (error) {
    if (!didWarnAboutUnavailableFirebase) {
      didWarnAboutUnavailableFirebase = true;
      console.warn(
        "[Push] Firebase 네이티브 설정이 없어 푸시 알림을 비활성화합니다.",
        error,
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

async function sendTokenToServer(token: string): Promise<void> {
  const platform = getPushDevicePlatform();
  if (!platform || !(await getAccessToken())) return;

  await registerPushDevice({
    installationId: await getInstallationId(),
    token,
    platform,
  });
}

export async function registerForPushNotifications(): Promise<boolean> {
  const firebaseMessaging = getFirebaseMessagingModule();
  if (
    !firebaseMessaging ||
    !getPushDevicePlatform() ||
    !(await getAccessToken())
  ) {
    return false;
  }

  try {
    const permissionGranted =
      await requestNotificationPermission(firebaseMessaging);
    if (!permissionGranted) return false;

    const messaging = firebaseMessaging.getMessaging();
    if (!firebaseMessaging.isDeviceRegisteredForRemoteMessages(messaging)) {
      await firebaseMessaging.registerDeviceForRemoteMessages(messaging);
    }
    await sendTokenToServer(await firebaseMessaging.getToken(messaging));
    return true;
  } catch (error) {
    console.warn("[Push] FCM 토큰 등록 실패", error);
    return false;
  }
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
