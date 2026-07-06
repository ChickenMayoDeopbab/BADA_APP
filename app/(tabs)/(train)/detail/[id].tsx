import { getScenarioExample } from "@/api/trainApi";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  ScrollView,
  Text,
  View,
} from "react-native";

const fallbackLargeImage: ImageSourcePropType = require("@/assets/Q1_l.png");

// 카테고리별 대형 이미지 폴백
const categoryLargeImageMap: Record<string, ImageSourcePropType> = {
  restaurant: require("@/assets/Q1_l.png"),
  hospital: require("@/assets/Q2_l.png"),
  complaint: require("@/assets/Q3_l.png"),
  delivery: require("@/assets/Q3_l.png"),
  bank: require("@/assets/Q2_l.png"),
  custom: require("@/assets/Q1_l.png"),
};

export default function Detail() {
  const [exampleAudioUrl, setExampleAudioUrl] = useState<string | null>(null);
  const [isFetchingExample, setIsFetchingExample] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const examplePlayer = useAudioPlayer(
    exampleAudioUrl ? { uri: exampleAudioUrl } : null,
  );
  const exampleStatus = useAudioPlayerStatus(examplePlayer);

  const { id, title, content, isCustom, scenarioImage, category } =
    useLocalSearchParams<{
      id: string;
      title: string;
      content: string;
      isCustom: string;
      scenarioImage: string;
      category: string;
    }>();

  useEffect(() => {
    if (!shouldAutoPlay || !exampleStatus.isLoaded) return;

    examplePlayer.play();
    setShouldAutoPlay(false);
  }, [examplePlayer, exampleStatus.isLoaded, shouldAutoPlay]);

  const handleExamplePress = async () => {
    if (exampleStatus.playing) {
      examplePlayer.pause();
      return;
    }

    if (exampleAudioUrl) {
      if (exampleStatus.didJustFinish) {
        await examplePlayer.seekTo(0);
      }
      examplePlayer.play();
      return;
    }

    const scenarioId = id?.trim();
    if (!scenarioId) {
      Alert.alert("오류", "올바르지 않은 시나리오입니다.");
      return;
    }

    try {
      setIsFetchingExample(true);
      const example = await getScenarioExample(scenarioId);
      const audioUrl = example.audio_url?.trim();

      if (!audioUrl) {
        throw new Error("예시 대화 오디오가 없습니다.");
      }

      setShouldAutoPlay(true);
      setExampleAudioUrl(audioUrl);
    } catch (error) {
      console.error("[ScenarioExample] 예시 대화 조회 실패", error);
      Alert.alert(
        "재생 실패",
        error instanceof Error
          ? error.message
          : "예시 대화를 불러오지 못했습니다.",
      );
    } finally {
      setIsFetchingExample(false);
    }
  };

  if (!id || !title) {
    return (
      <View className="flex-1 bg-white">
        <Top title="시나리오 선택" back onBack={() => router.push("/(tabs)/(train)/list")} />
        <View className="items-center justify-center flex-1">
          <Text className="text-base text-[#5C5E5E]">시나리오를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  const imageSource: ImageSourcePropType = scenarioImage
    ? { uri: scenarioImage }
    : (categoryLargeImageMap[category ?? ""] ?? fallbackLargeImage);

  const typeLabel =
    isCustom === "true" ? "커스텀 시나리오" : "기본 제공 시나리오";

  return (
    <View className="flex-1 bg-white">
      <Top title="시나리오 선택" back onBack={() => router.push("/(tabs)/(train)/list")} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Image
          source={imageSource}
          className="w-full"
          style={{ height: 240 }}
          resizeMode="cover"
        />
        <View className="px-8 pt-5 pb-6">
          <Text className="text-base text-[#5C5E5E] font-medium mb-2">{typeLabel}</Text>
          <Text className="text-3xl font-bold text-[#3B3D3E] mb-6">{title}</Text>
          <Text className="text-sm font-semibold text-[#BDBEBE] mb-1">시나리오 설명</Text>
          <Text className="text-sm text-[#5C5E5E] leading-6">{content}</Text>
        </View>
      </ScrollView>
      <View className="px-8 pt-4 pb-10 gap-y-3">
        <CustomButton
          label={
            isFetchingExample
              ? "예시 대화 불러오는 중"
              : exampleStatus.playing
                ? "예시 대화 일시정지"
                : "예시 대화 들어보기"
          }
          color="#3B3D3E"
          disabled={
            isFetchingExample || Boolean(exampleAudioUrl && !exampleStatus.isLoaded)
          }
          icon={
            isFetchingExample || (exampleAudioUrl && !exampleStatus.isLoaded) ? (
              <ActivityIndicator size="small" color="#3B3D3E" />
            ) : undefined
          }
          onPress={handleExamplePress}
        />
        <CustomButton
          label="선택하기"
          backgroundColor="#0AE365"
          color="white"
          onPress={() =>
            router.push({ pathname: "/(tabs)/(train)/start", params: { id } })
          }
        />
      </View>
    </View>
  );
}
