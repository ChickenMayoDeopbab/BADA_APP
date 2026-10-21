import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

const DOT_SIZE = 8;
const DOT_GAP = 8;
/** 점이 위로 튀어 오르는 높이(px) */
const BOUNCE_HEIGHT = 5;
/** 점 하나가 올라갔다 내려오는 한 주기(ms) */
const CYCLE_MS = 900;

interface DotProps {
  progress: SharedValue<number>;
  /** 주기 안에서 이 점이 늦게 출발하는 비율 (0~1) */
  phase: number;
}

/** 진행값에 맞춰 위아래로 움직이는 점 하나 */
function Dot({ progress, phase }: DotProps) {
  const dotStyle = useAnimatedStyle(() => {
    const t = (progress.value + 1 - phase) % 1;
    // 주기의 앞 절반 동안만 sin 곡선으로 올라갔다 내려오고 나머지는 쉰다
    const lift = t < 0.5 ? Math.sin(t * 2 * Math.PI) : 0;
    return { transform: [{ translateY: -BOUNCE_HEIGHT * lift }] };
  });
  return <Animated.View style={[styles.dot, dotStyle]} />;
}

/** AI가 말하는 중 대사가 아직 도착하지 않았을 때 보여주는 점 세 개 물결 로딩 */
export default function ScriptTypingDots() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="상대가 말하는 중"
      style={styles.container}
    >
      <Dot progress={progress} phase={0} />
      <Dot progress={progress} phase={0.15} />
      <Dot progress={progress} phase={0.3} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: DOT_GAP,
    height: DOT_SIZE + BOUNCE_HEIGHT,
    marginHorizontal: 22,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: SEMANTIC_COLORS.label.alternative,
  },
});
