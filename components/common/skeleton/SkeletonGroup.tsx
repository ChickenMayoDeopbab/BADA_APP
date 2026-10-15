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

const SHIMMER_DURATION_MS = 1400;

// 그룹 안의 블록이 하나의 진행 값을 공유해 같은 박자로 빛이 흐른다.
const SkeletonShimmerContext = createContext<SharedValue<number> | null>(null);

/** 가장 가까운 그룹의 빛 이동 진행 값을 반환하며 정지 상태에서는 null이다. */
export const useSkeletonShimmer = () => useContext(SkeletonShimmerContext);

interface SkeletonGroupProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * 스켈레톤 묶음.
 * 반복 애니메이션의 진행 값을 하위 Skeleton 전체에 공유하고,
 * 스크린리더에는 하위 블록 대신 "로딩 중" 하나로 읽힌다.
 * 시스템 '동작 줄이기'가 켜져 있으면 정지 블록으로 표시한다.
 */
export default function SkeletonGroup({
  children,
  className,
  style,
  accessibilityLabel = "로딩 중",
}: SkeletonGroupProps) {
  const isReducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion) return;

    progress.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress);
      progress.value = 0;
    };
  }, [isReducedMotion, progress]);

  return (
    <SkeletonShimmerContext.Provider value={isReducedMotion ? null : progress}>
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
    </SkeletonShimmerContext.Provider>
  );
}
