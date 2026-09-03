import { markNotificationRead } from "@/api/notificationApi";
import { notificationQueryKeys } from "@/hooks/useNotifications";
import {
  getInitialPushNotification,
  listenForPushNotifications,
  PushMessage,
  registerForPushNotifications,
} from "@/services/pushNotifications";
import { getAccessToken } from "@/utils/authTokenStorage";
import { useQueryClient } from "@tanstack/react-query";
import { router, usePathname, useRootNavigationState } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

function getPositiveInteger(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getMessageId(
  message: PushMessage,
  camelCaseKey: string,
  snakeCaseKey: string,
): number | null {
  return getPositiveInteger(
    message.data?.[camelCaseKey] ?? message.data?.[snakeCaseKey],
  );
}

export function usePushNotifications() {
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const queryClient = useQueryClient();
  const registeredAccessTokenRef = useRef<string | null>(null);
  const handledInitialNotificationRef = useRef(false);

  const registerCurrentSession = useCallback(async (force = false) => {
    if (pathname === "/" || pathname.startsWith("/auth")) {
      registeredAccessTokenRef.current = null;
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      registeredAccessTokenRef.current = null;
      return;
    }
    if (!force && registeredAccessTokenRef.current === accessToken) return;

    const registered = await registerForPushNotifications(accessToken);
    if (registered && (await getAccessToken()) === accessToken) {
      registeredAccessTokenRef.current = accessToken;
    }
  }, [pathname]);

  const refreshNotifications = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: notificationQueryKeys.all,
    });
  }, [queryClient]);

  const openNotification = useCallback(
    async (message: PushMessage) => {
      if (!(await getAccessToken())) return;

      const notificationId = getMessageId(
        message,
        "notificationId",
        "notification_id",
      );
      const postId = getMessageId(message, "postId", "post_id");

      if (notificationId) {
        void markNotificationRead(notificationId)
          .catch(() => {
            // 읽음 처리 실패가 화면 이동을 막지 않게 합니다.
          })
          .finally(refreshNotifications);
      } else {
        refreshNotifications();
      }

      if (postId) {
        router.push({
          pathname: "/(tabs)/(community)/post/[id]",
          params: { id: String(postId), source: "notifications" },
        });
        return;
      }

      router.push("/(tabs)/(home)/notifications");
    },
    [refreshNotifications],
  );

  useEffect(() => {
    return listenForPushNotifications({
      onForegroundMessage: refreshNotifications,
      onNotificationOpened: (message) => void openNotification(message),
    });
  }, [openNotification, refreshNotifications]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshNotifications();
        void registerCurrentSession(true);
      }
    });
    return () => subscription.remove();
  }, [refreshNotifications, registerCurrentSession]);

  useEffect(() => {
    void registerCurrentSession();
  }, [registerCurrentSession]);

  useEffect(() => {
    if (
      !navigationState?.key ||
      pathname === "/" ||
      pathname.startsWith("/auth") ||
      handledInitialNotificationRef.current
    ) {
      return;
    }

    let active = true;
    void (async () => {
      if (!(await getAccessToken())) return;

      const message = await getInitialPushNotification();
      if (!active) return;

      handledInitialNotificationRef.current = true;
      if (!message) return;
      await openNotification(message);
    })();

    return () => {
      active = false;
    };
  }, [navigationState?.key, openNotification, pathname]);
}
