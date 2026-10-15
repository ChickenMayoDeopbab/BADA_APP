import { Skeleton, SkeletonGroup } from "@/components/common/skeleton";
import { Text } from "react-native";

/**
 * 추천 시나리오 카드(RecommendScenarioCard) 자리 스켈레톤.
 * 고정 문구는 실제 텍스트로 두고 카드 영역만 스켈레톤으로 채운다.
 */
export default function RecommendScenarioCardSkeleton() {
  return (
    <SkeletonGroup
      className="gap-y-[6px]"
      accessibilityLabel="추천 시나리오 불러오는 중"
    >
      <Text className="text-label font-medium text-label-normal">
        이 시나리오 어때요?
      </Text>
      <Skeleton className="h-[189px] rounded-component" />
    </SkeletonGroup>
  );
}
