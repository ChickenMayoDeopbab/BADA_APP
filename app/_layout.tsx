import "@/global.css";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAudioModeAsync } from "expo-audio";
import { router, Stack, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
    if (!navigationState?.key) return;

    const checkToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      const autoLogin = await AsyncStorage.getItem("autoLogin");
      router.replace(token && autoLogin === "true" ? "/home" : "/auth");
    };
    checkToken();
  }, [navigationState?.key]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#FEFEFE" },
          }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
