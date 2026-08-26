import { getScenarioExample, getScenarios } from "@/api/trainApi";
import { ScenarioInfo } from "@/api/types";
import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { getAccessToken } from "@/utils/authTokenStorage";
import { isCancel } from "axios";
import { AudioSource, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";

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
  useAndroidBackHandler(() => {
    router.replace("/(tabs)/(train)/list");
    return true;
  });

  const [exampleAudioSource, setExampleAudioSource] = useState<AudioSource>(null);
  const [isFetchingExample, setIsFetchingExample] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  // params 없이 id로만 진입했을 때 목록에서 시나리오를 복원한다
  const [resolvedScenario, setResolvedScenario] =
    useState<ScenarioInfo | null>(null);
  const [isResolvingScenario, setIsResolvingScenario] = useState(false);
  const examplePlayer = useAudioPlayer(exampleAudioSource);
  const exampleStatus = useAudioPlayerStatus(examplePlayer);
  const examplePlayerRef = useRef(examplePlayer);
  const exampleRequestControllerRef = useRef<AbortController | null>(null);
  examplePlayerRef.current = examplePlayer;

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
    if (!id || title) return;

    let cancelled = false;
    setIsResolvingScenario(true);
    getScenarios()
      .then(({ scenarios }) => {
        if (!cancelled) {
          setResolvedScenario(
            scenarios.find((scenario) => String(scenario.scenario_id) === id) ?? null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedScenario(null);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingScenario(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, title]);

  const resolvedTitle = title ?? resolvedScenario?.title;
  const resolvedContent = content ?? resolvedScenario?.content;
  const resolvedIsCustom = isCustom ?? String(resolvedScenario?.is_custom ?? false);
  const resolvedScenarioImage = scenarioImage ?? resolvedScenario?.scenario_image ?? "";
  const resolvedCategory = category ?? resolvedScenario?.category;

  const stopExample = useCallback(() => {
    const requestController = exampleRequestControllerRef.current;
    exampleRequestControllerRef.current = null;
    requestController?.abort();

    const player = examplePlayerRef.current;
    player.pause();

    setIsFetchingExample(false);
    setShouldAutoPlay(false);
    setExampleAudioSource(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 이전 화면 인스턴스가 스택에 남아 다시 포커스되는 경우에도
      // 네이티브 플레이어의 오래된 재생 상태를 초기화한다.
      stopExample();
      return stopExample;
    }, [stopExample]),
  );

  useEffect(() => {
    if (!shouldAutoPlay || !exampleStatus.isLoaded) return;

    examplePlayer.play();
    setShouldAutoPlay(false);
  }, [examplePlayer, exampleStatus.isLoaded, shouldAutoPlay]);

  const handleExamplePress = async () => {
    const isExampleLoading =
      isFetchingExample || Boolean(exampleAudioSource && !exampleStatus.isLoaded);

    if (isExampleLoading) {
      stopExample();
      return;
    }

    if (exampleAudioSource) {
      if (exampleStatus.playing) {
        examplePlayer.pause();
        return;
      }

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

    const requestController = new AbortController();
    exampleRequestControllerRef.current = requestController;

    try {
      setIsFetchingExample(true);
      const example = await getScenarioExample(
        scenarioId,
        requestController.signal,
      );
      const audioUrl = example.audio_url?.trim();

      if (!audioUrl) {
        throw new Error("예시 대화 오디오가 없습니다.");
      }

      const apiBaseUrl = process.env.EXPO_PUBLIC_AI_API_URL;
      const resolvedAudioUrl = apiBaseUrl
        ? new URL(audioUrl, `${apiBaseUrl.replace(/\/$/, "")}/`).toString()
        : audioUrl;
      const accessToken = await getAccessToken();
      const isAiApiAudio = Boolean(
        accessToken &&
          apiBaseUrl &&
          new URL(resolvedAudioUrl).origin === new URL(apiBaseUrl).origin,
      );

      if (requestController.signal.aborted) return;

      setShouldAutoPlay(true);
      setExampleAudioSource({
        uri: resolvedAudioUrl,
        ...(isAiApiAudio
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : {}),
      });
    } catch (error) {
      if (requestController.signal.aborted || isCancel(error)) return;

      console.error("[ScenarioExample] 예시 대화 조회 실패", error);
      Alert.alert(
        "재생 실패",
        error instanceof Error
          ? error.message
          : "예시 대화를 불러오지 못했습니다.",
      );
    } finally {
      if (exampleRequestControllerRef.current === requestController) {
        exampleRequestControllerRef.current = null;
        setIsFetchingExample(false);
      }
    }
  };

  if (!id || (!resolvedTitle && !isResolvingScenario)) {
    return (
      <View className="flex-1 bg-white">
        <Top title="시나리오 선택" back onBack={() => router.push("/(tabs)/(train)/list")} />
        <View className="items-center justify-center flex-1">
          <Text className="text-base text-[#5C5E5E]">시나리오를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  if (isResolvingScenario) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator color="#0AE365" />
      </View>
    );
  }

  const imageSource: ImageSourcePropType = resolvedScenarioImage
    ? { uri: resolvedScenarioImage }
    : (categoryLargeImageMap[resolvedCategory ?? ""] ?? fallbackLargeImage);

  const typeLabel =
    resolvedIsCustom === "true" ? "커스텀 시나리오" : "기본 제공 시나리오";
  const isExampleLoading =
    isFetchingExample || Boolean(exampleAudioSource && !exampleStatus.isLoaded);
  const isExamplePlaying = Boolean(exampleAudioSource && exampleStatus.playing);

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
          <Text className="text-3xl font-bold text-[#3B3D3E] mb-6">{resolvedTitle}</Text>
          <Text className="text-sm font-semibold text-[#BDBEBE] mb-1">시나리오 설명</Text>
          <Text className="text-sm text-[#5C5E5E] leading-6">{resolvedContent}</Text>
        </View>
      </ScrollView>
      <View className="px-8 pt-4 pb-10 gap-y-3">
        <CustomButton
          label={
            isExampleLoading
              ? "예시 대화 불러오기 중단"
              : isExamplePlaying
                ? "예시 대화 일시정지"
                : "예시 대화 들어보기"
          }
          color="#3B3D3E"
          icon={
            isExampleLoading ? (
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
            router.push({
              pathname: "/(tabs)/(train)/start",
              params: {
                id,
                title: resolvedTitle,
                content: resolvedContent,
                isCustom: resolvedIsCustom,
                scenarioImage: resolvedScenarioImage,
                category: resolvedCategory,
              },
            })
          }
        />
      </View>
    </View>
  );
}
