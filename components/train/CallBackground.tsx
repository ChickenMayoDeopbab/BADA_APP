import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/** 통화 화면(수신·통화 중) 전체를 덮는 연녹색 그라데이션 배경 */
export default function CallBackground() {
  const { width, height } = useWindowDimensions();
  // Figma의 156.28° CSS 그라데이션을 실제 화면 비율의 SVG 좌표로 옮긴다.
  const angle = 156.28264967555003 * Math.PI / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <Defs>
        <LinearGradient
          id="trainCall"
          gradientUnits="userSpaceOnUse"
          x1={(width - dx * length) / 2 + dx * length * 0.026394}
          y1={(height - dy * length) / 2 + dy * length * 0.026394}
          x2={(width + dx * length) / 2 + dx * length * 0.0597}
          y2={(height + dy * length) / 2 + dy * length * 0.0597}
        >
          <Stop offset="0" stopColor={SEMANTIC_COLORS.train.callGradientStart} />
          <Stop offset="1" stopColor={SEMANTIC_COLORS.train.callGradientEnd} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#trainCall)" />
    </Svg>
  );
}
