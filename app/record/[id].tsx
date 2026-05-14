import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DetailParams = {
  id: string;
  date: string;
  scenarioName: string;
};

const GOOD_PARTS = [
  { id: "1", summary: "좋았던 내용\n요약 정리", time: "1:31~1:40" },
  { id: "2", summary: "좋았던 내용\n요약 정리", time: "2:06~2:13" },
  { id: "3", summary: "좋았던 내용\n요약 정리", time: "1:31~1:40" },
];

function PlayingButton() {
  const [play, setPlay] = useState(false);

  return (
    <TouchableOpacity onPress={() => setPlay(!play)}>
      <View className="w-10 h-10 rounded-full bg-[#0AE365] items-center justify-center">
        <Ionicons name={play ? "stop" : "play"} size={16} color="white" />
      </View>
    </TouchableOpacity>
  );
}


export default function RecordDetailScreen() {
  const { id, date, scenarioName } = useLocalSearchParams<DetailParams>();

  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE]">
      <View className="flex-row items-center justify-center px-8 mt-4 mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-8"
        >
          <Ionicons name="chevron-back" size={24} color="#3B3D3E" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#3B3D3E]">훈련 기록</Text>
      </View>

      <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-[#3B3D3E] mb-1">
          {date} 훈련
        </Text>
        <Text className="text-sm text-[#5C5E5E] mb-1">
          시나리오명{" "}
          <Text className="font-semibold text-[#3B3D3E]">{scenarioName}</Text>
        </Text>
        <Text className="text-sm text-[#5C5E5E] mb-6">
          훈련시간{" "}
          <Text className="font-semibold text-[#3B3D3E]">2분 13초</Text>
        </Text>

        <View className="bg-[#F2F2F3] rounded-2xl px-5 py-4 mb-4">
          <Text className="text-base font-bold text-[#3B3D3E] mb-4">
            녹음본 듣기
          </Text>
          <View className="flex-row items-center gap-x-3">
            <PlayingButton />
            <View className="flex-1 h-[2px] bg-[#BDBEBE] rounded-full" />
          </View>
        </View>

        <View className="bg-[#F2F2F3] rounded-2xl px-5 py-4 mb-8">
          <Text className="text-base font-bold text-[#3B3D3E] mb-4">
            이 부분이 좋았어요.
          </Text>
          <View className="flex-row gap-x-3">
            {GOOD_PARTS.map((part) => (
              <View
                key={part.id}
                className="items-center flex-1 px-3 py-3 bg-white rounded-2xl"
              >
                <Text className="text-xs text-[#3B3D3E] text-center mb-3">
                  {part.summary}
                </Text>
                <Text className="text-xs text-[#BDBEBE] mb-3">{part.time}</Text>
                <PlayingButton />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
