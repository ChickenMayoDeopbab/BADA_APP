import BottomNav from "@/components/navigation/BottomNav";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs, usePathname, useSegments } from "expo-router";
import { useLayoutEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_CONTENT_HEIGHT = 72;

function AnimatedBottomNav({
  hidden,
  ...props
}: BottomTabBarProps & { hidden: boolean }) {
  const insets = useSafeAreaInsets();
  const visibility = useSharedValue(hidden ? 0 : 1);
  const backgroundVisibility = useSharedValue(hidden ? 0 : 1);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  useLayoutEffect(() => {
    visibility.value = withTiming(hidden ? 0 : 1, {
      duration: hidden ? 110 : 150,
      easing: Easing.out(Easing.cubic),
    });
    backgroundVisibility.value = withTiming(hidden ? 0 : 1, {
      duration: hidden ? 45 : 90,
      easing: Easing.out(Easing.quad),
    });
  }, [backgroundVisibility, hidden, visibility]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarHeight * (1 - visibility.value) }],
  }));
  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundVisibility.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      pointerEvents={hidden ? "none" : "auto"}
      style={[
        {
          position: "absolute",
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1,
        },
        animatedStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: SEMANTIC_COLORS.background.normal,
          },
          animatedBackgroundStyle,
        ]}
      />
      <BottomNav {...props} transparentBackground />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const isCommunityStack = segments.some(
    (segment) => segment === "(community)",
  );
  const currentRoute = segments[segments.length - 1];
  const isCommunityRoot =
    currentRoute === "(community)" || currentRoute === "community";
  const isTrainCreation =
    segments.some((segment) => segment === "(train)") &&
    ["create", "warmup", "warmup-start"].some((route) =>
      pathname.endsWith(`/${route}`),
    );
  const isScenarioDetail =
    segments.some((segment) => segment === "(train)") &&
    segments.some((segment) => segment === "detail");
  const isRecordDetail =
    segments.some((segment) => segment === "(record)") &&
    (segments.some((segment) => segment === "[id]") || /\/record\/[^/]+$/.test(pathname));
  const isProfileSubscreen =
    segments.some((segment) => segment === "(profile)") &&
    (segments.some((segment) => segment === "settings") ||
      pathname.endsWith("/edit") || pathname.endsWith("/inquiry"));
  const hideTabBar =
    pathname.endsWith("/notifications") ||
    pathname.endsWith("/search") ||
    (isCommunityStack && !isCommunityRoot) ||
    isTrainCreation ||
    isScenarioDetail ||
    isRecordDetail ||
    isProfileSubscreen;

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <AnimatedBottomNav {...props} hidden={hideTabBar} />
        )}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            paddingBottom: hideTabBar
              ? 0
              : TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          },
          tabBarActiveTintColor: SEMANTIC_COLORS.primary.normal,
          tabBarInactiveTintColor: SEMANTIC_COLORS.line.normal,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "semibold",
          },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: "홈",
          }}
        />
        <Tabs.Screen
          name="(train)"
          options={{
            title: "훈련",
            popToTopOnBlur: true,
          }}
        />

        <Tabs.Screen
          name="(record)"
          options={{
            title: "기록",
          }}
        />
        <Tabs.Screen
          name="(community)"
          options={{
            title: "커뮤니티",
            popToTopOnBlur: true,
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            title: "프로필",
            popToTopOnBlur: true,
          }}
        />
      </Tabs>
    </>
  );
}
