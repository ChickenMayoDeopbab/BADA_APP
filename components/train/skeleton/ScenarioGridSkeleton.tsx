import { SkeletonGroup } from "@/components/common/skeleton";
import { View } from "react-native";
import ScenarioGridCardSkeleton from "./ScenarioGridCardSkeleton";

interface ScenarioGridSkeletonProps {
  rowCount?: number; // 2열 행 수 (목록 API가 개수를 주지 않아 화면을 채울 만큼 고정)
}

/** 시나리오 2열 그리드 자리 스켈레톤 */
export default function ScenarioGridSkeleton({
  rowCount = 3,
}: ScenarioGridSkeletonProps) {
  return (
    <SkeletonGroup
      className="gap-y-3"
      accessibilityLabel="시나리오 목록 불러오는 중"
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <View key={index} className="flex-row gap-x-3">
          <ScenarioGridCardSkeleton />
          <ScenarioGridCardSkeleton />
        </View>
      ))}
    </SkeletonGroup>
  );
}
