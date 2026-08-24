import CommunityIcon from "@/assets/community.svg";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_LABELS: Record<string, string> = {
  "(home)": "홈", "(train)": "훈련", "(record)": "기록",
  "(community)": "커뮤니티", "(profile)": "프로필",
};

function TabIcon({ routeName, color }: { routeName: string; color: string }) {
  if (routeName === "(home)") return <Octicons name="home-fill" size={26} color={color} />;
  if (routeName === "(train)") return <Ionicons name="call" size={26} color={color} />;
  if (routeName === "(record)") return <Octicons name="history" size={27} color={color} />;
  if (routeName === "(community)") return <CommunityIcon width={27} height={27} color={color} />;
  return <Ionicons name="person" size={27} color={color} />;
}

export default function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-start justify-between border-t border-line-alternative bg-background-normal px-[25px]"
      style={{ paddingBottom: insets.bottom, height: 88 + insets.bottom }}
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
            className="w-[52px] items-center justify-center gap-1.5 pt-3"
          >
            <TabIcon routeName={route.name} color={color} />
            <Text className="text-caption font-medium" style={{ color }}>
              {TAB_LABELS[route.name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
