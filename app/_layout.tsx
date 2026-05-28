import "@/global.css";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      const autoLogin = await AsyncStorage.getItem("autoLogin")
      if (token && autoLogin === 'true') {
        router.replace("/home");
      } else {
        router.replace("/auth");
      }
    };
    checkToken();
  }, []);
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
