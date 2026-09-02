import "@/global.css";
import "@/design-system/setupDefaultFont";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PendingCallProvider } from "@/context/PendingCallContext";
import { setAudioModeAsync } from "expo-audio";
import {
  router,
  Stack,
  usePathname,
  useRootNavigationState,
} from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { isDiagnosisRequiredForAuthenticatedUser } from "@/utils/diagnosisFlow";
import { clearAuthTokens, getAccessToken } from "@/utils/authTokenStorage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

export default function RootLayout() {
  const navigationState = useRootNavigationState();
  const pathname = usePathname();
  const isOAuthCallback = pathname === "/auth/callback";

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldPlayInBackground: false,
    }).catch((error) => {
      console.error("[Audio] Audio Mode 설정 실패", error);
    });
  }, []);

  useEffect(() => {
    if (!navigationState?.key || isOAuthCallback) return;

    const checkToken = async () => {
      const token = await getAccessToken();
      const autoLogin = await AsyncStorage.getItem("autoLogin");
      if (!token || autoLogin !== "true") {
        await clearAuthTokens();
        router.replace("/auth");
        return;
      }

      const needsDiagnosis = await isDiagnosisRequiredForAuthenticatedUser();
      router.replace(needsDiagnosis ? "/diagnosis/welcome" : "/home");
    };
    checkToken();
  }, [isOAuthCallback, navigationState?.key]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <PendingCallProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#FEFEFE" },
            }}
          >
            {/*
              훈련 설정·통화·불안 점수 화면은 탭 그룹 밖 루트 스택에 둔다.
              이들은 시나리오 상세 시트(transparentModal) 위에서 열리는데,
              탭 안에 두면 iOS가 뒤따르는 화면도 모달 컨텍스트로 보고
              pageSheet(둥근 모서리 + 뒤 화면 노출)로 그린다.
              또 탭 안의 전체 화면 모달은 하단 탭 바가 먹은 높이만큼
              콘텐츠가 짧게 잡혀 화면 아래에 빈 띠가 남는다.
              루트 스택의 일반 push는 상세 시트보다 아래에 그려지므로
              fullScreenModal로 띄워 최상단에 올린다.
            */}
            <Stack.Screen
              name="start"
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen
              name="train"
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen
              name="anxiety"
              options={{ presentation: "fullScreenModal" }}
            />
          </Stack>
        </PendingCallProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
