import { getBiosignalReport } from "@/api/biosignalApi";
import { buildBiosignalReportView } from "@/utils/biosignalReport";
import {
  isBiosignalSupported,
  loadBiosignalReportEnabled,
  saveLastBaselineSource,
} from "@/utils/biosignalSettings";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";

/** 업로드를 기다리는 동안 다시 조회하는 간격 */
const POLL_INTERVAL_MS = 5_000;
/**
 * 약 5분. 리포트는 회복 측정이 끝난 직후 열리고, 그 뒤 워치 파일 재요청(최대 90초)과 업로드(timeout 120초)가 이어진다.
 * 가장 늦는 경우도 덮고, 그래도 없으면 카드를 띄우지 않는다.
 */
const MAX_POLLS = 60;
/** 네트워크 오류·5xx만 다시 시도한다. 404(측정 안 한 통화)·403은 다시 물어도 같다. */
const MAX_RETRIES = 2;

const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < MAX_RETRIES &&
  isAxiosError(error) &&
  (error.response === undefined || error.response.status >= 500);

/**
 * 통화의 '몸의 반응' 카드 내용을 불러온다. Android에서 '몸 반응 리포트' 설정을 켰을 때만 조회한다.
 * 업로드가 아직이면(AWAITING_DATA) 간격을 두고 다시 묻는다. 보여 줄 것이 없으면 null.
 */
export function useBiosignalReport({
  sessionId,
  isEnabled,
}: {
  sessionId: string | undefined;
  isEnabled: boolean; // 시나리오 훈련만(워밍업은 측정하지 않는다)
}) {
  const [isReportEnabled, setIsReportEnabled] = useState(false);

  useEffect(() => {
    if (!isEnabled || !isBiosignalSupported) return;
    let isActive = true;
    void loadBiosignalReportEnabled().then((value) => {
      if (isActive) setIsReportEnabled(value);
    });
    return () => {
      isActive = false;
    };
  }, [isEnabled]);

  const { data } = useQuery({
    queryKey: ["biosignalReport", sessionId],
    queryFn: async () => {
      const report = await getBiosignalReport(sessionId as string);
      // 업로드 응답을 놓친 경우(409 ALREADY_ANALYZED)에도 다음 통화의 휴식 필요 여부를 맞춘다.
      const source = report.metrics?.cardiac?.baseline?.source;
      if (report.status === "ANALYZED" && source) {
        await saveLastBaselineSource(source).catch(() => undefined);
      }
      return report;
    },
    enabled: isEnabled && isBiosignalSupported && isReportEnabled && !!sessionId,
    retry: shouldRetry,
    refetchInterval: (query) =>
      query.state.data?.status === "AWAITING_DATA" && query.state.dataUpdateCount < MAX_POLLS
        ? POLL_INTERVAL_MS
        : false,
  });

  return useMemo(() => buildBiosignalReportView(data), [data]);
}
