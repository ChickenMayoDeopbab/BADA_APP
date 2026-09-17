import { SEMANTIC_COLORS } from "@/design-system";
import "@/global.css";
import "@/design-system/setupDefaultFont";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PendingCallProvider } from "@/context/PendingCallContext";
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
import { isDiagnosisRequiredForAuthenticatedUser } from "@/utils/diagnosisFlow";
import {
  clearAuthTokens,
  getAccessToken,
} from "@/utils/authTokenStorage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { unregisterForPushNotifications } from "@/services/pushNotifications";

void SplashScreen.preventAutoHideAsync().catch(() => {});

type StartupPath = "/auth" | "/diagnosis/welcome" | "/home";

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
      requestAnimationFrame(() => {
        void SplashScreen.hideAsync();
      });
      return;
    }

    if (startupCheckStartedRef.current) return;
    startupCheckStartedRef.current = true;

    let active = true;

    const checkToken = async () => {
      let nextPath: StartupPath = "/auth";

      try {
        const token = await getAccessToken();
        const autoLogin = await AsyncStorage.getItem("autoLogin");
        if (!token || autoLogin !== "true") {
          await unregisterForPushNotifications();
          await clearAuthTokens();
        } else {
          const needsDiagnosis =
            await isDiagnosisRequiredForAuthenticatedUser();
          nextPath = needsDiagnosis ? "/diagnosis/welcome" : "/home";
        }
      } catch {
        await clearAuthTokens().catch(() => {});
      }

      if (!active) return;
      setStartupPath(nextPath);
      router.replace(nextPath);
    };

    void checkToken();
    return () => {
      active = false;
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
        <PendingCallProvider>
          <PushNotificationManager />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: SEMANTIC_COLORS.background.normal },
            }}
          />
        </PendingCallProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
