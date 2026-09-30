import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Platform } from "react-native";

/**
 * 탭 내부의 하위 화면은 탭바 숨김 전환과 동시에 열립니다.
 * iOS는 짧은 페이드로 전환하고, 전환 시간을 지정할 수 없는 Android는
 * 화면 애니메이션을 생략해 탭바와 화면 사이의 지연을 만들지 않습니다.
 */
export const FAST_STACK_SCREEN_OPTIONS = {
  headerShown: false,
  animation: Platform.OS === "android" ? "none" : "fade",
  ...(Platform.OS === "ios" ? { animationDuration: 100 } : {}),
} satisfies NativeStackNavigationOptions;
