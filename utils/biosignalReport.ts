import type {
  BiosignalPhase,
  BiosignalQuadrant,
  BiosignalReportResponse,
  BiosignalReportTimeline,
  BiosignalValueMetric,
} from "@/api/types";

type BiosignalFusion = NonNullable<BiosignalReportResponse["metrics"]>["fusion"];

/** 통화 중 평균이 기준선과 이만큼 안쪽으로 차이 나면 '평소와 비슷했어요'로 말한다(bpm). */
const SIMILAR_DELTA_BPM = 3;
/** 이만큼 넘게 빨랐으면 '조금'을 뺀다(bpm). 서버가 턴을 '몸 반응 큼'으로 보는 기준과 같다. */
const FASTER_DELTA_BPM = 10;
/** 통화 칸 중 값이 있는 칸이 이 비율보다 적으면 곡선을 숨긴다. 서버가 구간 평균을 내는 최소 비율(MIN_COVERAGE)과 같다. */
const MIN_CALL_BIN_RATIO = 0.5;

/** 칸별 문장. 몸 반응이 작은 칸은 기존 음성 피드백만 쓰므로 문장이 없다. */
const QUADRANT_SENTENCES: Partial<Record<BiosignalQuadrant, string>> = {
  body_high_voice_steady: "몸은 반응했지만 목소리는 끝까지 안정적이었어요.",
  body_high_voice_shaky:
    "몸이 크게 반응한 순간이었어요. 이런 반응은 몸이 준비하는 자연스러운 신호예요.",
};

export interface BiosignalChart {
  binSec: number;
  startSec: number; // 통화 시작 기준 초
  bpm: (number | null)[]; // null은 비워 둘 구간
  phases: (BiosignalPhase | null)[];
}

export interface BiosignalPeak {
  atSec: number; // 통화 시작 기준 초
  phase: "listen" | "speak" | null;
  bpm: number;
}

/** 카드에 그릴 내용. 값이 null인 요소는 숨긴다. */
export interface BiosignalReportView {
  chart: BiosignalChart | null;
  callChange: string | null; // 기준선 대비 통화 중 변화 문장
  peak: BiosignalPeak | null;
  recoveryPct: number | null; // 0 초과 100 이하 정수
  sentence: string | null; // 칸별 문장
  baselineBpm: number | null; // 눌러야 보이는 평소 심박
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** MEASURED이고 값이 숫자일 때만 값을 돌려준다. */
const measuredValue = (metric: BiosignalValueMetric | undefined): number | null =>
  metric?.status === "MEASURED" && isFiniteNumber(metric.value) ? metric.value : null;

/** 기준선 대비 통화 중 변화를 마음 상태를 단정하지 않는 문장으로 바꾼다. */
const describeCallDelta = (delta: number): string => {
  if (Math.abs(delta) < SIMILAR_DELTA_BPM) return "통화하는 동안 심박이 평소와 비슷했어요.";
  if (delta < 0) return "통화하는 동안 심박이 평소보다 조금 느렸어요.";
  if (delta < FASTER_DELTA_BPM) return "통화하는 동안 심박이 평소보다 조금 빨랐어요.";
  return "통화하는 동안 심박이 평소보다 빨랐어요.";
};

/**
 * 심박 곡선. 그릴 점이 두 개 미만이거나 값이 있는 통화 칸이 절반보다 적으면 숨긴다.
 * 손을 움직이며 통화하면 서버가 그 초의 심박을 버려 통화 칸이 거의 비는데, 끊긴 점만 남은 곡선은 오류처럼 보인다.
 */
const toChart = (timeline: BiosignalReportTimeline | undefined): BiosignalChart | null => {
  if (
    !timeline ||
    !isFiniteNumber(timeline.bin_sec) ||
    timeline.bin_sec <= 0 ||
    !isFiniteNumber(timeline.start_sec) ||
    !Array.isArray(timeline.hr)
  ) {
    return null;
  }
  const bpm = timeline.hr.map((value) => (isFiniteNumber(value) && value > 0 ? value : null));
  if (bpm.filter((value) => value !== null).length < 2) return null;
  const phases = bpm.map((_, index) => {
    const phase = Array.isArray(timeline.phase) ? timeline.phase[index] : null;
    return typeof phase === "string" ? phase : null;
  });
  const callBpm = bpm.filter((_, index) => phases[index] === "listen" || phases[index] === "speak");
  const filledCallBinCount = callBpm.filter((value) => value !== null).length;
  if (callBpm.length === 0 || filledCallBinCount < callBpm.length * MIN_CALL_BIN_RATIO) return null;
  return { binSec: timeline.bin_sec, startSec: timeline.start_sec, bpm, phases };
};

/** 칭찬할 턴이 있으면 그 문장을, 없으면 가장 높았던 순간의 턴 문장을 고른다. */
const pickSentence = (fusion: BiosignalFusion, peakTurn: number | null): string | null => {
  const turn = isFiniteNumber(fusion?.praise_turn) ? fusion.praise_turn : peakTurn;
  if (turn === null || !Array.isArray(fusion?.turns)) return null;
  const quadrant = fusion.turns.find((entry) => entry?.turn === turn)?.quadrant;
  return quadrant ? QUADRANT_SENTENCES[quadrant] ?? null : null;
};

/**
 * 분석 결과를 '몸의 반응' 카드 내용으로 바꾼다. 분석이 끝나지 않았거나 보여 줄 것이 없으면 null.
 * 기준선이 없으면 '평소' 비교(통화 중 변화·회복·평소 심박)를 모두 뺀다.
 */
export function buildBiosignalReportView(
  report: BiosignalReportResponse | null | undefined,
): BiosignalReportView | null {
  if (report?.status !== "ANALYZED") return null;
  const cardiac = report.metrics?.cardiac;
  const baseline = cardiac?.baseline;
  const baselineBpm =
    baseline?.source === "rest" || baseline?.source === "previous_sessions"
      ? measuredValue(baseline)
      : null;
  const hasBaseline = baselineBpm !== null;

  const callDelta = hasBaseline ? measuredValue(cardiac?.hr?.call_delta) : null;
  const rawPeak = cardiac?.hr?.peak;
  const peak =
    rawPeak?.status === "MEASURED" &&
    isFiniteNumber(rawPeak.bpm) &&
    isFiniteNumber(rawPeak.at_sec) &&
    rawPeak.at_sec >= 0
      ? {
          atSec: rawPeak.at_sec,
          phase: rawPeak.phase === "listen" || rawPeak.phase === "speak" ? rawPeak.phase : null,
          bpm: rawPeak.bpm,
        }
      : null;
  const recovery = hasBaseline ? measuredValue(cardiac?.hr?.recovery_pct) : null;
  // 돌아오지 않은 회차를 '0%'로 말하면 진척이 없다는 말처럼 들리므로 숨긴다.
  const recoveryPct = recovery !== null && Math.round(recovery) > 0 ? Math.min(100, Math.round(recovery)) : null;
  const peakTurn = peak && isFiniteNumber(rawPeak?.turn) ? rawPeak.turn : null;

  const view: BiosignalReportView = {
    chart: toChart(cardiac?.report_timeline),
    callChange: callDelta === null ? null : describeCallDelta(callDelta),
    peak,
    recoveryPct,
    sentence: pickSentence(report.metrics?.fusion, peakTurn),
    baselineBpm,
  };
  const hasContent =
    view.chart !== null ||
    view.callChange !== null ||
    view.peak !== null ||
    view.recoveryPct !== null ||
    view.sentence !== null;
  return hasContent ? view : null;
}

/** 통화 시작 기준 초를 M:SS로 바꾼다. */
export const formatCallSecond = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
