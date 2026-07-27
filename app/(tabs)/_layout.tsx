import { Tabs, router } from "expo-router";
import Octicons from '@expo/vector-icons/Octicons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from "react";
import { createSession } from "@/api/trainApi";
import { PendingCallProvider, usePendingCall } from "@/context/PendingCallContext";

/** 발신 예약 타이머 감시 — 예약된 시각이 되면 세션을 생성하고 훈련 화면으로 이동 */
function CallWatcher() {
  const { pendingCall, cancel } = usePendingCall();

  useEffect(() => {
    if (!pendingCall.config || !pendingCall.callAt) return;

    const config = pendingCall.config;
    const remaining = pendingCall.callAt - Date.now();

    const fire = async () => {
      cancel();
      try {
        const session = await createSession(config);
        router.push({
          pathname: "/(tabs)/(train)/train",
          params: {
            sessionId: session.sessionId,
            wsUrl: session.wsUrl,
            scenarioId: config.scenarioId,
            isWarmup: config.type === "WARMUP" ? "true" : undefined,
          },
        });
      } catch {
        // 세션 생성 실패 시 조용히 무시
      }
    };

    if (remaining <= 0) {
      fire();
      return;
    }

    const timeout = setTimeout(fire, remaining);
    return () => clearTimeout(timeout);
  }, [pendingCall, cancel]);

  return null;
}

export default function TabLayout() {
  return (
    <PendingCallProvider>
      <CallWatcher />
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
        <Tabs.Screen name="(train)/detail/[id]" options={{ href: null }} />
        <Tabs.Screen name="(train)/start" options={{ href: null }} />
        <Tabs.Screen name="(train)/train" options={{ href: null, tabBarStyle: { display: "none" } }} />
        <Tabs.Screen name="(train)/warmup" options={{ href: null }} />
        <Tabs.Screen name="(train)/warmup-start" options={{ href: null }} />
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
    </PendingCallProvider>
  );
}
