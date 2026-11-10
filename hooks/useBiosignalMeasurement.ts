import { getLegalConsentStatus } from "@/api/legalConsentApi";
import { useAppAlert } from "@/context/AppAlertContext";
import { askBiosignalConsent } from "@/hooks/useBiosignalConsentGuard";
import {
  attachBiosignalSession,
  cancelBiosignalMeasurement,
  cancelBiosignalMeasurementBeforeCallEnd,
  markBiosignalRestEnd,
  markBiosignalRestStart,
  markBiosignalRinging,
  startBiosignalMeasurement,
} from "@/services/biosignal/measurementSession";
import {
  isBiosignalSupported,
  loadIsCallConsentAsked,
  loadIsRestBaselineNeeded,
  saveCallConsentAsked,
} from "@/utils/biosignalSettings";
import { getWatchConnection } from "@/utils/wearBiosignal";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

/** 수신 화면 전 단계. checking: 측정 조건 확인 중, rest: 통화 전 휴식, ready: 수신 화면 */
export type BiosignalCallPhase = "checking" | "rest" | "ready";

type ShowAlert = ReturnType<typeof useAppAlert>["showAlert"];

/**
 * 이 통화를 잴 수 있는지 확인한다. 측정 앱이 깔린 워치가 연결돼 있고 생체신호 처리에 동의했어야 한다.
 * 동의가 없으면 이 기기에서 처음 한 번만 동의 팝업을 띄운다. 확인하지 못하면 측정 없이 통화한다.
 */
async function canMeasureCall(showAlert: ShowAlert): Promise<boolean> {
  if (!(await getWatchConnection()).isConnected) return false;
  const status = await getLegalConsentStatus();
  if (status.biosignalAgreed) return true;
  if (await loadIsCallConsentAsked()) return false;
  await saveCallConsentAsked();
  return askBiosignalConsent(showAlert, status);
}

interface UseBiosignalMeasurementProps {
  isEnabled: boolean; // 즉시·예약 발신만 잰다(워밍업 제외)
  sessionId: string | null; // 예약 발신은 수락한 뒤에 생긴다
}

/**
 * 통화 화면에 들어오면 워치 측정을 준비한다.
 * 잴 수 있으면 측정을 시작하고, 기준선이 필요하면 수신 화면 전에 휴식 단계를 둔다.
 * 통화가 끝나기 전에 화면을 떠나면 측정을 버린다.
 */
export function useBiosignalMeasurement({ isEnabled, sessionId }: UseBiosignalMeasurementProps) {
  const { showAlert } = useAppAlert();
  const isAvailable = isEnabled && isBiosignalSupported;
  const [phase, setPhase] = useState<BiosignalCallPhase>(isAvailable ? "checking" : "ready");
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  useEffect(() => {
    if (sessionId) attachBiosignalSession(sessionId);
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (!isAvailable) {
        setPhase("ready");
        return;
      }
      setPhase("checking");

      /** 측정 조건 확인 → 측정 시작 → 휴식 또는 수신 화면 */
      const prepare = async () => {
        const canMeasure = await canMeasureCall(showAlert).catch(() => false);
        if (!isActive) return;
        const isRestNeeded = canMeasure && (await loadIsRestBaselineNeeded());
        if (!isActive) return;
        const isStarted = canMeasure && (await startBiosignalMeasurement(sessionIdRef.current));
        if (!isActive) {
          if (isStarted) cancelBiosignalMeasurement();
          return;
        }
        if (isStarted && isRestNeeded) {
          markBiosignalRestStart();
          setPhase("rest");
          return;
        }
        if (isStarted) markBiosignalRinging();
        setPhase("ready");
      };
      void prepare().catch(() => {
        // 측정 준비가 실패해도 통화는 측정 없이 이어간다.
        if (isActive) setPhase("ready");
      });

      return () => {
        isActive = false;
        cancelBiosignalMeasurementBeforeCallEnd();
      };
    }, [isAvailable, showAlert]),
  );

  /** 휴식을 마쳤거나 건너뛰면 수신 화면을 띄운다. */
  const finishRest = useCallback(() => {
    markBiosignalRestEnd();
    markBiosignalRinging();
    setPhase("ready");
  }, []);

  return { phase, finishRest };
}
