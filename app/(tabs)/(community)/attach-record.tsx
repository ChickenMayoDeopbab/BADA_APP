import CommunityHeader from "@/components/community/CommunityHeader";
import CustomButton from "@/components/common/CustomButton";
import { COMMUNITY_TRAINING_RECORDS } from "@/constants/community";
import { useCommunity } from "@/context/CommunityContext";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AttachTrainingRecordScreen() {
  const { draft, addDraftAttachment } = useCommunity();
  const initialRecord = draft.attachments.find(
    (attachment) => attachment.type === "record",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRecord?.id ?? null,
  );

  const attach = () => {
    const record = COMMUNITY_TRAINING_RECORDS.find(
      (item) => item.id === selectedId,
    );
    if (!record) return;
    addDraftAttachment(record);
    router.back();
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <CommunityHeader title="첨부 훈련기록 선택" />

      <View className="mx-3 mb-5 mt-2 h-12 flex-row items-center justify-between rounded-component bg-fill-normal px-6">
        <Ionicons
          name="calendar"
          size={17}
          color={SEMANTIC_COLORS.line.normal}
        />
        <Text className="text-headline1 font-medium text-label-normal">
          2026-08-12
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 11, gap: 8 }}
      >
        {COMMUNITY_TRAINING_RECORDS.map((record) => {
          const selected = record.id === selectedId;
          return (
            <Pressable
              key={record.id}
              onPress={() => setSelectedId(selected ? null : record.id)}
              className="h-[82px] flex-row items-center justify-between rounded-component bg-background-normal px-[22px] active:opacity-90"
              style={{
                shadowColor: "#000000",
                shadowOpacity: 0.06,
                shadowRadius: 3.4,
                shadowOffset: { width: 0, height: 0 },
                elevation: 1,
              }}
            >
              <View className="flex-row items-center gap-x-3">
                <View className="h-11 w-11 items-center justify-center rounded-component bg-[#E7F2FA]">
                  <Text className="text-[26px]">{record.emoji}</Text>
                </View>
                <View>
                  <Text className="text-headline2 font-bold text-label-normal">
                    {record.title}
                  </Text>
                  <Text className="text-label text-label-alternative">
                    {record.duration} · 피드백 {record.feedbackCount}개
                  </Text>
                </View>
              </View>

              <View className="items-end gap-y-1">
                <Text className="text-label text-line-normal">{record.time}</Text>
                <View
                  className={`h-8 w-8 items-center justify-center rounded-pill border-2 ${
                    selected
                      ? "border-primary-normal bg-primary-normal"
                      : "border-line-normal"
                  }`}
                >
                  <Ionicons
                    name="checkmark"
                    size={23}
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
          label="선택 훈련기록 첨부하기"
          tone="primary"
          disabled={!selectedId}
          onPress={attach}
        />
        <CustomButton label="취소하기" tone="neutral" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}
