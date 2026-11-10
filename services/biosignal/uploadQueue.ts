import { Directory, File, Paths } from "expo-file-system";

import { uploadBiosignals } from "@/api/biosignalApi";
import { getApiErrorStatus } from "@/api/error";
import type { BiosignalReportResponse, BiosignalUploadRequest } from "@/api/types";
import { getAccessToken } from "@/utils/authTokenStorage";
import { saveLastBaselineSource } from "@/utils/biosignalSettings";

import { withoutPpg } from "./uploadBody";

/**
 * 통화가 끝나고 이 시간이 지나면 서버가 받지 않는다(409 EXPIRED). 기기에서도 지운다.
 * 기기 시계(epoch ms)로 재므로 시간대가 바뀌어도 영향이 없다. 시계를 뒤로 돌려 남은 본문은 서버가 409로 거절해 지워지고,
 * 앞으로 돌리면 조금 일찍 지워질 수 있다. 측정 기록을 기기에 오래 두지 않는 것을 우선한다.
 */
const UPLOAD_RETENTION_MS = 24 * 60 * 60 * 1000;
/** 세션 id를 파일 이름으로 쓰므로 영문·숫자·-·_만 받는다(워치 측정 id 규칙과 같다). */
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** 업로드 실패 응답의 처리 */
export type UploadFailureAction = "discard" | "retryLater" | "retryWithoutPpg";

interface PendingUpload {
  sessionId: string;
  body: BiosignalUploadRequest;
}

const getUploadDirectory = () => new Directory(Paths.document, "biosignal-upload");

/**
 * 업로드 실패를 어떻게 처리할지 정한다.
 * 네트워크 오류·서버 일시 장애·토큰 갱신 실패는 보관했다가 다시 보낸다.
 * 동의 없음(403)·기능 꺼짐(404)·이미 분석했거나 받을 수 없는 통화(409)·형식 오류(422)는
 * 다시 보내도 받지 않으므로 기기에서 지운다.
 */
export function resolveUploadFailure(status: number | undefined): UploadFailureAction {
  if (status === undefined || status === 401 || status === 408 || status === 429 || status >= 500) {
    return "retryLater";
  }
  if (status === 413) return "retryWithoutPpg";
  return "discard";
}

/** 업로드할 본문을 기기에 저장한다. 같은 통화를 다시 저장하면 덮어쓴다. */
export function saveBiosignalUpload(sessionId: string, body: BiosignalUploadRequest): void {
  if (!SESSION_ID_PATTERN.test(sessionId)) throw new Error("INVALID_SESSION_ID");
  const directory = getUploadDirectory();
  directory.create({ idempotent: true, intermediates: true });
  writePendingUpload(new File(directory, `${sessionId}.json`), { sessionId, body });
}

/** 기기에 남은 업로드를 모두 지운다. 로그아웃하면 다른 계정으로 보내지 않도록 부른다. */
export function clearBiosignalUploads(): void {
  const directory = getUploadDirectory();
  if (directory.exists) directory.delete();
}

let runningFlush: Promise<void> | null = null;
let shouldFlushAgain = false; // 보내는 중에 새 업로드가 저장됐으면 한 번 더 돈다

/** 기기에 저장된 업로드를 모두 보낸다. 이미 보내는 중이면 겹쳐 보내지 않고 그 작업이 끝난 뒤 한 번 더 돈다. */
export function flushBiosignalUploads(): Promise<void> {
  if (runningFlush) {
    shouldFlushAgain = true;
    return runningFlush;
  }
  runningFlush = (async () => {
    try {
      do {
        shouldFlushAgain = false;
        await sendPendingUploads();
      } while (shouldFlushAgain);
    } catch {
      // 파일을 읽지 못하는 등 예상하지 못한 오류는 다음 앱 시작·복귀 때 다시 시도한다.
    } finally {
      runningFlush = null;
    }
  })();
  return runningFlush;
}

/** 로그인한 계정으로만 보낸다. 토큰 없이 보내면 401 처리에서 로그인 화면으로 이동하게 된다. */
async function sendPendingUploads(): Promise<void> {
  const directory = getUploadDirectory();
  if (!directory.exists || !(await getAccessToken())) return;
  for (const entry of directory.list()) {
    if (entry instanceof File && entry.name.endsWith(".json")) await sendPendingUpload(entry);
  }
}

/** 저장된 업로드 하나를 보낸다. 성공하거나 다시 보낼 수 없으면 파일을 지운다. */
async function sendPendingUpload(file: File): Promise<void> {
  const pending = parsePendingUpload(await file.text().catch(() => ""));
  if (!pending || Date.now() - pending.body.clock.phone_call_end_ms > UPLOAD_RETENTION_MS) {
    deleteFile(file);
    return;
  }

  let { body } = pending;
  for (;;) {
    try {
      const report = await uploadBiosignals(pending.sessionId, body);
      await rememberBaselineSource(report);
      deleteFile(file);
      return;
    } catch (error) {
      const status = getApiErrorStatus(error);
      const action = resolveUploadFailure(status);
      if (action === "retryLater") return;
      if (action === "retryWithoutPpg" && body.ppg.length > 0) {
        body = withoutPpg(body);
        writePendingUpload(file, { sessionId: pending.sessionId, body });
        continue;
      }
      if (status === 422) {
        // 본문 형식이 서버 규격과 다르다는 뜻이라 앱 버그로 남긴다.
        console.warn("[biosignal] upload rejected as invalid", (error as { response?: { data?: unknown } }).response?.data);
      }
      deleteFile(file);
      return;
    }
  }
}

/** 분석 결과의 기준선 출처를 기억해 다음 통화에 휴식 화면이 필요한지 정한다. 저장 실패는 업로드 성공에 영향을 주지 않는다. */
async function rememberBaselineSource(report: BiosignalReportResponse): Promise<void> {
  const source = report.metrics?.cardiac?.baseline?.source;
  if (source) await saveLastBaselineSource(source).catch(() => undefined);
}

function parsePendingUpload(text: string): PendingUpload | null {
  try {
    const value = JSON.parse(text) as Partial<PendingUpload> | null;
    if (
      typeof value?.sessionId === "string" &&
      SESSION_ID_PATTERN.test(value.sessionId) &&
      typeof value.body?.clock?.phone_call_end_ms === "number" &&
      Array.isArray(value.body.ppg)
    ) {
      return value as PendingUpload;
    }
  } catch {
    // 쓰다 만 파일은 보낼 수 없으므로 지운다.
  }
  return null;
}

const writePendingUpload = (file: File, pending: PendingUpload) => file.write(JSON.stringify(pending));

const deleteFile = (file: File) => {
  if (file.exists) file.delete();
};
