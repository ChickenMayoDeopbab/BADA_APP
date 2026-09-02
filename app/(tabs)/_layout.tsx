import { createSession } from "@/api/trainApi";
import BottomNav from "@/components/navigation/BottomNav";
import { usePendingCall } from "@/context/PendingCallContext";
import { Tabs, router, usePathname, useSegments } from "expo-router";
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
        /*
          예약 발신은 사용자가 어디에 있든 걸려온다. 시나리오 상세처럼 모달로 열린
          화면이 남아 있으면 통화 화면 위를 덮으므로, 세션을 얻은 뒤 현재 스택을 비운다.
          훈련이 끝나면 리포트를 거쳐 훈련 목록으로 가므로 스택을 되돌릴 일도 없다.
        */
        if (router.canDismiss()) router.dismissAll();
        router.push({
          pathname: "/train",
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
  const segments = useSegments();
  const isCommunityStack = segments.some(
    (segment) => segment === "(community)",
  );
  const currentRoute = segments[segments.length - 1];
  const isCommunityRoot =
    currentRoute === "(community)" || currentRoute === "community";
  const hideTabBar =
    pathname.endsWith("/search") || (isCommunityStack && !isCommunityRoot);

  return (
    <>
      <CallWatcher />
      <Tabs
        tabBar={(props) => (hideTabBar ? null : <BottomNav {...props} />)}
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
            popToTopOnBlur: true,
          }}
        />
      </Tabs>
    </>
  );
}
