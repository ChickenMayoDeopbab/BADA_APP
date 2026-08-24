import CommunityIcon from "@/assets/community.svg";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
    <View style={[styles.container, { paddingBottom: insets.bottom, height: 88 + insets.bottom }]}>
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
            style={styles.item}
          >
            <TabIcon routeName={route.name} color={color} />
            <Text style={[styles.label, { color }]}>{TAB_LABELS[route.name]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "flex-start", backgroundColor: SEMANTIC_COLORS.background.normal, borderTopColor: SEMANTIC_COLORS.line.alternative, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 25 },
  item: { alignItems: "center", gap: 6, justifyContent: "center", paddingTop: 12, width: 52 },
  label: { fontSize: 12, fontWeight: "500", letterSpacing: -0.24, lineHeight: 16 },
});
