import { ScenarioInfo } from "@/api/types";
import { getScenarioCover } from "@/utils/scenarioImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, Text, View } from "react-native";
import GlassChip from "./GlassChip";
import GradientOverlay from "./GradientOverlay";
import { CARD_TEXT_SHADOW } from "./cardTextShadow";

interface RecommendScenarioCardProps {
  scenario: ScenarioInfo;
  onPress: (scenario: ScenarioInfo) => void;
}

/** 목록 상단의 추천 시나리오 카드 (「이 시나리오 어때요?」) */
export default function RecommendScenarioCard({
  scenario,
  onPress,
}: RecommendScenarioCardProps) {
  return (
    <View className="gap-y-[6px]">
      <Text className="text-label font-medium text-label-normal">
        이 시나리오 어때요?
      </Text>
      <Pressable
        onPress={() => onPress(scenario)}
        className="h-[189px] justify-end overflow-hidden rounded-component bg-black px-3 py-4 active:opacity-90"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 5.3,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <Image
          source={getScenarioCover(scenario.scenario_image, scenario.category)}
          className="absolute w-full h-full"
          resizeMode="cover"
        />
        <GradientOverlay direction="bottom" style={{ top: "44%" }} />

        <View className="flex-row items-end justify-between">
          <View className="flex-1 pr-2">
            <Text
              className="text-caption text-neutral-97"
              style={CARD_TEXT_SHADOW}
            >
              {scenario.is_custom ? "커스텀 시나리오" : "기본 제공 시나리오"}
            </Text>
            <Text
              className="text-headline1 font-bold text-neutral-97"
              numberOfLines={1}
              style={CARD_TEXT_SHADOW}
            >
              {scenario.title}
            </Text>
          </View>
          <GlassChip>
            <Text className="text-label font-medium text-white">자세히 보기</Text>
            <Ionicons name="chevron-forward" size={14} color="white" />
          </GlassChip>
        </View>
      </Pressable>
    </View>
  );
}
