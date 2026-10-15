import { getRingingTrainingCallSchedule } from "@/api/trainingCallApi";
import { getAccessToken } from "@/utils/authTokenStorage";
import { getTrainingCallScenario } from "@/utils/trainingCallScenario";
import { router, usePathname, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/** 앱 복귀와 화면 이동 시 서버 예약을 복구하고 수신 화면을 한 번만 연다. */
export default function ScheduledCallWatcher() {
  const pathname = usePathname();
  const segments = useSegments();
  const isEnabled =
    segments.some((segment) => segment === "(tabs)") || pathname === "/start";
  const openedScheduleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled) return;
    let isActive = true;
    let isChecking = false;
    let controller: AbortController | undefined;

    /** 백그라운드에서는 조회를 멈추고 로그인한 계정의 수신 예약만 확인한다. */
    const checkRinging = async () => {
      if (!isActive || isChecking || AppState.currentState !== "active") return;
      isChecking = true;
      controller = new AbortController();
      try {
        if (!(await getAccessToken()) || !isActive) return;
        const schedule = await getRingingTrainingCallSchedule(
          controller.signal,
        );
        if (!isActive) return;
        if (!schedule) {
          openedScheduleRef.current = null;
          return;
        }
        if (
          schedule.status !== "RINGING" ||
          openedScheduleRef.current === schedule.scheduleId
        )
          return;
        const scenarioId = await getTrainingCallScenario(schedule.scheduleId);
        if (!isActive) return;
        openedScheduleRef.current = schedule.scheduleId;
        if (router.canDismiss()) router.dismissAll();
        router.push({
          pathname: "/train",
          params: {
            scheduleId: String(schedule.scheduleId),
            scenarioId,
            title: scenarioId ? undefined : "예약 훈련",
          },
        });
      } catch {
        // 일시적인 네트워크 오류는 다음 조회 또는 앱 복귀 시 재시도한다.
      } finally {
        isChecking = false;
      }
    };

    void checkRinging();
    const timer = setInterval(() => void checkRinging(), 3000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkRinging();
      else controller?.abort();
    });
    return () => {
      isActive = false;
      controller?.abort();
      clearInterval(timer);
      subscription.remove();
    };
  }, [isEnabled, pathname]);

  return null;
}
