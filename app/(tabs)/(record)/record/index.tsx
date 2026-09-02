import { TrainingRecordItem } from "@/api/types";
import Top from "@/components/common/Top";
import TrainingRecordCalendarModal from "@/components/record/TrainingRecordCalendarModal";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useTrainingRecordDates } from "@/hooks/useTrainingRecordDates";
import { Ionicons } from "@expo/vector-icons";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Period = "daily" | "weekly" | "monthly";

type RecordSection = {
  dateKey: string;
  title: string;
  records: TrainingRecordItem[];
};

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "daily", label: "일별" },
  { key: "weekly", label: "주별" },
  { key: "monthly", label: "월별" },
];

const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.04,
  shadowRadius: 5.3,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

const toValidDate = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getPeriodRange = (period: Period, anchorDate: Date) => {
  if (period === "weekly") {
    return {
      start: startOfWeek(anchorDate, { weekStartsOn: 0 }),
      end: endOfWeek(anchorDate, { weekStartsOn: 0 }),
    };
  }
  if (period === "monthly") {
    return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
  }
  return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
};

const formatPeriodLabel = (
  period: Period,
  anchorDate: Date,
  start: Date,
  end: Date,
) => {
  if (period === "weekly") {
    return `${format(start, "M월 d일")}~${format(end, "M월 d일")}`;
  }
  if (period === "monthly") return format(anchorDate, "yyyy년 M월");
  return format(anchorDate, "M월 d일");
};

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분 ${seconds}초`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
};

const getSectionTitle = (date: Date) =>
  isToday(date) ? "오늘" : format(date, "M월 d일");

const getRecordIcon = (
  sessionType: TrainingRecordItem["sessionType"],
): keyof typeof Ionicons.glyphMap => {
  if (sessionType === "WARMUP") return "flame";
  if (sessionType === "CUSTOM") return "create";
  return "chatbubbles";
};

function PeriodTabs({
  selected,
  onSelect,
}: {
  selected: Period;
  onSelect: (period: Period) => void;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const selectedIndex = PERIOD_TABS.findIndex((tab) => tab.key === selected);
  const indicatorWidth = Math.max(0, (containerWidth - 8) / PERIOD_TABS.length);

  useEffect(() => {
    if (indicatorWidth === 0) return;

    Animated.spring(indicatorX, {
      toValue: selectedIndex * indicatorWidth,
      damping: 20,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [indicatorWidth, indicatorX, selectedIndex]);

  return (
    <View
      className="relative flex-row p-1 overflow-hidden h-11 bg-fill-alternative rounded-control"
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {indicatorWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          className="absolute top-1 bottom-1 left-1 bg-fill-normal rounded-[6px]"
          style={{
            width: indicatorWidth,
            transform: [{ translateX: indicatorX }],
            shadowColor: "#000000",
            shadowOpacity: 0.04,
            shadowRadius: 5.3,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        />
      )}
      {PERIOD_TABS.map((tab) => {
        const isSelected = tab.key === selected;
        return (
          <TouchableOpacity
            key={tab.key}
            className="z-10 items-center justify-center flex-1"
            activeOpacity={0.8}
            onPress={() => onSelect(tab.key)}
          >
            <Text
              className={`text-body font-bold ${
                isSelected ? "text-label-normal" : "text-label-alternative"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SummaryCard({
  periodLabel,
  durationSeconds,
  recordCount,
  onPressDate,
}: {
  periodLabel: string;
  durationSeconds: number;
  recordCount: number;
  onPressDate: () => void;
}) {
  return (
    <View
      className="h-[123px] px-[22px] py-[14px] bg-background-normal rounded-component"
      style={cardShadow}
    >
      <TouchableOpacity
        className="flex-row items-center self-start"
        activeOpacity={0.7}
        onPress={onPressDate}
      >
        <Ionicons
          name="calendar"
          size={16}
          color={SEMANTIC_COLORS.line.normal}
        />
        <Text className="ml-1 text-label text-label-alternative">
          {periodLabel}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={SEMANTIC_COLORS.label.alternative}
        />
      </TouchableOpacity>

      <View className="mt-4">
        <Text className="font-bold text-title1 text-green-40">
          {formatDuration(durationSeconds)}
        </Text>
        <Text className="mt-1 font-medium text-body text-label-alternative">
          훈련 {recordCount}회
        </Text>
      </View>
    </View>
  );
}

function RecordCard({ item }: { item: TrainingRecordItem }) {
  const trainedAt = toValidDate(item.trainedAt);
  return (
    <TouchableOpacity
      className="flex-row items-center h-[82px] px-[22px] bg-background-normal rounded-component"
      style={cardShadow}
      activeOpacity={0.75}
      onPress={() =>
        router.push({
          pathname: "/record/[id]",
          params: { id: String(item.recordId) },
        })
      }
    >
      <View
        className="items-center justify-center w-[46px] h-[46px] rounded-component"
        style={{ backgroundColor: SEMANTIC_COLORS.record.iconBackground }}
      >
        <Ionicons
          name={getRecordIcon(item.sessionType)}
          size={26}
          color={SEMANTIC_COLORS.status.info}
        />
      </View>

      <View className="flex-1 ml-[10px]">
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 font-bold text-headline2 text-label-normal"
            numberOfLines={1}
          >
            {item.scenarioName}
          </Text>
          <Text className="ml-2 font-medium text-label text-line-normal">
            {trainedAt
              ? format(trainedAt, "a hh:mm", { locale: ko })
              : item.trainedAt}
          </Text>
        </View>
        <Text className="mt-1 text-label text-label-alternative">
          {formatDuration(item.durationSeconds)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RecordScreen() {
  const [period, setPeriod] = useState<Period>("daily");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const initializedAnchorRef = useRef(false);
  const { data, isLoading, isRefetching, isError, error, refetch } =
    useTrainingRecordDates();

  const allRecords = useMemo(() => {
    return [...(data?.records ?? [])].sort((a, b) => {
      const aTime = toValidDate(a.trainedAt)?.getTime() ?? 0;
      const bTime = toValidDate(b.trainedAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [data?.records]);

  useEffect(() => {
    if (initializedAnchorRef.current || isLoading) return;
    const latestDate = allRecords[0]
      ? toValidDate(allRecords[0].trainedAt)
      : null;
    if (latestDate) setAnchorDate(latestDate);
    initializedAnchorRef.current = true;
  }, [allRecords, isLoading]);

  const availableDates = useMemo(
    () => new Set(data?.dates ?? []),
    [data?.dates],
  );
  const periodRange = useMemo(
    () => getPeriodRange(period, anchorDate),
    [anchorDate, period],
  );
  const periodRecords = useMemo(
    () =>
      allRecords.filter((record) => {
        const trainedAt = toValidDate(record.trainedAt);
        return (
          trainedAt !== null &&
          isWithinInterval(trainedAt, {
            start: periodRange.start,
            end: periodRange.end,
          })
        );
      }),
    [allRecords, periodRange.end, periodRange.start],
  );

  const sections = useMemo<RecordSection[]>(() => {
    const grouped = new Map<string, TrainingRecordItem[]>();
    periodRecords.forEach((record) => {
      const trainedAt = toValidDate(record.trainedAt);
      if (!trainedAt) return;
      const dateKey = format(trainedAt, "yyyy-MM-dd");
      grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), record]);
    });

    return [...grouped.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, records]) => ({
        dateKey,
        title: getSectionTitle(new Date(`${dateKey}T00:00:00`)),
        records,
      }));
  }, [periodRecords]);

  const totalDurationSeconds = useMemo(
    () =>
      periodRecords.reduce(
        (sum, record) => sum + Math.max(0, record.durationSeconds),
        0,
      ),
    [periodRecords],
  );

  return (
    <SafeAreaView className="flex-1 bg-background-normal" edges={["top"]}>
      <Top title="훈련 기록" safeArea={false} />

      <View className="flex-1 bg-background-alternative">
        {isLoading ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator color={SEMANTIC_COLORS.primary.normal} />
          </View>
        ) : isError ? (
          <View className="items-center justify-center flex-1 px-8">
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={SEMANTIC_COLORS.status.error}
            />
            <Text className="mt-3 font-medium text-body text-label-neutral">
              불러오기 실패
            </Text>
            <Text className="mt-1 text-center text-label text-label-alternative">
              {error instanceof Error
                ? error.message
                : "잠시 후 다시 시도해 주세요."}
            </Text>
            <TouchableOpacity
              className="px-6 py-2 mt-4 bg-primary-normal rounded-control"
              onPress={() => refetch()}
            >
              <Text className="font-bold text-label text-label-buttonText">
                재시도
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1">
            <View className="px-[11px] pt-[18px]">
              <PeriodTabs selected={period} onSelect={setPeriod} />
              <View className="mt-2">
                <SummaryCard
                  periodLabel={formatPeriodLabel(
                    period,
                    anchorDate,
                    periodRange.start,
                    periodRange.end,
                  )}
                  durationSeconds={totalDurationSeconds}
                  recordCount={periodRecords.length}
                  onPressDate={() => setIsDatePickerVisible(true)}
                />
              </View>
            </View>

            <View className="relative flex-1 mt-5">
              {sections.length === 0 && (
                <View
                  pointerEvents="none"
                  className="absolute inset-0 z-0 items-center justify-center"
                >
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color={SEMANTIC_COLORS.line.normal}
                  />
                  <Text className="mt-3 text-body text-label-alternative">
                    선택한 기간에 훈련 기록이 없습니다
                  </Text>
                </View>
              )}

              <ScrollView
                className="z-10 flex-1"
                alwaysBounceVertical
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefetching}
                    tintColor={SEMANTIC_COLORS.primary.normal}
                    onRefresh={refetch}
                  />
                }
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
              >
                {sections.length > 0 && (
                  <View className="px-[11px]">
                    {sections.map((section) => (
                      <View key={section.dateKey} className="mb-5">
                        <Text className="px-3 mb-[6px] font-medium text-body text-label-normal">
                          {section.title}
                        </Text>
                        <View className="gap-y-[6px]">
                          {section.records.map((record) => (
                            <RecordCard key={record.recordId} item={record} />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      <TrainingRecordCalendarModal
        visible={isDatePickerVisible}
        selectedDate={format(anchorDate, "yyyy-MM-dd")}
        availableDates={availableDates}
        isLoading={isLoading}
        onClose={() => setIsDatePickerVisible(false)}
        onSelect={(date) => {
          setAnchorDate(new Date(`${date}T00:00:00`));
          setIsDatePickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
