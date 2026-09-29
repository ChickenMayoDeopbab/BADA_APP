import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface AccordionContentProps extends PropsWithChildren {
  expanded: boolean;
  duration?: number;
}

/** 현재 높이에서 목표 높이로 이어서 움직여 연타해도 끊기지 않는 아코디언. */
export default function AccordionContent({
  expanded,
  duration,
  children,
}: AccordionContentProps) {
  const contentHeight = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    const animationDuration =
      duration ?? Math.min(520, Math.max(300, contentHeight.value * 0.12));

    return {
      height: withTiming(expanded ? contentHeight.value : 0, {
        duration: animationDuration,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
      opacity: withTiming(expanded ? 1 : 0, {
        duration: Math.min(animationDuration, 220),
        easing: Easing.out(Easing.quad),
      }),
    };
  });

  return (
    <Animated.View
      pointerEvents={expanded ? "auto" : "none"}
      style={[styles.clip, animatedStyle]}
    >
      <View
        onLayout={(event) => {
          contentHeight.value = event.nativeEvent.layout.height;
        }}
        style={styles.content}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
});
