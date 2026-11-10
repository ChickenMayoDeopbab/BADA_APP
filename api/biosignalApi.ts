import aiApiClient from "./aiClient";
import { BiosignalReportResponse, BiosignalUploadRequest } from "./types";

/** 같은 통화의 업로드가 겹치면 서버가 앞 요청이 끝날 때까지 뒤 요청을 기다리게 하므로 기본보다 길게 잡는다. */
const BIOSIGNAL_UPLOAD_TIMEOUT_MS = 120_000;

/** 통화 생체신호 업로드와 분석 (AI 서버). 성공 응답은 조회 API와 같다. */
export const uploadBiosignals = async (
  sessionId: string,
  data: BiosignalUploadRequest,
): Promise<BiosignalReportResponse> => {
  const response = await aiApiClient.post<BiosignalReportResponse>(
    `/api/v1/biosignals/${sessionId}`,
    data,
    { timeout: BIOSIGNAL_UPLOAD_TIMEOUT_MS },
  );
  return response.data;
};

/** 통화 생체신호 분석 결과 조회 (AI 서버). 기록이 없으면 404, 남의 기록이면 403 */
export const getBiosignalReport = async (
  sessionId: string,
): Promise<BiosignalReportResponse> => {
  const response = await aiApiClient.get<BiosignalReportResponse>(
    `/api/v1/biosignals/${encodeURIComponent(sessionId)}`,
  );
  return response.data;
};
