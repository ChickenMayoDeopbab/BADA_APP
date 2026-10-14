import { createContext, ReactNode, useContext, useEffect } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import {
  cancelAnimation,
  Easing,
  SharedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const PULSE_MIN_OPACITY = 0.4; // 가장 옅어졌을 때의 불투명도
const PULSE_DURATION_MS = 800; // 진해짐 ↔ 옅어짐 한 방향에 걸리는 시간

// 그룹 안의 모든 Skeleton이 같은 박자로 깜빡이도록 공유하는 불투명도 값
const SkeletonPulseContext = createContext<SharedValue<number> | null>(null);

/** 가장 가까운 SkeletonGroup의 공유 불투명도 값을 반환 (그룹 밖이면 null) */
export const useSkeletonPulse = () => useContext(SkeletonPulseContext);

interface SkeletonGroupProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * 스켈레톤 묶음.
 * 애니메이션을 하나만 돌려 하위 Skeleton 전체에 공유하므로 블록 수와 무관하게 비용이 같고,
 * 스크린리더에는 하위 블록 대신 "로딩 중" 하나로 읽힌다.
 * 시스템 '동작 줄이기'가 켜져 있으면 깜빡이지 않는다.
 */
export default function SkeletonGroup({
  children,
  className,
  style,
  accessibilityLabel = "로딩 중",
}: SkeletonGroupProps) {
  const isReducedMotion = useReducedMotion();
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isReducedMotion) return;

    pulseOpacity.value = withRepeat(
      withTiming(PULSE_MIN_OPACITY, {
        duration: PULSE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
    };
  }, [isReducedMotion, pulseOpacity]);

  return (
    <SkeletonPulseContext.Provider value={pulseOpacity}>
      <View
        className={className}
        style={style}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: true }}
      >
        {children}
      </View>
    </SkeletonPulseContext.Provider>
  );
}
