import { createSession } from "@/api/trainApi";
import BottomNav from "@/components/navigation/BottomNav";
import {
  PendingCallProvider,
  usePendingCall,
} from "@/context/PendingCallContext";
import { Tabs, router, usePathname } from "expo-router";
import { useEffect } from "react";
import { SEMANTIC_COLORS } from "@/design-system/colors";

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
  const pathname = usePathname();

  return (
    <PendingCallProvider>
      <CallWatcher />
      <Tabs
        tabBar={(props) => pathname === "/train" ? null : <BottomNav {...props} />}
        screenOptions={{
          headerShown: false,
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
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            title: "프로필",
          }}
        />
      </Tabs>
    </PendingCallProvider>
  );
}
