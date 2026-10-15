import { getRingingTrainingCallSchedule } from "@/api/trainingCallApi";
import { getAccessToken } from "@/utils/authTokenStorage";
import { getTrainingCallScenario, pruneExpiredTrainingCallScenarios } from "@/utils/trainingCallScenario";
import { subscribeTrainingCallUpdates } from "@/utils/trainingCallEvents";
import { router, usePathname, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

const POLL_INTERVAL_MS = 15_000;

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
    let shouldCheckAgain = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;

    /** 화면과 앱이 모두 활성 상태일 때만 수신 화면을 열 수 있다. */
    const canCheck = () => isActive && AppState.currentState === "active";

    /** 백그라운드에서는 조회를 멈추고 로그인한 계정의 수신 예약만 확인한다. */
    const checkRinging = async () => {
      if (!canCheck()) return;
      if (isChecking) {
        shouldCheckAgain = true;
        return;
      }
      isChecking = true;
      shouldCheckAgain = false;
      controller = new AbortController();
      try {
        if (!(await getAccessToken()) || !canCheck()) return;
        const schedule = await getRingingTrainingCallSchedule(
          controller.signal,
        );
        if (!canCheck()) return;
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
        if (!canCheck()) return;
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
        if (shouldCheckAgain && canCheck()) void checkRinging();
      }
    };

    /** 푸시 미지원 기기도 복구할 수 있게 활성 상태에서만 느린 폴링을 병행한다. */
    const startPolling = () => {
      if (timer !== undefined) clearInterval(timer);
      if (!canCheck()) return;
      void checkRinging();
      timer = setInterval(() => void checkRinging(), POLL_INTERVAL_MS);
    };

    void pruneExpiredTrainingCallScenarios().catch(() => {});
    startPolling();
    const unsubscribePush = subscribeTrainingCallUpdates(() => void checkRinging());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") startPolling();
      else {
        if (timer !== undefined) clearInterval(timer);
        timer = undefined;
        controller?.abort();
      }
    });
    return () => {
      isActive = false;
      controller?.abort();
      clearInterval(timer);
      unsubscribePush();
      subscription.remove();
    };
  }, [isEnabled]);

  return null;
}
