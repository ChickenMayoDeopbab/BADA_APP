import { ScenarioInfo } from "@/api/types";
import { SURFACE_CARD_SHADOW } from "@/design-system/effects";
import { getScenarioThumbnail } from "@/utils/scenarioImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import GlassChip from "./GlassChip";
import GradientOverlay from "./GradientOverlay";
import ScenarioImage from "./ScenarioImage";
import TrainingCountLabel from "./TrainingCountLabel";
import { CARD_TEXT_SHADOW } from "./cardTextShadow";

interface ScenarioRowCardProps {
  scenario: ScenarioInfo;
  onPress: (scenario: ScenarioInfo) => void;
}

// 왼쪽 텍스트 영역을 덮는 스크림 (검정 → 투명)
const LEFT_SCRIM_STOPS = [
  { color: "#000000", opacity: 1, offset: "0%" },
  { color: "#000000", opacity: 0, offset: "100%" },
];

/** 검색 결과의 가로형 시나리오 카드 */
export default function ScenarioRowCard({
  scenario,
  onPress,
}: ScenarioRowCardProps) {
  return (
    <View className="w-full rounded-component" style={SURFACE_CARD_SHADOW}>
      <Pressable
        onPress={() => onPress(scenario)}
        className="h-[72px] overflow-hidden rounded-component bg-fill-neutral active:opacity-90"
      >
      <ScenarioImage source={getScenarioThumbnail(scenario.scenario_image, scenario.category)} />
      <GradientOverlay
        direction="right"
        stops={LEFT_SCRIM_STOPS}
        style={{ right: "13%" }}
      />

      <View className="flex-1 flex-row items-center justify-between px-4 py-[10px]">
        <View className="flex-1 gap-y-1 pr-2">
          <Text
            className="text-headline1 font-medium text-neutral-97"
            numberOfLines={1}
            style={CARD_TEXT_SHADOW}
          >
            {scenario.title}
          </Text>
          <TrainingCountLabel
            count={scenario.practice_count ?? 0}
          />
        </View>
        <GlassChip>
          <Text className="text-body font-medium text-white">자세히 보기</Text>
          <Ionicons name="chevron-forward" size={16} color="white" />
        </GlassChip>
      </View>
      </Pressable>
    </View>
  );
}
