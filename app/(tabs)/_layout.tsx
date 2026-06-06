import { Tabs } from "expo-router";
import Octicons from '@expo/vector-icons/Octicons';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#f5f5f5',
          borderTopWidth: 1,
          shadowOpacity: 0.1,
          height: 110,
          paddingTop: 10
        },
        tabBarActiveTintColor: '#0AE365',
        tabBarInactiveTintColor: '#aaaaaa',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'semibold',
        },
      }}
    >
      <Tabs.Screen name="(home)/home" options={{
        title: '메인',
        tabBarIcon: ({ color, size }) => (
          <Octicons name="home-fill" size={size} color={color} />
        )
      }} />
      <Tabs.Screen name="(train)/list" options={{
        title: '훈련',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="call" size={size} color={color} />
        )
      }} />
        <Tabs.Screen name="(train)/report" options={{ href: null }} />
      <Tabs.Screen name="(train)/create" options={{ href: null }} />
      <Tabs.Screen name="(record)/record/index" options={{
        title: '기록',
        tabBarIcon: ({ color, size }) => (
          <Octicons name="history" size={size} color={color} />
        )
      }} />
      <Tabs.Screen name="(record)/record/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{
        title: '프로필',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        )
      }} />
    </Tabs>
  );
}