import CommunityHeader from "@/components/community/CommunityHeader";
import CustomButton from "@/components/common/CustomButton";
import { COMMUNITY_SCENARIOS } from "@/constants/community";
import { useCommunity } from "@/context/CommunityContext";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AttachScenarioScreen() {
  const { draft, addDraftAttachment } = useCommunity();
  const initialScenario = draft.attachments.find(
    (attachment) => attachment.type === "scenario",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialScenario?.id ?? null,
  );

  const attach = () => {
    const scenario = COMMUNITY_SCENARIOS.find((item) => item.id === selectedId);
    if (!scenario) return;
    addDraftAttachment(scenario);
    router.back();
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <CommunityHeader title="첨부 시나리오 선택" />

      <View className="items-end px-[33px] pb-3 pt-2">
        <Pressable className="h-12 w-[135px] flex-row items-center justify-between rounded-component bg-fill-normal px-3">
          <Text className="text-label text-label-alternative">전체</Text>
          <Ionicons
            name="caret-down"
            size={18}
            color={SEMANTIC_COLORS.line.normal}
          />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 33, gap: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {COMMUNITY_SCENARIOS.map((scenario) => {
          const selected = scenario.id === selectedId;
          return (
            <Pressable
              key={scenario.id}
              onPress={() => setSelectedId(selected ? null : scenario.id)}
              className="h-16 overflow-hidden rounded-component bg-label-normal active:opacity-90"
            >
              <Image
                source={scenario.image}
                resizeMode="cover"
                style={{ width: "100%", height: "100%", position: "absolute" }}
              />
              <View className="absolute inset-0 bg-black/30" />
              <View className="flex-1 flex-row items-center justify-between px-4">
                <View>
                  <Text className="text-headline2 font-medium text-white">
                    {scenario.title}
                  </Text>
                  <View className="mt-0.5 flex-row items-center gap-x-1">
                    <Ionicons name="time-outline" size={14} color="white" />
                    <Text className="text-caption text-white">
                      {scenario.trainingCount}회
                    </Text>
                  </View>
                </View>
                <View
                  className={`h-8 w-8 items-center justify-center rounded-pill border-2 ${
                    selected
                      ? "border-primary-normal bg-primary-normal"
                      : "border-white bg-white/70"
                  }`}
                >
                  <Ionicons
                    name="checkmark"
                    size={24}
                    color={selected ? "white" : SEMANTIC_COLORS.line.normal}
                  />
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="gap-y-1.5 px-[33px] pb-4 pt-2">
        <CustomButton
          label="선택 시나리오 첨부하기"
          tone="primary"
          disabled={!selectedId}
          onPress={attach}
        />
        <CustomButton label="취소하기" tone="neutral" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}
