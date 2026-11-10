import { SEMANTIC_COLORS } from "@/design-system";
import { SUBTLE_CARD_SHADOW } from "@/design-system/effects";
import type { BiosignalPhase } from "@/api/types";
import {
  formatCallSecond,
  type BiosignalChart,
  type BiosignalPeak,
  type BiosignalReportView,
} from "@/utils/biosignalReport";
import { useState } from "react";
import { LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { Circle, Path, Rect, Svg } from "react-native-svg";

const CHART_HEIGHT = 120;
const CHART_PADDING_Y = 12;
/** 곡선 위아래 여백(bpm). 값이 거의 같아도 선이 납작하게 붙지 않게 한다. */
const MIN_BPM_SPAN = 10;
/** 구간이 이보다 좁으면 이름이 옆 구간 이름과 겹치므로 적지 않는다. */
const MIN_LABEL_WIDTH = 56;

type Region = "before" | "call" | "after";

const REGION_LABELS: Record<Region, string> = {
  before: "통화 전",
  call: "통화 중",
  after: "통화 후",
};

const REGION_FILLS: Record<Region, string> = {
  before: SEMANTIC_COLORS.fill.normal,
  call: SEMANTIC_COLORS.primary.alternative,
  after: SEMANTIC_COLORS.record.iconBackground,
};

const toRegion = (phase: BiosignalPhase | null): Region | null => {
  if (phase === "baseline" || phase === "anticipation") return "before";
  if (phase === "listen" || phase === "speak") return "call";
  if (phase === "recovery") return "after";
  return null;
};

/** 이어진 같은 단계 구간을 [시작 bin, 끝 bin) 묶음으로 만든다. */
const groupRegions = (phases: (BiosignalPhase | null)[]) => {
  const groups: { region: Region; start: number; end: number }[] = [];
  phases.forEach((phase, index) => {
    const region = toRegion(phase);
    if (!region) return;
    const last = groups[groups.length - 1];
    if (last && last.region === region && last.end === index) last.end = index + 1;
    else groups.push({ region, start: index, end: index + 1 });
  });
  return groups;
};

/** 빈 구간(null)에서 선을 끊는다. 이어 그리면 없는 급등이 생겨 거짓 '심박 증가'로 읽힌다. */
const buildSegments = (points: ({ x: number; y: number } | null)[]) => {
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  points.forEach((point) => {
    if (point) {
      current.push(point);
      return;
    }
    if (current.length > 0) segments.push(current);
    current = [];
  });
  if (current.length > 0) segments.push(current);
  return segments;
};

function HeartRateChart({ chart, peak }: { chart: BiosignalChart; peak: BiosignalPeak | null }) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const values = chart.bpm.filter((value): value is number => value !== null);
  if (peak) values.push(peak.bpm);
  const middle = (Math.min(...values) + Math.max(...values)) / 2;
  const half = Math.max(MIN_BPM_SPAN, Math.max(...values) - Math.min(...values)) / 2;
  const minBpm = middle - half;
  const maxBpm = middle + half;

  const totalSec = chart.bpm.length * chart.binSec;
  const xOf = (sec: number) => ((sec - chart.startSec) / totalSec) * width;
  const yOf = (bpm: number) =>
    CHART_PADDING_Y + ((maxBpm - bpm) / (maxBpm - minBpm)) * (CHART_HEIGHT - CHART_PADDING_Y * 2);
  const binWidth = width / chart.bpm.length;
  // 최고점 시각은 곡선과 따로 오므로, 곡선 구간 끝을 살짝 넘어도 점이 곡선 범위(구간 가운데) 안에 그려지게 한다.
  const peakX = peak
    ? Math.min(width - binWidth / 2, Math.max(binWidth / 2, xOf(peak.atSec)))
    : 0;

  const regions = groupRegions(chart.phases);
  const segments = buildSegments(
    chart.bpm.map((bpm, index) =>
      bpm === null ? null : { x: (index + 0.5) * binWidth, y: yOf(bpm) },
    ),
  );
  // 단계마다 가장 넓은 구간 하나에만 이름을 적는다.
  const labeledRegions = (Object.keys(REGION_LABELS) as Region[]).flatMap((region) => {
    const widest = regions
      .filter((group) => group.region === region)
      .sort((a, b) => b.end - b.start - (a.end - a.start))[0];
    return widest && (widest.end - widest.start) * binWidth >= MIN_LABEL_WIDTH ? [widest] : [];
  });

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel="통화 전부터 끊은 뒤까지의 심박 흐름 그래프"
    >
      <View style={{ height: CHART_HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {regions.map((group) => (
              <Rect
                key={`${group.region}-${group.start}`}
                x={group.start * binWidth}
                y={0}
                width={(group.end - group.start) * binWidth}
                height={CHART_HEIGHT}
                fill={REGION_FILLS[group.region]}
              />
            ))}
            {segments.map((segment) =>
              segment.length === 1 ? (
                <Circle
                  key={`dot-${segment[0].x}`}
                  cx={segment[0].x}
                  cy={segment[0].y}
                  r={2}
                  fill={SEMANTIC_COLORS.secondary.normal}
                />
              ) : (
                <Path
                  key={`line-${segment[0].x}`}
                  d={segment
                    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
                    .join(" ")}
                  stroke={SEMANTIC_COLORS.secondary.normal}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              ),
            )}
            {peak && (
              <Circle
                cx={peakX}
                cy={yOf(peak.bpm)}
                r={5}
                fill={SEMANTIC_COLORS.secondary.normal}
                stroke={SEMANTIC_COLORS.background.normal}
                strokeWidth={2}
              />
            )}
          </Svg>
        )}
      </View>
      <View className="relative h-5 mt-1">
        {width > 0 &&
          labeledRegions.map((group) => (
            <Text
              key={group.region}
              className="absolute text-caption font-medium text-label-alternative"
              style={{ left: group.start * binWidth }}
              numberOfLines={1}
            >
              {REGION_LABELS[group.region]}
            </Text>
          ))}
      </View>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-label font-medium text-label-alternative">{label}</Text>
      <Text className="flex-1 text-right text-body font-medium text-label-neutral">{value}</Text>
    </View>
  );
}

/** 리포트의 '몸의 반응' 카드. 통화 전부터 끊은 뒤까지 심박이 어떻게 움직였는지 평소와 견주어 보여 준다. */
export default function BiosignalReportCard({ view }: { view: BiosignalReportView }) {
  const [isNumberVisible, setIsNumberVisible] = useState(false);
  const { chart, callChange, peak, recoveryPct, sentence, baselineBpm } = view;
  const numberParts = [
    baselineBpm !== null ? `평소 ${Math.round(baselineBpm)} bpm` : null,
    peak ? `가장 높을 때 ${Math.round(peak.bpm)} bpm` : null,
  ].filter((part): part is string => part !== null);

  return (
    <View className="rounded-component" style={SUBTLE_CARD_SHADOW}>
      <View className="gap-y-4 px-3 py-4 overflow-hidden bg-background-normal rounded-component">
        {chart && <HeartRateChart chart={chart} peak={peak} />}
        {callChange && (
          <Text className="text-body font-bold text-label-neutral">{callChange}</Text>
        )}
        {(peak || recoveryPct !== null) && (
          <View className="gap-y-2">
            {peak && (
              <MetricRow
                label="가장 높았던 순간"
                value={`${formatCallSecond(peak.atSec)}${
                  peak.phase === "speak" ? " · 내가 말할 때" : peak.phase === "listen" ? " · 상대 말을 들을 때" : ""
                }`}
              />
            )}
            {recoveryPct !== null && (
              <MetricRow label="끊고 1분 동안" value={`평소 쪽으로 ${recoveryPct}% 돌아왔어요`} />
            )}
          </View>
        )}
        {sentence && <Text className="text-body font-medium text-label-neutral">{sentence}</Text>}
        {numberParts.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isNumberVisible }}
            onPress={() => setIsNumberVisible((current) => !current)}
            hitSlop={8}
          >
            <Text className="text-label font-medium text-label-alternative underline">
              {isNumberVisible ? numberParts.join(" · ") : "심박 숫자 보기"}
            </Text>
          </Pressable>
        )}
        <Text className="text-caption font-normal text-label-alternative">
          통화할 때 심박이 오르는 건 몸이 대화를 준비하는 자연스러운 신호예요.
        </Text>
      </View>
    </View>
  );
}
