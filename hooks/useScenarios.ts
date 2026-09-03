import { getScenarios } from "@/api/trainApi";
import { ScenarioCategory, ScenarioInfo } from "@/api/types";
import { useQuery } from "@tanstack/react-query";

/** 시나리오 목록 조회 (category가 없으면 전체) */
export const useScenarios = (category?: ScenarioCategory | null) =>
  useQuery({
    queryKey: ["scenarios", category ?? "all"],
    queryFn: () => getScenarios(category ?? undefined),
    select: (data): ScenarioInfo[] => data.scenarios,
  });

/**
 * 시나리오 ID 하나를 조회.
 * 단건 조회 API가 없어 전체 목록에서 찾으며, useScenarios와 캐시를 공유해
 * 목록을 거쳐 들어온 경우에는 추가 요청이 발생하지 않는다.
 */
export const useScenario = (scenarioId?: string) => {
  const { data: scenarios, ...rest } = useScenarios();

  return {
    ...rest,
    data: scenarioId
      ? scenarios?.find(
          (scenario) => String(scenario.scenario_id) === scenarioId,
        )
      : undefined,
  };
};
