import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * 키보드가 올라와 있는지 여부.
 * iOS는 애니메이션이 시작될 때(Will), Android는 끝난 뒤(Did) 이벤트가 오므로
 * 플랫폼별로 다른 이벤트를 구독한다.
 */
export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return isKeyboardVisible;
}
