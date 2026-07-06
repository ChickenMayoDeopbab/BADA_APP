import { TrainingRecordItem } from "@/api/types";
import { SORT_OPTIONS, SORT_PARAM_MAP } from "@/constants/recordConsts";
import { useTrainingRecords } from "@/hooks/useTrainingRecords";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCROLL_TOP_VISIBLE_OFFSET = 200;

const formatDate = (isoString: string): string => {
  try {
    return format(new Date(isoString), "yyyy.MM.dd");
  } catch {
    return isoString;
  }
};

const formatDuration = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function RecordScreen() {
  const flatListRef = useRef<FlatList<TrainingRecordItem>>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [selectedSort, setSelectedSort] = useState<string>("최신 순");
  const [isScrollTopVisible, setIsScrollTopVisible] =
    useState<boolean>(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] =
    useState<boolean>(false);

  const dateParam = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : undefined;

  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
    refetch,
  } = useTrainingRecords({
    sort: SORT_PARAM_MAP[selectedSort],
    date: dateParam,
  });

  const records: TrainingRecordItem[] = useMemo(() => {
    return data?.pages.flatMap((page) => page.content) ?? [];
  }, [data]);

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const shouldShow =
      event.nativeEvent.contentOffset.y >= SCROLL_TOP_VISIBLE_OFFSET;

    setIsScrollTopVisible((prev) =>
      prev === shouldShow ? prev : shouldShow,
    );
  };

  const handleScrollTopPress = () => {
    flatListRef.current?.scrollToOffset({
      offset: 0,
      animated: true,
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setIsDatePickerVisible(false);
    }
    if (event.type === "dismissed") return;
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <SafeAreaView className="items-center flex-1 px-8 bg-[#FEFEFE]">
      <Text className="text-xl font-bold text-[#3B3D3E] mt-10 mb-7">
        훈련 기록
      </Text>

      <View className="flex-row w-full mb-5 gap-x-3">
        <View>
          <TouchableOpacity
            onPress={() => setIsVisible(true)}
            className="flex-row items-center justify-between bg-[#EBEBEC] rounded-lg px-4"
            style={{ width: 116, height: 32 }}
          >
            <Text className="text-[#5C5E5E] text-sm">{selectedSort}</Text>
            <Ionicons name="chevron-down" size={14} color="#BDBEBE" />
          </TouchableOpacity>

          <Modal visible={isVisible} transparent animationType="fade">
            <TouchableOpacity
              className="flex-1"
              onPress={() => setIsVisible(false)}
            >
              <View
                className="absolute w-[116px] overflow-hidden shadow-lg bg-[#EBEBEC] rounded-2xl"
                style={{ top: 116, left: 28 }}
              >
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className="px-4 py-4"
                    onPress={() => {
                      setSelectedSort(option);
                      setIsVisible(false);
                    }}
                  >
                    <Text
                      className={`text-sm ${
                        selectedSort === option
                          ? "text-[#0AE365] font-semibold"
                          : "text-[#5C5E5E]"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-between h-[32px] bg-[#EBEBEC] rounded-lg px-4"
          onPress={() => setIsDatePickerVisible(true)}
        >
          <Text className={selectedDate ? "text-[#3B3D3E]" : "text-[#BDBEBE]"}>
            {selectedDate ? format(selectedDate, "yyyy-MM-dd") : "YYYY-MM-DD"}
          </Text>
          <Ionicons name="calendar-outline" size={16} color="#BDBEBE" />
        </TouchableOpacity>

        {selectedDate && (
          <TouchableOpacity
            className="items-center justify-center w-8 h-8 bg-[#EBEBEC] rounded-lg"
            onPress={() => setSelectedDate(null)}
          >
            <Ionicons name="close" size={16} color="#5C5E5E" />
          </TouchableOpacity>
        )}
      </View>

      {isDatePickerVisible && (
        <DateTimePicker
          value={selectedDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      <View className="flex-row justify-between w-full pb-2 border-b border-[#BDBEBE]">
        <Text className="text-[#5C5E5E] font-bold text-sm">일시</Text>
        <Text className="text-[#5C5E5E] font-bold text-sm">시나리오명</Text>
      </View>

      {isLoading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator color="#0AE365" />
        </View>
      ) : isError ? (
        <View className="items-center justify-center flex-1 gap-y-3">
          <Ionicons name="alert-circle-outline" size={48} color="#F65C5C" />
          <Text className="text-base text-[#3B3D3E] font-medium">
            불러오기 실패
          </Text>
          <Text className="text-sm text-[#8C8E8E] text-center px-6">
            {error instanceof Error
              ? error.message
              : "잠시 후 다시 시도해 주세요."}
          </Text>
          <TouchableOpacity
            className="px-6 py-2 rounded-lg bg-[#0AE365] mt-2"
            onPress={() => refetch()}
          >
            <Text className="font-semibold text-white">재시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="relative flex-1 w-full">
          <FlatList
            ref={flatListRef}
            data={records}
            keyExtractor={(item) => String(item.recordId)}
            showsVerticalScrollIndicator={false}
            className="w-full"
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            contentContainerStyle={
              records.length === 0 ? { flexGrow: 1 } : undefined
            }
            ListEmptyComponent={
              <View className="items-center justify-center flex-1 py-20">
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color="#BDBEBE"
                />
                <Text className="mt-3 text-base text-[#8C8E8E]">
                  {selectedDate
                    ? "해당 날짜에 기록된 훈련이 없습니다"
                    : "아직 기록된 훈련이 없습니다"}
                </Text>
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator className="my-4" color="#0AE365" />
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center justify-between py-4"
                onPress={() =>
                  router.push({
                    pathname: "/record/[id]",
                    params: {
                      id: String(item.recordId),
                    },
                  })
                }
              >
                <Text className="text-lg font-medium text-black">
                  {formatDate(item.trainedAt)}
                </Text>

                <View className="items-end">
                  <Text className="text-lg font-medium text-black">
                    {item.scenarioName}
                  </Text>
                  <Text className="text-xs text-[#8C8E8E] mt-0.5">
                    {formatDuration(item.durationSeconds)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />

          {isScrollTopVisible && (
            <TouchableOpacity
              className="absolute items-center justify-center bg-[#0AE365]"
              style={{
                bottom: 24,
                alignSelf: "center",
                width: 44,
                height: 44,
                borderRadius: 22,
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
              activeOpacity={0.8}
              onPress={handleScrollTopPress}
            >
              <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
