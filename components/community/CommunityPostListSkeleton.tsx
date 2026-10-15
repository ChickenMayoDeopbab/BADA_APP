import {
  Skeleton,
  SkeletonGroup,
  SkeletonText,
} from "@/components/common/skeleton";
import { View } from "react-native";

/** API로 조회하는 피드의 작성자·제목·본문·반응 영역만 대신 표시한다. */
export default function CommunityPostListSkeleton() {
  return (
    <SkeletonGroup
      className="gap-3"
      accessibilityLabel="게시물 목록 불러오는 중"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <View
          key={index}
          className="min-h-[145px] gap-2 rounded-component bg-background-normal px-[22px] py-3"
        >
          <View className="flex-row items-center gap-1.5">
            <Skeleton className="size-5 rounded-pill" />
            <Skeleton className="h-3 w-20 rounded-control" />
          </View>
          <Skeleton className="h-5 w-3/4 rounded-control" />
          <SkeletonText
            lines={2}
            lineClassName="h-[14px] rounded-control"
            className="gap-1.5 py-1"
          />
          <View className="flex-row items-center justify-between gap-3">
            <Skeleton className="h-3 w-2/5 rounded-control" />
            <Skeleton className="h-4 w-1/4 rounded-control" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}
