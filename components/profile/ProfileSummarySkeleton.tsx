import { Skeleton, SkeletonGroup } from "@/components/common/skeleton";
import { View } from "react-native";

/** 프로필의 최초 조회에만 사진·이름·진단 결과·계정 정보 자리를 표시한다. */
export default function ProfileSummarySkeleton() {
  return (
    <SkeletonGroup
      className="w-full items-center gap-6"
      accessibilityLabel="프로필 정보 불러오는 중"
    >
      <View className="w-full items-center gap-4">
        <Skeleton className="size-[90px] rounded-[32px]" />
        <View className="w-full items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-control" />
          <Skeleton className="h-6 w-40 max-w-full rounded-pill" />
          <Skeleton className="h-[18px] w-4/5 rounded-control" />
        </View>
      </View>
      <View className="w-full items-center gap-2">
        <Skeleton className="h-[38px] w-full rounded-control" />
        <Skeleton className="my-1 h-[14px] w-24 rounded-control" />
      </View>
    </SkeletonGroup>
  );
}
