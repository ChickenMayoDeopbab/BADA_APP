import { SkeletonGroup } from "@/components/common/skeleton";
import ScenarioRowCardSkeleton from "./ScenarioRowCardSkeleton";

interface ScenarioRowListSkeletonProps {
  count?: number; // 표시할 행 카드 수
}

/** 가로형 시나리오 카드 목록 자리 스켈레톤 (검색 결과 등) */
export default function ScenarioRowListSkeleton({
  count = 5,
}: ScenarioRowListSkeletonProps) {
  return (
    <SkeletonGroup
      className="gap-y-1"
      accessibilityLabel="검색 결과 불러오는 중"
    >
      {Array.from({ length: count }, (_, index) => (
        <ScenarioRowCardSkeleton key={index} />
      ))}
    </SkeletonGroup>
  );
}
