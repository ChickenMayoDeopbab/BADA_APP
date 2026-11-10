import type {
  BiosignalDevice,
  BiosignalPpgBatch,
  BiosignalRow,
  BiosignalUploadRequest,
  PhoneTimeRange,
} from "@/api/types";

const MAX_CLOCK_OFFSET_MS = 24 * 60 * 60 * 1000; // 서버가 받는 워치−폰 시계 차이 한도(±1일)
const MIN_REST_BASELINE_MS = 2 * 60 * 1000; // 서버가 앞 60초를 버리므로 이보다 짧은 휴식은 기준선이 되지 않는다
const MAX_ROWS = 7_200; // hr·eda·skin_temp·acc 행 수 한도
const MAX_IBI_ROWS = 15_000;
const MAX_PPG_BATCHES = 200;
const MAX_PPG_SAMPLES = 30_000;
const MIN_PPG_BATCH_MS = 4_000;
const MAX_DEVICE_MODEL_LENGTH = 64;
const MAX_DEVICE_SDK_LENGTH = 32;

/** 서버 본문 한도 900KB. 본문은 숫자와 ASCII 키라 글자 수를 바이트 수로 본다. */
export const MAX_UPLOAD_BODY_LENGTH = 900_000;

/** 워치가 보낸 세션 파일(watch/의 SessionRecorder). 신호 배열은 거르지 않은 원본이다. */
export interface WatchSessionFile {
  id: string;
  watchSentMs: number; // 워치가 파일을 보낸 시각(워치 ms)
  device: BiosignalDevice | null;
  hr: unknown[];
  ibi: unknown[];
  eda: unknown[];
  skinTemp: unknown[];
  acc: unknown[];
  ppg: unknown[];
}

/** 업로드 본문에 넣을 통화 시각. 모두 폰 시계 epoch ms다. */
export interface BiosignalCallTimes {
  phoneWsOpenMs: number; // 통화 WS에 auth를 보낸 시각
  phoneCallEndMs: number;
  ringingMs: number; // 수신 화면이 뜬 시각
  restBaseline: PhoneTimeRange | null;
  meditation: PhoneTimeRange | null;
  recoveryEndMs: number; // 측정을 멈춘 시각
}

/** 워치가 보낸 시각(워치 ms)과 폰이 받은 시각(폰 ms) 한 쌍 */
export interface ClockSample {
  watchMs: number;
  phoneReceivedMs: number;
}

/** 워치 ms 기준 전송 구간 */
interface WatchTimeWindow {
  start: number;
  end: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** 기기 정보가 없거나 형식이 다르면 null, 길면 서버 한도에 맞춰 자른다. */
function parseDevice(value: unknown): BiosignalDevice | null {
  if (!isRecord(value) || typeof value.model !== "string" || typeof value.sdk !== "string") {
    return null;
  }
  return {
    model: value.model.slice(0, MAX_DEVICE_MODEL_LENGTH),
    sdk: value.sdk.slice(0, MAX_DEVICE_SDK_LENGTH),
  };
}

/** 워치 세션 파일을 읽는다. JSON이 아니거나 id·송신 시각이 없으면 null. 신호 배열이 없으면 빈 배열로 본다. */
export function parseWatchSessionFile(text: string): WatchSessionFile | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.id !== "string" || !isFiniteNumber(value.watch_sent_ms)) {
    return null;
  }
  return {
    id: value.id,
    watchSentMs: value.watch_sent_ms,
    device: parseDevice(value.device),
    hr: toArray(value.hr),
    ibi: toArray(value.ibi),
    eda: toArray(value.eda),
    skinTemp: toArray(value.skin_temp),
    acc: toArray(value.acc),
    ppg: toArray(value.ppg),
  };
}

/**
 * 워치 시각 − 폰 시각을 구한다. 표본마다 (워치 송신 시각 − 폰 수신 시각)을 재고 최댓값을 쓴다.
 * 전송 지연만큼 값이 작아지므로 지연이 가장 짧았던 표본이 실제 차이에 가장 가깝다.
 * 표본이 없거나 차이가 ±1일을 넘으면 서버가 받지 않으므로 null.
 */
export function estimateWatchMinusPhoneMs(samples: ClockSample[]): number | null {
  let offset: number | null = null;
  for (const { watchMs, phoneReceivedMs } of samples) {
    if (!isFiniteNumber(watchMs) || !isFiniteNumber(phoneReceivedMs)) continue;
    const sampleOffset = watchMs - phoneReceivedMs;
    offset = offset === null ? sampleOffset : Math.max(offset, sampleOffset);
  }
  if (offset === null || Math.abs(offset) > MAX_CLOCK_OFFSET_MS) return null;
  return offset;
}

const isRow = (value: unknown): value is BiosignalRow =>
  Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);

/** 전송 구간 안에 있고 값 규칙을 지키는 행만 앞에서부터 한도까지 고른다. */
function pickRows(
  rows: unknown[],
  window: WatchTimeWindow,
  limit: number,
  isValid: (value: number, status: number) => boolean,
): BiosignalRow[] {
  const picked: BiosignalRow[] = [];
  for (const row of rows) {
    if (picked.length >= limit) break;
    if (!isRow(row)) continue;
    const [watchMs, value, status] = row;
    if (watchMs < window.start || watchMs > window.end || !isValid(value, status)) continue;
    picked.push([watchMs, value, status]);
  }
  return picked;
}

/** PPG 묶음에서 전송 구간 밖 표본을 잘라 낸다. 남은 길이가 4초보다 짧거나 형식이 다르면 null. */
function trimPpgBatch(value: unknown, window: WatchTimeWindow): BiosignalPpgBatch | null {
  if (!isRecord(value) || !isFiniteNumber(value.t0) || !isFiniteNumber(value.hz)) return null;
  const { t0, hz, green } = value;
  if (hz < 10 || hz > 200 || !Array.isArray(green) || !green.every(isFiniteNumber)) return null;

  const periodMs = 1000 / hz;
  const firstIndex = Math.max(0, Math.ceil((window.start - t0) / periodMs));
  const lastIndex = Math.min(green.length - 1, Math.floor((window.end - t0) / periodMs));
  const sampleCount = lastIndex - firstIndex + 1;
  if (sampleCount * periodMs < MIN_PPG_BATCH_MS) return null;

  return {
    t0: Math.round(t0 + firstIndex * periodMs),
    hz,
    green: green.slice(firstIndex, lastIndex + 1),
  };
}

/** 구간에 맞춰 자른 PPG 묶음을 앞에서부터 묶음 수·표본 수 한도까지 고른다. */
function pickPpg(batches: unknown[], window: WatchTimeWindow): BiosignalPpgBatch[] {
  const picked: BiosignalPpgBatch[] = [];
  let sampleCount = 0;
  for (const value of batches) {
    const batch = trimPpgBatch(value, window);
    if (!batch) continue;
    if (picked.length >= MAX_PPG_BATCHES || sampleCount + batch.green.length > MAX_PPG_SAMPLES) break;
    picked.push(batch);
    sampleCount += batch.green.length;
  }
  return picked;
}

/** 본문에서 PPG를 뺀다. 본문이 너무 크면(413) PPG 없이 다시 보낸다. */
export const withoutPpg = (body: BiosignalUploadRequest): BiosignalUploadRequest => ({
  ...body,
  ppg: [],
});

/**
 * 워치 세션 파일과 통화 시각으로 업로드 본문을 만든다.
 * 휴식 시작(2분 미만 휴식은 휴식 없음으로 보고 수신 화면)부터 측정 종료까지의 행만 보내고,
 * 서버 값 규칙에 맞지 않는 행은 뺀다. 본문이 한도를 넘으면 PPG를 뺀다.
 */
export function buildBiosignalUploadBody(
  file: WatchSessionFile,
  times: BiosignalCallTimes,
  watchMinusPhoneMs: number,
): BiosignalUploadRequest {
  const rest = times.restBaseline;
  const restBaseline = rest && rest[1] - rest[0] >= MIN_REST_BASELINE_MS ? rest : null;
  const window: WatchTimeWindow = {
    start: (restBaseline?.[0] ?? times.ringingMs) + watchMinusPhoneMs,
    end: times.recoveryEndMs + watchMinusPhoneMs,
  };

  const body: BiosignalUploadRequest = {
    v: 1,
    source: "samsung_sensor_sdk",
    device: file.device,
    clock: {
      phone_ws_open_ms: times.phoneWsOpenMs,
      phone_call_end_ms: times.phoneCallEndMs,
      watch_minus_phone_ms: watchMinusPhoneMs,
    },
    markers: {
      ringing_ms: times.ringingMs,
      rest_baseline: restBaseline,
      meditation: times.meditation,
      recovery_end_ms: times.recoveryEndMs,
    },
    hr: pickRows(file.hr, window, MAX_ROWS, (bpm, status) => status === 1 && bpm >= 30 && bpm <= 220),
    ibi: pickRows(file.ibi, window, MAX_IBI_ROWS, (ibiMs, status) => status === 0 && ibiMs >= 250 && ibiMs <= 2000),
    eda: pickRows(file.eda, window, MAX_ROWS, (value, status) => status >= 0 && value > 0 && value <= 100),
    skin_temp: pickRows(file.skinTemp, window, MAX_ROWS, (celsius) => celsius >= 20 && celsius <= 45),
    acc: pickRows(file.acc, window, MAX_ROWS, () => true),
    ppg: pickPpg(file.ppg, window),
  };

  return JSON.stringify(body).length > MAX_UPLOAD_BODY_LENGTH ? withoutPpg(body) : body;
}
