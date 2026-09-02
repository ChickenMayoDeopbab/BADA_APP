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
          {/*
            훈련 흐름(설정·통화·불안 점수·리포트)은 탭 그룹 밖 루트 스택에 둔다.
            탭 안에 두면 시나리오 상세 시트(transparentModal) 위에 쌓여, iOS가
            뒤따르는 화면도 모달 컨텍스트로 보고 pageSheet(둥근 모서리 + 뒤 화면
            노출)로 그린다. 상세 시트는 훈련 시작 시점에 닫으므로(detail/[id].tsx)
            이 화면들은 모달이 아닌 일반 push로 열린다. 모달로 띄우면 화면끼리
            replace할 때 앞 화면만 닫히고 다음 화면이 뜨지 않는다.
            Screen을 선언하면 선언 순서가 초기 화면 결정에 끼어들므로 선언하지 않는다.
          */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#FEFEFE" },
            }}
          />
        </PendingCallProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
