import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useId, useState } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSkeletonShimmer } from "./SkeletonGroup";

interface SkeletonProps {
  className?: string; // 크기·모서리·여백 등 (예: "h-4 w-1/2 rounded-control")
  style?: StyleProp<ViewStyle>;
}

/**
 * 콘텐츠 자리를 표시하는 회색 블록.
 * 그룹의 진행 값으로 밝은 띠를 흘리고, 그룹 밖이나 동작 줄이기 설정에서는 정지한다.
 */
export default function Skeleton({ className = "", style }: SkeletonProps) {
  const progress = useSkeletonShimmer();
  const [width, setWidth] = useState(0);
  const gradientId = `skeleton-${useId().replace(/\W/g, "")}`;
  const bandWidth = Math.max(48, width * 0.65);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -bandWidth + (width + bandWidth) * (progress?.value ?? 0) },
    ],
  }));

  /** 회전이나 카드 폭 변경에도 빛이 블록 양 끝 바깥까지 이동하도록 폭을 측정한다. */
  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      className={`overflow-hidden ${className}`}
      style={[styles.fill, style]}
      onLayout={progress ? handleLayout : undefined}
    >
      {progress && width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.band, { width: bandWidth }, shimmerStyle]}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop
                  offset="0"
                  stopColor={SEMANTIC_COLORS.background.normal}
                  stopOpacity={0}
                />
                <Stop
                  offset="0.5"
                  stopColor={SEMANTIC_COLORS.background.normal}
                  stopOpacity={0.9}
                />
                <Stop
                  offset="1"
                  stopColor={SEMANTIC_COLORS.background.normal}
                  stopOpacity={0}
                />
              </LinearGradient>
            </Defs>
            <Rect width="100" height="100" fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: SEMANTIC_COLORS.fill.neutral },
  band: { position: "absolute", top: 0, bottom: 0, left: 0 },
});
