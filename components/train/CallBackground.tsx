import { SEMANTIC_COLORS } from "@/design-system/colors";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/** 통화 화면(수신·통화 중) 전체를 덮는 연녹색 그라데이션 배경 */
export default function CallBackground() {
  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <Defs>
        <LinearGradient id="trainCall" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0.026" stopColor={SEMANTIC_COLORS.train.callGradientStart} />
          <Stop offset="1" stopColor={SEMANTIC_COLORS.train.callGradientEnd} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#trainCall)" />
    </Svg>
  );
}
