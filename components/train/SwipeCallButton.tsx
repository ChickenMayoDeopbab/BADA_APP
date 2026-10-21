import { ReactNode, useRef } from "react";
import { PanResponder, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/** 버튼이 원래 자리에서 움직일 수 있는 최대 반경(px) */
const SWIPE_MAX_RADIUS = 100;
/** 이 거리(px) 이상 끌고 놓으면 동작을 실행한다 */
const SWIPE_TRIGGER_DISTANCE = 80;
/** 탭과 구분하기 위해 이만큼(px) 움직이면 드래그로 본다 */
const SWIPE_START_DISTANCE = 8;
/** 드래그 중 버튼 위에 덮는 어두운 막의 불투명도 */
const DRAG_DIM_OPACITY = 0.25;
const DIM_DURATION_MS = 100;

interface SwipeCallButtonProps {
  children: ReactNode;
  isDisabled?: boolean;
  onSwipe: () => void;
}

/** 전 방향으로 끌어서 실행하는 통화 버튼 래퍼 (탭은 자식 버튼이 그대로 처리한다) */
export default function SwipeCallButton({
  children,
  isDisabled = false,
  onSwipe,
}: SwipeCallButtonProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dimOpacity = useSharedValue(0);
  const isDisabledRef = useRef(isDisabled);
  isDisabledRef.current = isDisabled;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));

  /** 놓거나 중단되면 제자리로 돌리고 어두운 막을 걷는다 */
  const resetPosition = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    dimOpacity.value = withTiming(0, { duration: DIM_DURATION_MS });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isDisabledRef.current && Math.hypot(dx, dy) > SWIPE_START_DISTANCE,
      onPanResponderGrant: () => {
        dimOpacity.value = withTiming(DRAG_DIM_OPACITY, { duration: DIM_DURATION_MS });
      },
      onPanResponderMove: (_, { dx, dy }) => {
        // 반경을 넘으면 같은 방향의 원 둘레에 붙인다
        const distance = Math.hypot(dx, dy);
        const scale = distance > SWIPE_MAX_RADIUS ? SWIPE_MAX_RADIUS / distance : 1;
        translateX.value = dx * scale;
        translateY.value = dy * scale;
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        resetPosition();
        if (Math.hypot(dx, dy) >= SWIPE_TRIGGER_DISTANCE) onSwipeRef.current();
      },
      onPanResponderTerminate: resetPosition,
    }),
  ).current;

  return (
    <Animated.View style={animatedStyle} {...panResponder.panHandlers}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.dim, dimStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    backgroundColor: "#000",
  },
});
