import { ScenarioInfo } from "@/api/types";
import { getScenarioThumbnail } from "@/utils/scenarioImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import GlassChip from "./GlassChip";
import GradientOverlay from "./GradientOverlay";
import ScenarioImage from "./ScenarioImage";
import TrainingCountLabel from "./TrainingCountLabel";
import { CARD_TEXT_SHADOW } from "./cardTextShadow";

interface ScenarioGridCardProps {
  scenario: ScenarioInfo;
  onPress: (scenario: ScenarioInfo) => void;
}

/** 시나리오 목록의 정사각형 그리드 카드 (2열) */
export default function ScenarioGridCard({
  scenario,
  onPress,
}: ScenarioGridCardProps) {
  return (
    <Pressable
      onPress={() => onPress(scenario)}
      className="flex-1 aspect-square overflow-hidden rounded-control border border-line-alternative bg-fill-neutral active:opacity-90"
    >
      <ScenarioImage source={getScenarioThumbnail(scenario.scenario_image, scenario.category)} />
      {/* 아래쪽 텍스트 가독성을 위한 스크림 */}
      <GradientOverlay direction="bottom" style={{ top: "32%" }} />

      <View className="flex-1 flex-row items-end justify-between p-3">
        <View className="flex-1 gap-y-1 pr-2">
          <Text
            className="text-headline2 font-bold text-neutral-97"
            numberOfLines={1}
            style={CARD_TEXT_SHADOW}
          >
            {scenario.title}
          </Text>
          <TrainingCountLabel
            count={scenario.practice_count ?? 0}
          />
        </View>
        <GlassChip containerClassName="w-[34px] h-[34px]">
          <Ionicons name="call" size={18} color="white" />
        </GlassChip>
      </View>
    </Pressable>
  );
}
