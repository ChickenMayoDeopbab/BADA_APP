import { getApiErrorMessage } from "@/api/error";
import type { ScenarioInfo } from "@/api/types";
import CustomButton from "@/components/common/CustomButton";
import StyledImage from "@/components/common/StyledImage";
import CommunityHeader from "@/components/community/CommunityHeader";
import { CARD_TEXT_SHADOW } from "@/components/train/cardTextShadow";
import GradientOverlay from "@/components/train/GradientOverlay";
import { useCommunityPostDraft } from "@/context/CommunityPostDraftContext";
import { SEMANTIC_COLORS } from "@/design-system";
import { useScenarios } from "@/hooks/useScenarios";
import { getScenarioThumbnail } from "@/utils/scenarioImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CategoryFilter = "all" | ScenarioInfo["category"];

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "work", label: "업무" },
  { key: "daily", label: "일상" },
  { key: "school", label: "학교" },
  { key: "other", label: "기타" },
];

const CARD_SCRIM = [
  { color: "#000000", opacity: 0.82, offset: "0%" },
  { color: "#000000", opacity: 0.26, offset: "62%" },
  { color: "#000000", opacity: 0.08, offset: "100%" },
];

const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.08,
  shadowRadius: 3.4,
  shadowOffset: { width: 0, height: 0 },
  elevation: 2,
};

export default function AttachScenarioScreen() {
  const { selectedScenario, selectScenario } = useCommunityPostDraft();
  const scenariosQuery = useScenarios();
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(
    selectedScenario?.scenario_id ?? null,
  );
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [filterVisible, setFilterVisible] = useState(false);

  const myCustomScenarios = useMemo(
    () =>
      scenariosQuery.data?.filter(
        (scenario) => scenario.is_custom && !scenario.is_copied,
      ) ?? [],
    [scenariosQuery.data],
  );
  const visibleScenarios = useMemo(
    () =>
      category === "all"
        ? myCustomScenarios
        : myCustomScenarios.filter(
            (scenario) => scenario.category === category,
          ),
    [category, myCustomScenarios],
  );
  const selectedFilterLabel =
    FILTERS.find((filter) => filter.key === category)?.label ?? "전체";

  const confirmSelection = () => {
    const scenario = myCustomScenarios.find(
      (item) => item.scenario_id === selectedScenarioId,
    );
    if (!scenario) return;
    selectScenario(scenario);
    router.back();
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-background-normal"
    >
      <CommunityHeader title="첨부 시나리오 선택" />

      <View className="z-30 h-[58px] px-[33px] pt-2">
        <View className="relative self-end">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: filterVisible }}
            onPress={() => setFilterVisible((visible) => !visible)}
            className="h-12 w-[135px] flex-row items-center justify-between rounded-component bg-fill-normal px-4 active:bg-fill-pressed"
          >
            <Text className="text-body font-medium text-label-normal">
              {selectedFilterLabel}
            </Text>
            <Ionicons
              name={filterVisible ? "chevron-up" : "chevron-down"}
              size={18}
              color={SEMANTIC_COLORS.label.alternative}
            />
          </Pressable>

          {filterVisible && (
            <View
              className="absolute right-0 top-[52px] z-40 w-[135px] overflow-hidden rounded-component bg-background-normal"
              style={cardShadow}
            >
              {FILTERS.map((filter) => (
                <Pressable
                  key={filter.key}
                  onPress={() => {
                    setCategory(filter.key);
                    setFilterVisible(false);
                  }}
                  className={`h-10 justify-center px-4 active:bg-fill-pressed ${
                    category === filter.key ? "bg-fill-normal" : ""
                  }`}
                >
                  <Text
                    className={`text-label font-medium ${
                      category === filter.key
                        ? "text-primary-normal"
                        : "text-label-normal"
                    }`}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {scenariosQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={SEMANTIC_COLORS.primary.normal} />
        </View>
      ) : scenariosQuery.isError ? (
        <View className="flex-1 items-center justify-center px-[33px]">
          <Text className="text-center text-body text-label-alternative">
            {getApiErrorMessage(
              scenariosQuery.error,
              "시나리오 목록을 불러오지 못했어요.",
            )}
          </Text>
          <Pressable
            onPress={() => void scenariosQuery.refetch()}
            className="mt-3 rounded-component bg-fill-normal px-4 py-2 active:bg-fill-pressed"
          >
            <Text className="text-label font-medium text-label-normal">
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : visibleScenarios.length === 0 ? (
        <View className="flex-1 items-center justify-center px-[33px]">
          <Ionicons
            name="videocam-outline"
            size={38}
            color={SEMANTIC_COLORS.line.normal}
          />
          <Text className="mt-3 text-center text-body text-label-alternative">
            {myCustomScenarios.length === 0
              ? "첨부할 커스텀 시나리오가 없어요."
              : "이 분류에 해당하는 시나리오가 없어요."}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-[33px]"
          contentContainerStyle={{ gap: 8, paddingTop: 3, paddingBottom: 18 }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setFilterVisible(false)}
        >
          {visibleScenarios.map((scenario) => {
            const selected = selectedScenarioId === scenario.scenario_id;
            const categoryLabel =
              FILTERS.find((filter) => filter.key === scenario.category)
                ?.label ?? scenario.category;

            return (
              <Pressable
                key={scenario.scenario_id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSelectedScenarioId(scenario.scenario_id)}
                className="h-[72px] w-full overflow-hidden rounded-component bg-background-normal active:opacity-90"
                style={cardShadow}
              >
                <StyledImage
                  source={getScenarioThumbnail(
                    scenario.scenario_image,
                    scenario.category,
                  )}
                  contentFit="cover"
                  className="absolute inset-0 size-full"
                />
                <GradientOverlay direction="right" stops={CARD_SCRIM} />

                <View className="flex-1 flex-row items-center justify-between px-4">
                  <View className="flex-1 pr-3">
                    <Text
                      numberOfLines={1}
                      className="text-headline1 font-medium text-neutral-97"
                      style={CARD_TEXT_SHADOW}
                    >
                      {scenario.title}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-x-1">
                      <Ionicons
                        name="albums-outline"
                        size={15}
                        color="#F7F7F8"
                      />
                      <Text className="text-caption font-medium text-neutral-97">
                        {categoryLabel}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`size-8 items-center justify-center rounded-pill ${
                      selected
                        ? "bg-primary-normal"
                        : "border-2 border-line-normal bg-background-normal"
                    }`}
                  >
                    <Ionicons
                      name="checkmark"
                      size={22}
                      color={
                        selected
                          ? SEMANTIC_COLORS.background.normal
                          : SEMANTIC_COLORS.line.normal
                      }
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View className="gap-y-1.5 px-[33px] pb-2 pt-4">
        <CustomButton
          label="선택 시나리오 첨부하기"
          tone="primary"
          disabled={!selectedScenarioId}
          onPress={confirmSelection}
        />
        <CustomButton
          label="취소하기"
          tone="neutral"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}
