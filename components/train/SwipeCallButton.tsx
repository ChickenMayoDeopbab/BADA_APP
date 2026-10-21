import { ReactNode, useEffect, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/** 물결이 버튼에서 뻗어나갈 수 있는 최대 반경(px) */
const SWIPE_MAX_RADIUS = 100;
/** 이 거리(px) 이상 끌고 놓으면 동작을 실행한다 */
const SWIPE_TRIGGER_DISTANCE = 80;
/** 탭과 구분하기 위해 이만큼(px) 움직이면 드래그로 본다 */
const SWIPE_START_DISTANCE = 8;
/** 대기 중 맥박 물결이 한 번 퍼지는 시간(ms) */
const IDLE_PULSE_MS = 1400;
/** 드래그 시작·종료 시 물결이 나타나고 사라지는 시간(ms) */
const FADE_MS = 120;

interface SwipeCallButtonProps {
  children: ReactNode;
  /** 물결 색 (버튼 색과 같게 쓴다) */
  rippleColor: string;
  isDisabled?: boolean;
  onSwipe: () => void;
}

/**
 * 갤럭시 전화 앱처럼 버튼은 제자리에 두고 물결이 손가락을 따라 번지는 통화 버튼 래퍼.
 * 탭은 자식 버튼이 그대로 처리한다.
 */
export default function SwipeCallButton({
  children,
  rippleColor,
  isDisabled = false,
  onSwipe,
}: SwipeCallButtonProps) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragProgress = useSharedValue(0); // 0~1: 끌어온 거리 비율
  const isDragging = useSharedValue(0);
  const pulse = useSharedValue(0);
  const isDisabledRef = useRef(isDisabled);
  isDisabledRef.current = isDisabled;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  // 대기 중에는 버튼 둘레로 물결이 반복해서 퍼진다
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = 0;
    if (!isDisabled) {
      pulse.value = withRepeat(
        withTiming(1, { duration: IDLE_PULSE_MS, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    }
    // 언마운트(통화 수락/거절 후 화면 이동) 시에도 무한 반복을 멈춘다
    return () => cancelAnimation(pulse);
  }, [isDisabled, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - isDragging.value) * 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + 0.6 * pulse.value }],
  }));
  // 버튼 중심에서 끌어온 만큼 커지는 큰 물결
  const haloStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value * (0.15 + 0.2 * dragProgress.value),
    transform: [{ scale: 1 + 1.4 * dragProgress.value }],
  }));
  // 손가락 쪽으로 번지는 물결 머리
  const waveStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value * 0.4,
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: 0.9 },
    ],
  }));

  /** 놓거나 중단되면 물결을 거둔다 */
  const resetRipple = () => {
    isDragging.value = withTiming(0, { duration: FADE_MS });
    dragProgress.value = withTiming(0, { duration: FADE_MS });
    dragX.value = withSpring(0);
    dragY.value = withSpring(0);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isDisabledRef.current && Math.hypot(dx, dy) > SWIPE_START_DISTANCE,
      onPanResponderGrant: () => {
        isDragging.value = withTiming(1, { duration: FADE_MS });
      },
      onPanResponderMove: (_, { dx, dy }) => {
        // 반경을 넘으면 같은 방향의 원 둘레에 붙인다
        const distance = Math.hypot(dx, dy);
        const scale = distance > SWIPE_MAX_RADIUS ? SWIPE_MAX_RADIUS / distance : 1;
        dragX.value = dx * scale;
        dragY.value = dy * scale;
        dragProgress.value = Math.min(distance / SWIPE_MAX_RADIUS, 1);
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        resetRipple();
        // 드래그 도중 처리 중 상태로 바뀌었으면 실행하지 않는다
        if (!isDisabledRef.current && Math.hypot(dx, dy) >= SWIPE_TRIGGER_DISTANCE) {
          onSwipeRef.current();
        }
      },
      onPanResponderTerminate: resetRipple,
    }),
  ).current;

  const rippleBackground = { backgroundColor: rippleColor };

  return (
    <View {...panResponder.panHandlers}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ripple, rippleBackground, pulseStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ripple, rippleBackground, haloStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ripple, rippleBackground, waveStyle]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ripple: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
});
