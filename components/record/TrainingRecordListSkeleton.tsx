import { Skeleton, SkeletonGroup } from "@/components/common/skeleton";
import { View } from "react-native";

/** 훈련 기록의 합계와 날짜별 카드가 도착할 자리를 실제 목록과 맞춘다. */
export default function TrainingRecordListSkeleton() {
  return (
    <SkeletonGroup className="gap-5" accessibilityLabel="훈련 기록 불러오는 중">
      <View className="h-[123px] gap-4 rounded-component bg-background-normal px-[22px] py-[14px]">
        <Skeleton className="h-4 w-28 rounded-control" />
        <View className="gap-2">
          <Skeleton className="h-7 w-2/5 rounded-control" />
          <Skeleton className="h-4 w-16 rounded-control" />
        </View>
      </View>
      <View className="gap-3">
        <Skeleton className="ml-3 h-5 w-16 rounded-control" />
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            className="h-[82px] flex-row items-center gap-[10px] rounded-component bg-background-normal px-[22px]"
          >
            <Skeleton className="size-10 rounded-control" />
            <View className="min-w-0 flex-1 gap-2">
              <View className="flex-row justify-between gap-3">
                <Skeleton className="h-5 flex-1 rounded-control" />
                <Skeleton className="h-3 w-12 rounded-control" />
              </View>
              <Skeleton className="h-3 w-16 rounded-control" />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}
