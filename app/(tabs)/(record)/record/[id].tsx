import { PlayingButton } from "@/components/PlayingButton";
import { useTrainingRecordDetail } from "@/hooks/useTrainingRecordDetail";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DetailParams = {
  id: string;
};

const formatDurationText = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}분 ${seconds}초`;
};

const formatDateText = (isoString: string): string => {
  try {
    return format(new Date(isoString), "yyyy.MM.dd");
  } catch {
    return isoString;
  }
};

const formatTimeRange = (startSecond: number, endSecond: number): string => {
  const toMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  return `${toMMSS(startSecond)}~${toMMSS(endSecond)}`;
};

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<DetailParams>();
  const recordId = Number(id);

  const { data, isLoading, isError, refetch } =
    useTrainingRecordDetail(recordId);

  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE]">
      <View className="flex-row items-center justify-center px-8 mt-10 mb-14">
        <TouchableOpacity
          onPress={() => router.push("/record")}
          className="absolute left-8"
        >
          <Ionicons name="chevron-back" size={24} color="#3B3D3E" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#3B3D3E]">훈련 기록</Text>
      </View>

      {isLoading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator color="#0AE365" />
        </View>
      ) : isError || !data ? (
        <View className="items-center justify-center flex-1 gap-y-3">
          <Ionicons name="alert-circle-outline" size={48} color="#F65C5C" />
          <Text className="text-base font-medium text-[#3B3D3E]">
            불러오기 실패
          </Text>
          <TouchableOpacity
            className="px-6 py-2 rounded-lg bg-[#0AE365] mt-2"
            onPress={() => refetch()}
          >
            <Text className="font-semibold text-white">재시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-8"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-2xl font-bold text-[#3B3D3E] mb-1">
            {formatDateText(data.trainedAt)} 훈련
          </Text>
          <Text className="text-sm text-[#5C5E5E] mb-1">
            시나리오명{" "}
            <Text className="font-semibold text-[#3B3D3E]">
              {data.scenarioName}
            </Text>
          </Text>
          <Text className="text-sm text-[#5C5E5E] mb-6">
            훈련시간{" "}
            <Text className="font-semibold text-[#3B3D3E]">
              {formatDurationText(data.durationSeconds)}
            </Text>
          </Text>

          <View className="bg-[#F5F5F5] rounded-xl px-5 py-4 mb-4">
            <Text className="text-base font-bold text-[#3B3D3E] mb-4">
              녹음본 듣기
            </Text>
            <View className="flex-row items-center gap-x-3">
              <PlayingButton audioUrl={data.recordingUrl} />
              <View className="flex-1 h-[2px] bg-[#FEFEFE] rounded-full" />
            </View>
          </View>

          {data.positiveFeedbacks.length > 0 && (
            <View className="bg-[#F5F5F5] rounded-xl px-5 py-4 mb-8">
              <Text className="text-base font-bold text-[#3B3D3E] mb-4">
                이 부분이 좋았어요.
              </Text>
              <View className="flex-row gap-x-3">
                {data.positiveFeedbacks.map((part, index) => (
                  <View
                    key={`${part.startSecond}-${index}`}
                    className="items-center flex-1 px-3 py-3 bg-white rounded-2xl"
                  >
                    <Text className="text-xs text-[#3B3D3E] text-center mb-3">
                      {part.good_point}
                    </Text>
                    <Text className="text-xs text-[#8C8E8E] mb-3">
                      {formatTimeRange(part.startSecond, part.endSecond)}
                    </Text>
                    <PlayingButton audioUrl={part.audioUrl} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
