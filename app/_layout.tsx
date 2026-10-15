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
import { AuthSessionExpiredError } from "@/utils/authSessionError";
import CustomButton from "@/components/common/CustomButton";
import { Text, View } from "react-native";

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
  const [hasStartupError, setHasStartupError] = useState(false);
  const [isCheckingStartup, setIsCheckingStartup] = useState(true);
  const [startupAttempt, setStartupAttempt] = useState(0);

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
      setHasStartupError(false);
      const frame = requestAnimationFrame(() => {
        void SplashScreen.hideAsync();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (startupCheckStartedRef.current) return;
    startupCheckStartedRef.current = true;
    setIsCheckingStartup(true);

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
          nextPath = await getAuthenticatedPath({ throwOnError: true });
        }
      } catch (error) {
        if (!active) return;
        if (!(error instanceof AuthSessionExpiredError)) {
          // 오프라인·서버 장애·기기 잠금으로 확인하지 못한 세션을 삭제하지 않는다.
          startupCheckStartedRef.current = false;
          setHasStartupError(true);
          setIsCheckingStartup(false);
          void SplashScreen.hideAsync().catch(() => {});
          return;
        }
      }

      if (!active) return;
      completed = true;
      setHasStartupError(false);
      setIsCheckingStartup(false);
      setStartupPath(nextPath);
      router.replace(nextPath);
    };

    void checkToken();
    return () => {
      active = false;
      if (!completed) startupCheckStartedRef.current = false;
    };
  }, [isOAuthCallback, navigationState?.key, startupAttempt]);

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
          <View className="flex-1">
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: SEMANTIC_COLORS.background.normal },
              }}
            >
              <Stack.Screen name="train" options={{ gestureEnabled: false }} />
            </Stack>
            {hasStartupError ? (
              <View className="absolute inset-0 items-center justify-center gap-5 bg-background-normal px-8">
                <Text className="text-headline1 font-bold text-label-normal">
                  로그인 상태를 확인하지 못했어요
                </Text>
                <Text className="text-center text-body text-label-alternative">
                  네트워크 연결과 기기 잠금 해제를 확인한 뒤 다시 시도해 주세요.
                  저장된 로그인 정보는 유지하고 있어요.
                </Text>
                <CustomButton
                  label={isCheckingStartup ? "확인 중..." : "다시 확인"}
                  disabled={isCheckingStartup}
                  onPress={() => setStartupAttempt((attempt) => attempt + 1)}
                />
              </View>
            ) : null}
          </View>
        </AppAlertProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
