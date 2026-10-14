import { Skeleton } from "@/components/common/skeleton";

/** 가로형 시나리오 카드(ScenarioRowCard) 자리 스켈레톤 — 실제 카드와 같은 높이·모서리 */
export default function ScenarioRowCardSkeleton() {
  return <Skeleton className="h-[72px] w-full rounded-component" />;
}
