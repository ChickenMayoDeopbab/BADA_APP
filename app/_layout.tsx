import { SEMANTIC_COLORS } from "@/design-system";
import "@/global.css";
import "@/design-system/setupDefaultFont";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScheduledCallWatcher from "@/components/train/ScheduledCallWatcher";
import { AppAlertProvider } from "@/context/AppAlertContext";
import { setAudioModeAsync } from "expo-audio";
import * as SplashScreen from "expo-splash-screen";
import {
  router,
  Stack,
  usePathname,
  useRootNavigationState,
} from "expo-router";
import { useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getAuthenticatedPath } from "@/utils/legalConsentFlow";
import {
  clearAuthTokens,
  getAccessToken,
} from "@/utils/authTokenStorage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { unregisterForPushNotifications } from "@/services/pushNotifications";

void SplashScreen.preventAutoHideAsync().catch(() => {});

type StartupPath =
  | "/auth"
  | "/auth/terms"
  | "/diagnosis/welcome"
  | "/home";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

function PushNotificationManager() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const navigationState = useRootNavigationState();
  const pathname = usePathname();
  const isOAuthCallback = pathname === "/auth/callback";
  const startupCheckStartedRef = useRef(false);
  const [startupPath, setStartupPath] = useState<StartupPath | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;

    if (isOAuthCallback) {
      // 콜백 화면이 로그인 완료와 다음 경로를 결정하므로 시작 시 인증 검사를 생략한다.
      startupCheckStartedRef.current = true;
      const frame = requestAnimationFrame(() => {
        void SplashScreen.hideAsync();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (startupCheckStartedRef.current) return;
    startupCheckStartedRef.current = true;

    let active = true;
    let completed = false;

    const checkToken = async () => {
      let nextPath: StartupPath = "/auth";

      try {
        const token = await getAccessToken();
        const autoLogin = await AsyncStorage.getItem("autoLogin");
        if (!active) return;
        if (!token || autoLogin !== "true") {
          await unregisterForPushNotifications();
          if (!active) return;
          await clearAuthTokens();
        } else {
          nextPath = await getAuthenticatedPath();
        }
      } catch {
        if (active) await clearAuthTokens().catch(() => {});
      }

      if (!active) return;
      completed = true;
      setStartupPath(nextPath);
      router.replace(nextPath);
    };

    void checkToken();
    return () => {
      active = false;
      if (!completed) startupCheckStartedRef.current = false;
    };
  }, [isOAuthCallback, navigationState?.key]);

  useEffect(() => {
    if (!startupPath || pathname !== startupPath) return;

    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, startupPath]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppAlertProvider>
          <PushNotificationManager />
          <ScheduledCallWatcher />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: SEMANTIC_COLORS.background.normal },
            }}
          >
            <Stack.Screen name="train" options={{ gestureEnabled: false }} />
          </Stack>
        </AppAlertProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
