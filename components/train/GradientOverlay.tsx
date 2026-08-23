import { useId } from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type GradientDirection = "bottom" | "right" | "diagonal";

interface GradientStop {
  color: string; // 정지점 색상
  opacity?: number; // 정지점 투명도 (기본 1)
  offset: string; // 정지점 위치 (예: "0%")
}

interface GradientOverlayProps extends ViewProps {
  direction?: GradientDirection;
  stops?: GradientStop[];
}

// 방향별 그라데이션 좌표 (diagonal은 좌하단 → 우상단, 디자인의 49deg에 대응)
const DIRECTION_COORDS: Record<
  GradientDirection,
  { x1: string; y1: string; x2: string; y2: string }
> = {
  bottom: { x1: "0", y1: "0", x2: "0", y2: "1" },
  right: { x1: "0", y1: "0", x2: "1", y2: "0" },
  diagonal: { x1: "0", y1: "1", x2: "1", y2: "0" },
};

// 카드 이미지 위에 올리는 기본 스크림 (투명 → 검정)
const DEFAULT_STOPS: GradientStop[] = [
  { color: "#000000", opacity: 0, offset: "0%" },
  { color: "#000000", opacity: 1, offset: "100%" },
];

/**
 * 부모를 가득 채우는 선형 그라데이션 오버레이.
 * expo-linear-gradient는 네이티브 모듈이라 리빌드가 필요하므로
 * 이미 설치된 react-native-svg로 구현한다.
 */
export default function GradientOverlay({
  direction = "bottom",
  stops = DEFAULT_STOPS,
  style,
  ...props
}: GradientOverlayProps) {
  // useId가 만드는 id에는 콜론·괄호 같은 문자가 섞여 url(#id) 참조가 깨질 수 있어 영숫자만 남긴다
  const gradientId = `gradient${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const coords = DIRECTION_COORDS[direction];

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
      {...props}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} {...coords}>
            {stops.map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity ?? 1}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
