import "@/global.css";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const navigationState = useRootNavigationState();

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
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FEFEFE" },
        }}
      />
    </SafeAreaProvider>
  );
}