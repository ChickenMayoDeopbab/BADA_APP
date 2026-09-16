import CommunityIcon from "@/assets/community.svg";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_LABELS: Record<string, string> = {
  "(home)": "홈", "(train)": "훈련", "(record)": "기록",
  "(community)": "커뮤니티", "(profile)": "프로필",
};

function TabIcon({ routeName, color }: { routeName: string; color: string }) {
  const icon = routeName === "(home)"
    ? <Octicons name="home-fill" size={26} color={color} />
    : routeName === "(train)"
      ? <Ionicons name="call" size={26} color={color} />
      : routeName === "(record)"
        ? <Octicons name="history" size={27} color={color} />
        : routeName === "(community)"
          ? <CommunityIcon width={27} height={27} color={color} />
          : <Ionicons name="person" size={27} color={color} />;

  return <View className="size-[34px] items-center justify-center">{icon}</View>;
}

export default function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 300 ? 8 : width < 360 ? 16 : 32;
  return (
    <View
      className="flex-row items-center border-t border-line-alternative bg-background-normal"
      style={{
        paddingHorizontal: horizontalPadding,
        paddingBottom: insets.bottom,
        height: 72 + insets.bottom,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const color = isFocused ? SEMANTIC_COLORS.primary.normal : SEMANTIC_COLORS.line.normal;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            onPress={onPress}
            className="h-[72px] min-w-0 items-center justify-center gap-1"
            style={{ flex: route.name === "(community)" ? 1.25 : 1 }}
          >
            <TabIcon routeName={route.name} color={color} />
            <Text
              numberOfLines={1}
              className="w-full text-center text-caption font-medium"
              style={{ color }}
            >
              {TAB_LABELS[route.name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
