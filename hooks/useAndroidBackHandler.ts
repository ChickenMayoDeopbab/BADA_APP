import { useCallback, useRef } from "react";
import { BackHandler, Platform, ToastAndroid } from "react-native";
import { useFocusEffect } from "expo-router";

/** Android 기기 내장 뒤로 가기 동작을 화면 단위로 재정의합니다. */
export function useAndroidBackHandler(onBackPress: () => boolean) {
  const handlerRef = useRef(onBackPress);
  handlerRef.current = onBackPress;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => handlerRef.current(),
      );

      return () => subscription.remove();
    }, []),
  );
}

/** 2초 안에 뒤로 가기를 한 번 더 누르면 앱을 종료합니다. */
export function useDoubleBackExit() {
  const lastBackPressRef = useRef(0);

  useAndroidBackHandler(() => {
    const now = Date.now();
    if (now - lastBackPressRef.current <= 2000) {
      BackHandler.exitApp();
      return true;
    }

    lastBackPressRef.current = now;
    ToastAndroid.show("한 번 더 누르면 앱이 종료됩니다", ToastAndroid.SHORT);
    return true;
  });
}
