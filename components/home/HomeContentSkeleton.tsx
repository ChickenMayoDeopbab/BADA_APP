import { Skeleton, SkeletonGroup } from "@/components/common/skeleton";
import { Text, View } from "react-native";

/** 출석 API를 기다리는 동안 주간 훈련 카드의 자리를 유지한다. */
export function HomeAttendanceSkeleton() {
  return (
    <SkeletonGroup className="gap-4" accessibilityLabel="출석 내역 불러오는 중">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-bold text-body text-label-normal">
          이번 주 훈련
        </Text>
        <Skeleton className="h-4 w-20 rounded-control" />
      </View>
      <View className="flex-row justify-between">
        {Array.from({ length: 7 }, (_, index) => (
          <View key={index} className="flex-1 items-center gap-1">
            <Skeleton className="aspect-square w-full max-w-10 rounded-control" />
            <Skeleton className="h-3 w-4 rounded-control" />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** 홈 추천 API가 늦어져도 옆 워밍업 카드는 바로 사용할 수 있게 한다. */
export function HomeRecommendationSkeleton() {
  return (
    <SkeletonGroup
      className="h-[148px] w-[59%] gap-3 rounded-component bg-background-normal px-3 py-4"
      accessibilityLabel="추천 시나리오 불러오는 중"
    >
      <Skeleton className="h-3 w-20 rounded-control" />
      <Skeleton className="h-6 w-4/5 rounded-control" />
      <View className="grow justify-end">
        <Skeleton className="h-8 w-3/4 rounded-control" />
      </View>
    </SkeletonGroup>
  );
}
