import { getApiErrorMessage } from "@/api/error";
import type { TrainingRecordItem } from "@/api/types";
import CustomButton from "@/components/common/CustomButton";
import CommunityHeader from "@/components/community/CommunityHeader";
import TrainingRecordCalendarModal from "@/components/record/TrainingRecordCalendarModal";
import { useCommunityPostDraft } from "@/context/CommunityPostDraftContext";
import { SEMANTIC_COLORS } from "@/design-system";
import { useTrainingRecordDates } from "@/hooks/useTrainingRecordDates";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.08,
  shadowRadius: 3.4,
  shadowOffset: { width: 0, height: 0 },
  elevation: 2,
};

const toValidDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
};

const getRecordIcon = (
  sessionType: TrainingRecordItem["sessionType"],
): keyof typeof Ionicons.glyphMap => {
  if (sessionType === "WARMUP") return "flame";
  if (sessionType === "CUSTOM") return "create";
  return "chatbubbles";
};

const SESSION_LABELS: Record<TrainingRecordItem["sessionType"], string> = {
  SCENARIO: "시나리오 훈련",
  CUSTOM: "커스텀 훈련",
  WARMUP: "워밍업",
};

export default function AttachTrainingRecordScreen() {
  const { selectedTrainingRecord, selectTrainingRecord } =
    useCommunityPostDraft();
  const recordsQuery = useTrainingRecordDates();
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(
    selectedTrainingRecord?.recordId ?? null,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const selected = selectedTrainingRecord
      ? toValidDate(selectedTrainingRecord.trainedAt)
      : null;
    return selected ? format(selected, "yyyy-MM-dd") : null;
  });
  const [calendarVisible, setCalendarVisible] = useState(false);

  const allRecords = useMemo(
    () =>
      [...(recordsQuery.data?.records ?? [])].sort((a, b) => {
        const aTime = toValidDate(a.trainedAt)?.getTime() ?? 0;
        const bTime = toValidDate(b.trainedAt)?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [recordsQuery.data?.records],
  );
  const availableDates = useMemo(
    () => new Set(recordsQuery.data?.dates ?? []),
    [recordsQuery.data?.dates],
  );

  useEffect(() => {
    if (selectedDate || recordsQuery.isLoading || recordsQuery.isError) return;
    const latestDate = allRecords[0]
      ? toValidDate(allRecords[0].trainedAt)
      : null;
    setSelectedDate(
      latestDate
        ? format(latestDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    );
  }, [allRecords, recordsQuery.isError, recordsQuery.isLoading, selectedDate]);

  const visibleRecords = useMemo(
    () =>
      selectedDate
        ? allRecords.filter((record) => {
            const trainedAt = toValidDate(record.trainedAt);
            return trainedAt && format(trainedAt, "yyyy-MM-dd") === selectedDate;
          })
        : [],
    [allRecords, selectedDate],
  );

  const confirmSelection = () => {
    const record = allRecords.find((item) => item.recordId === selectedRecordId);
    if (!record) return;
    selectTrainingRecord(record);
    router.back();
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-background-normal"
    >
      <CommunityHeader title="첨부 훈련기록 선택" />

      <View className="px-[11px] pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => setCalendarVisible(true)}
          className="h-12 flex-row items-center justify-between rounded-component bg-fill-normal px-[22px] active:bg-fill-pressed"
        >
          <View className="flex-row items-center gap-x-2">
            <Ionicons
              name="calendar-outline"
              size={20}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text className="font-medium text-label text-label-alternative">
              훈련 날짜
            </Text>
          </View>
          <View className="flex-row items-center gap-x-1">
            <Text className="font-medium text-body text-label-normal">
              {selectedDate ?? "날짜 선택"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={SEMANTIC_COLORS.label.alternative}
            />
          </View>
        </Pressable>
      </View>

      <FlatList
        className="flex-1"
        data={visibleRecords}
        keyExtractor={(record) => String(record.recordId)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: 11,
          paddingBottom: 18,
          flexGrow: 1,
        }}
        renderItem={({ item }) => {
          const selected = selectedRecordId === item.recordId;
          const trainedAt = toValidDate(item.trainedAt);

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setSelectedRecordId(item.recordId)}
              className="h-[82px] flex-row items-center rounded-component bg-background-normal px-[22px] active:opacity-80"
              style={cardShadow}
            >
              <View
                className="size-[46px] items-center justify-center rounded-component"
                style={{ backgroundColor: SEMANTIC_COLORS.record.iconBackground }}
              >
                <Ionicons
                  name={getRecordIcon(item.sessionType)}
                  size={26}
                  color={SEMANTIC_COLORS.status.info}
                />
              </View>

              <View className="ml-[10px] flex-1">
                <View className="flex-row items-center">
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-bold text-headline2 text-label-normal"
                  >
                    {item.scenarioName}
                  </Text>
                  <Text className="ml-2 font-medium text-label text-line-normal">
                    {trainedAt
                      ? format(trainedAt, "a hh:mm", { locale: ko })
                      : item.trainedAt}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Text className="text-label text-label-alternative">
                    {formatDuration(item.durationSeconds)}
                  </Text>
                  <Text className="mx-2 text-label text-line-normal">·</Text>
                  <Text className="text-label text-label-alternative">
                    {SESSION_LABELS[item.sessionType]}
                  </Text>
                </View>
              </View>

              <View
                className={`ml-3 size-8 items-center justify-center rounded-pill ${
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
            </Pressable>
          );
        }}
        ListEmptyComponent={
          recordsQuery.isLoading ? (
            <View className="items-center justify-center flex-1">
              <ActivityIndicator color={SEMANTIC_COLORS.primary.normal} />
            </View>
          ) : recordsQuery.isError ? (
            <View className="items-center justify-center flex-1 px-6">
              <Text className="text-center text-body text-label-alternative">
                {getApiErrorMessage(
                  recordsQuery.error,
                  "훈련 기록을 불러오지 못했어요.",
                )}
              </Text>
              <Pressable
                onPress={() => void recordsQuery.refetch()}
                className="px-4 py-2 mt-3 rounded-component bg-fill-normal active:bg-fill-pressed"
              >
                <Text className="font-medium text-label text-label-normal">
                  다시 시도
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center justify-center flex-1 px-8">
              <Ionicons
                name="time-outline"
                size={36}
                color={SEMANTIC_COLORS.line.normal}
              />
              <Text className="mt-3 text-center text-body text-label-alternative">
                선택한 날짜에 훈련 기록이 없어요.
              </Text>
            </View>
          )
        }
        refreshing={recordsQuery.isRefetching}
        onRefresh={() => void recordsQuery.refetch()}
      />

      <View className="gap-y-1.5 px-[33px] pb-2 pt-4">
        <CustomButton
          label="선택 훈련기록 첨부하기"
          tone="primary"
          disabled={!selectedRecordId}
          onPress={confirmSelection}
        />
        <CustomButton
          label="취소하기"
          tone="neutral"
          onPress={() => router.back()}
        />
      </View>

      <TrainingRecordCalendarModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        availableDates={availableDates}
        isLoading={recordsQuery.isLoading}
        onClose={() => setCalendarVisible(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setSelectedRecordId(null);
          setCalendarVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
