import { SEMANTIC_COLORS } from "@/design-system/colors";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSkeletonPulse } from "./SkeletonGroup";

interface SkeletonProps {
  className?: string; // 크기·모서리·여백 등 (예: "h-4 w-1/2 rounded-control")
  style?: StyleProp<ViewStyle>;
}

/**
 * 콘텐츠 자리를 표시하는 회색 블록.
 * SkeletonGroup 안에서 쓰면 그룹의 박자에 맞춰 깜빡이고, 그룹 밖에서는 정지 상태로 보인다.
 */
export default function Skeleton({ className = "", style }: SkeletonProps) {
  const pulseOpacity = useSkeletonPulse();
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity ? pulseOpacity.value : 1,
  }));

  return (
    <View className={`overflow-hidden ${className}`} style={style}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.fill, pulseStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: SEMANTIC_COLORS.fill.neutral },
});
