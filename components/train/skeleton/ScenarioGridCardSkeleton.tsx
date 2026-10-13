import { Skeleton } from "@/components/common/skeleton";

/** 시나리오 그리드 카드(ScenarioGridCard) 자리 스켈레톤 — 실제 카드와 같은 정사각형·모서리 */
export default function ScenarioGridCardSkeleton() {
  return <Skeleton className="flex-1 aspect-square rounded-control" />;
}
