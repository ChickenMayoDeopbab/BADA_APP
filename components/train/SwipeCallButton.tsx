import { ReactNode, useRef } from "react";
import { PanResponder } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/** 이 거리(px) 이상 위로 밀면 동작을 실행한다 */
const SWIPE_TRIGGER_DISTANCE = 90;
/** 탭과 구분하기 위해 세로로 이만큼(px) 움직이면 스와이프로 본다 */
const SWIPE_START_DISTANCE = 8;

interface SwipeCallButtonProps {
  children: ReactNode;
  isDisabled?: boolean;
  onSwipe: () => void;
}

/** 위로 밀어서 실행하는 통화 버튼 래퍼 (탭은 자식 버튼이 그대로 처리한다) */
export default function SwipeCallButton({
  children,
  isDisabled = false,
  onSwipe,
}: SwipeCallButtonProps) {
  const translateY = useSharedValue(0);
  const isDisabledRef = useRef(isDisabled);
  isDisabledRef.current = isDisabled;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isDisabledRef.current &&
        dy < -SWIPE_START_DISTANCE &&
        Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        translateY.value = Math.min(0, dy);
      },
      onPanResponderRelease: (_, { dy }) => {
        translateY.value = withSpring(0);
        if (dy <= -SWIPE_TRIGGER_DISTANCE) onSwipeRef.current();
      },
      onPanResponderTerminate: () => {
        translateY.value = withSpring(0);
      },
    }),
  ).current;

  return (
    <Animated.View style={animatedStyle} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
}
