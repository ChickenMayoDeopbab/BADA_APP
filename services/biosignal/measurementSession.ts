import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";

import type { BiosignalUploadRequest, PhoneTimeRange } from "@/api/types";
import {
  ackWatchMeasurement,
  addWatchDataListener,
  addWatchStatusListener,
  cancelWatchMeasurement,
  startWatchMeasurement,
  stopWatchMeasurement,
  type WatchDataEvent,
  type WatchStatusEvent,
} from "@/utils/wearBiosignal";

import {
  buildBiosignalUploadBody,
  estimateWatchMinusPhoneMs,
  parseWatchSessionFile,
  type ClockSample,
  type WatchSessionFile,
} from "./uploadBody";
import { clearBiosignalUploads, flushBiosignalUploads, saveBiosignalUpload } from "./uploadQueue";

/** 통화를 끊고 이 시간 동안 회복 구간을 잰다. 불안 점수 화면을 먼저 떠나면 그때 멈춘다. */
const RECOVERY_MS = 60_000;
/** stop을 보내고 이 시간 안에 세션 파일이 오지 않으면 다시 요청한다. 워치는 받을 때까지 파일을 보관한다. */
const FILE_WAIT_MS = 30_000;
const MAX_FILE_REQUESTS = 3;

/** 통화 한 번의 측정. 시각은 모두 폰 ms */
interface Measurement {
  id: string; // 워치 측정 id. 예약 발신은 수락 전에 측정을 시작하므로 세션 id와 따로 만든다
  sessionId: string | null;
  restStartMs: number | null;
  restEndMs: number | null;
  ringingMs: number | null;
  meditationStartMs: number | null;
  meditationEndMs: number | null;
  phoneWsOpenMs: number | null;
  phoneCallEndMs: number | null;
  recoveryEndMs: number | null;
  clockSamples: ClockSample[];
  fileRequestCount: number;
  timer?: ReturnType<typeof setTimeout>; // 회복 종료 또는 파일 재요청
}

/** 통화 전·통화 중·회복 중인 측정. 한 번에 하나만 잰다. */
let activeMeasurement: Measurement | null = null;
/** 측정을 멈추고 세션 파일을 기다리는 측정 */
const waitingMeasurements = new Map<string, Measurement>();
let hasWatchListeners = false;

const createMeasurement = (sessionId: string | null): Measurement => ({
  id: randomUUID(),
  sessionId,
  restStartMs: null,
  restEndMs: null,
  ringingMs: null,
  meditationStartMs: null,
  meditationEndMs: null,
  phoneWsOpenMs: null,
  phoneCallEndMs: null,
  recoveryEndMs: null,
  clockSamples: [],
  fileRequestCount: 0,
});

const toRange = (start: number | null, end: number | null): PhoneTimeRange | null =>
  start !== null && end !== null ? [start, end] : null;

/** 워치가 보내는 상태로 시계 차이 표본을 모으고, 측정을 시작하지 못했다는 오류면 이 통화는 측정 없이 진행한다. */
function handleWatchStatus(event: WatchStatusEvent): void {
  const sample: ClockSample = { watchMs: event.watchMs, phoneReceivedMs: event.phoneReceivedMs };
  activeMeasurement?.clockSamples.push(sample);
  waitingMeasurements.forEach((measurement) => measurement.clockSamples.push(sample));
  if (event.state === "error" && event.id === activeMeasurement?.id) {
    // 권한·센서·백그라운드 시작 제한으로 측정이 시작되지 않았다.
    cancelBiosignalMeasurement();
  }
}

/** 측정 기록과 통화 시각으로 업로드 본문을 만든다. 필요한 시각이 빠졌거나 시계 차이를 알 수 없으면 null. */
function createUploadBody(
  measurement: Measurement,
  watchFile: WatchSessionFile,
  phoneReceivedMs: number,
): BiosignalUploadRequest | null {
  const { ringingMs, phoneWsOpenMs, phoneCallEndMs, recoveryEndMs } = measurement;
  // auth를 보내지 못한 통화는 서버에 사건표가 없어 업로드가 거절된다(409 NO_TIMELINE).
  if (ringingMs === null || phoneWsOpenMs === null || phoneCallEndMs === null || recoveryEndMs === null) {
    return null;
  }
  const watchMinusPhoneMs = estimateWatchMinusPhoneMs([
    ...measurement.clockSamples,
    { watchMs: watchFile.watchSentMs, phoneReceivedMs },
  ]);
  if (watchMinusPhoneMs === null) return null;
  return buildBiosignalUploadBody(watchFile, {
    phoneWsOpenMs,
    phoneCallEndMs,
    ringingMs,
    restBaseline: toRange(measurement.restStartMs, measurement.restEndMs),
    meditation: toRange(measurement.meditationStartMs, measurement.meditationEndMs),
    recoveryEndMs,
  }, watchMinusPhoneMs);
}

/**
 * 워치 세션 파일을 받으면 업로드 본문을 만들어 기기에 저장하고 워치에 받았다고 알린다.
 * 기다리는 측정이 아니면(취소했거나 앱이 다시 시작됨) 올리지 않고 버린다.
 */
async function handleWatchData(event: WatchDataEvent): Promise<void> {
  const measurement = waitingMeasurements.get(event.id);
  waitingMeasurements.delete(event.id);
  clearTimeout(measurement?.timer);
  const file = new File(event.uri);
  try {
    if (measurement?.sessionId) {
      const watchFile = parseWatchSessionFile(await file.text());
      const body = watchFile?.id === measurement.id
        ? createUploadBody(measurement, watchFile, event.phoneReceivedMs)
        : null;
      if (body) saveBiosignalUpload(measurement.sessionId, body);
    }
  } catch {
    // 읽거나 저장하지 못한 기록은 다시 받을 방법이 없어 버린다.
  } finally {
    void ackWatchMeasurement(event.id);
    try {
      if (file.exists) file.delete();
    } catch {
      // 지우지 못한 파일은 네이티브 모듈이 24시간 뒤 지운다.
    }
  }
  if (measurement) void flushBiosignalUploads();
}

function ensureWatchListeners(): void {
  if (hasWatchListeners) return;
  hasWatchListeners = true;
  addWatchStatusListener(handleWatchStatus);
  addWatchDataListener((event) => void handleWatchData(event));
}

/** 워치에 측정 종료와 파일 전송을 요청한다. 파일이 오지 않으면 몇 번 더 요청한 뒤 포기한다. */
function requestWatchFile(measurement: Measurement): void {
  measurement.fileRequestCount++;
  void stopWatchMeasurement(measurement.id);
  measurement.timer = setTimeout(() => {
    if (waitingMeasurements.get(measurement.id) !== measurement) return;
    if (measurement.fileRequestCount >= MAX_FILE_REQUESTS) {
      waitingMeasurements.delete(measurement.id);
      return;
    }
    requestWatchFile(measurement);
  }, FILE_WAIT_MS);
}

/**
 * 워치 측정을 시작한다. 워치에 명령을 보내지 못했거나 시작하는 동안 취소되면 false.
 * 이전 측정이 통화 전·중에 남아 있으면 버린다.
 */
export async function startBiosignalMeasurement(sessionId: string | null): Promise<boolean> {
  ensureWatchListeners();
  cancelBiosignalMeasurement();
  const measurement = createMeasurement(sessionId);
  activeMeasurement = measurement;
  const isStarted = await startWatchMeasurement(measurement.id);
  if (activeMeasurement !== measurement) return false;
  if (!isStarted) activeMeasurement = null;
  return isStarted;
}

/** 측정 중이고 통화가 아직 끝나지 않았는지. 통화 WS에 biosignal_intent를 보낼지 정한다. */
export const isBiosignalMeasuring = (): boolean =>
  activeMeasurement !== null && activeMeasurement.phoneCallEndMs === null;

/** 통화 전 휴식 화면이 뜬 시각 */
export function markBiosignalRestStart(): void {
  if (activeMeasurement) activeMeasurement.restStartMs = Date.now();
}

/** 휴식이 끝났거나 건너뛴 시각 */
export function markBiosignalRestEnd(): void {
  if (activeMeasurement?.restStartMs != null) activeMeasurement.restEndMs ??= Date.now();
}

/** 수신 화면이 뜬 시각 */
export function markBiosignalRinging(): void {
  if (activeMeasurement) activeMeasurement.ringingMs ??= Date.now();
}

export function markBiosignalMeditationStart(): void {
  if (activeMeasurement) activeMeasurement.meditationStartMs ??= Date.now();
}

export function markBiosignalMeditationEnd(): void {
  if (activeMeasurement?.meditationStartMs != null) activeMeasurement.meditationEndMs ??= Date.now();
}

/** 측정을 올릴 통화 세션을 정한다. 예약 발신은 수락한 뒤에 세션이 생긴다. */
export function attachBiosignalSession(sessionId: string): void {
  if (activeMeasurement) activeMeasurement.sessionId = sessionId;
}

/** 통화 WS에 auth를 보낸 시각. 연결할 때마다 덮어쓴다. */
export function markBiosignalWsAuthSent(phoneMs: number): void {
  if (activeMeasurement) activeMeasurement.phoneWsOpenMs = phoneMs;
}

/** 통화가 끝난 시각(end를 보냈거나 받은 시각). 회복 구간을 재기 시작한다. */
export function markBiosignalCallEnd(phoneMs: number = Date.now()): void {
  const measurement = activeMeasurement;
  if (!measurement || measurement.phoneCallEndMs !== null) return;
  measurement.phoneCallEndMs = phoneMs;
  measurement.timer = setTimeout(finishBiosignalRecovery, RECOVERY_MS);
}

/** 회복 구간을 끝내고 측정을 멈춘다. 통화를 끊고 60초가 지나거나 불안 점수 화면을 떠나면 부른다. */
export function finishBiosignalRecovery(): void {
  const measurement = activeMeasurement;
  if (!measurement || measurement.phoneCallEndMs === null) return;
  clearTimeout(measurement.timer);
  activeMeasurement = null;
  measurement.recoveryEndMs = Date.now();
  waitingMeasurements.set(measurement.id, measurement);
  requestWatchFile(measurement);
}

/** 측정을 버린다. 워치도 기록을 지운다(거절·통화 미시작·측정 시작 실패). */
export function cancelBiosignalMeasurement(): void {
  const measurement = activeMeasurement;
  if (!measurement) return;
  activeMeasurement = null;
  clearTimeout(measurement.timer);
  void cancelWatchMeasurement(measurement.id);
}

/** 통화가 끝나기 전에 통화 화면을 떠나면 측정을 버린다. 끝난 통화의 회복 측정은 그대로 둔다. */
export function cancelBiosignalMeasurementBeforeCallEnd(): void {
  if (activeMeasurement && activeMeasurement.phoneCallEndMs === null) cancelBiosignalMeasurement();
}

/** 로그아웃·탈퇴 때 진행 중인 측정, 받을 파일, 기기에 남은 업로드를 모두 버린다. */
export function discardBiosignalData(): void {
  cancelBiosignalMeasurement();
  waitingMeasurements.forEach((measurement) => {
    clearTimeout(measurement.timer);
    void cancelWatchMeasurement(measurement.id);
  });
  waitingMeasurements.clear();
  clearBiosignalUploads();
}
