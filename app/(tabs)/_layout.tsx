import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { Tabs, useSegments } from "expo-router";

export default function TabLayout() {
  const segments = useSegments();
  // URL record 경로일때 강제로 초록색~
  const isRecordRoute = segments.some(
    (s) => s === "record" || s === "(record)",
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#f5f5f5",
          borderTopWidth: 1,
          shadowOpacity: 0.1,
          height: 110,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#0AE365",
        tabBarInactiveTintColor: "#aaaaaa",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "semibold",
        },
      }}
    >
      <Tabs.Screen
        name="(home)/home"
        options={{
          title: "메인",
          tabBarIcon: ({ color, size }) => (
            <Octicons name="home-fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: "훈련",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="call" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(record)/record/index"
        options={{
          title: "기록",
          tabBarIcon: ({ color, size }) => (
            <Octicons
              name="history"
              size={size}
              color={isRecordRoute ? "#0AE365" : color}
            />
          ),
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "semibold",
            color: isRecordRoute ? "#0AE365" : "#aaaaaa",
          },
        }}
      />
      <Tabs.Screen name="(record)/record/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
