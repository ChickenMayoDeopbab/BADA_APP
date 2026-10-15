import { View } from "react-native";
import Skeleton from "./Skeleton";

interface SkeletonTextProps {
  lines?: number; // 줄 수
  lineClassName?: string; // 각 줄의 높이·모서리 (기본: 본문 한 줄 높이)
  lastLineWidthClassName?: string; // 마지막 줄 너비 (문단 끝처럼 짧게)
  className?: string; // 줄들을 감싸는 컨테이너 (간격 등)
}

/** 여러 줄 텍스트 자리를 표시하는 스켈레톤 */
export default function SkeletonText({
  lines = 1,
  lineClassName = "h-4 rounded-control",
  lastLineWidthClassName = "w-3/5",
  className = "gap-y-2",
}: SkeletonTextProps) {
  return (
    <View className={className}>
      {Array.from({ length: lines }, (_, index) => {
        const isLastLine = lines > 1 && index === lines - 1;
        return (
          <Skeleton
            key={index}
            className={`${lineClassName} ${isLastLine ? lastLineWidthClassName : "w-full"}`}
          />
        );
      })}
    </View>
  );
}
