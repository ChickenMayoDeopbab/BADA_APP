import { ScenarioInfo } from "@/api/types";
import { router } from "expo-router";

/** 시나리오 상세(바텀시트)로 이동 */
export const openScenarioDetail = (scenario: ScenarioInfo) => {
  router.push({
    pathname: "/(tabs)/(train)/detail/[id]",
    params: { id: String(scenario.scenario_id) },
  });
};
