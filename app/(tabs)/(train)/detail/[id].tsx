import { getScenarioExample } from "@/api/trainApi";
import CustomButton from "@/components/common/CustomButton";
import GlassChip from "@/components/train/GlassChip";
import GradientOverlay from "@/components/train/GradientOverlay";
import TrainingCountLabel from "@/components/train/TrainingCountLabel";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useScenario } from "@/hooks/useScenarios";
import { getAccessToken } from "@/utils/authTokenStorage";
import { getScenarioThumbnail } from "@/utils/scenarioImage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { isCancel } from "axios";
import { AudioSource, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: scenario, isPending, isError, refetch } = useScenario(id);

  const [exampleAudioSource, setExampleAudioSource] = useState<AudioSource>(null);
  const [isFetchingExample, setIsFetchingExample] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const examplePlayer = useAudioPlayer(exampleAudioSource);
  const exampleStatus = useAudioPlayerStatus(examplePlayer);
  const examplePlayerRef = useRef(examplePlayer);
  const exampleRequestControllerRef = useRef<AbortController | null>(null);
  examplePlayerRef.current = examplePlayer;

  // 닫힘 애니메이션이 도는 동안 두 번째 닫기가 들어오면 뒤 화면까지 pop된다
  const isClosingRef = useRef(false);

  /** 바텀시트 닫기 (뒤로 갈 곳이 없으면 목록으로) */
  const handleDismiss = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/(train)/list");
  }, []);

  useAndroidBackHandler(() => {
    handleDismiss();
    return true;
  });

  // 아래로 끌어내려 닫는 제스처
  const dragY = useRef(new Animated.Value(0)).current;
  const sheetHeightRef = useRef(0);
  const handleDismissRef = useRef(handleDismiss);
  handleDismissRef.current = handleDismiss;

  const panResponder = useRef(
    PanResponder.create({
      // 아래 방향으로 끌 때만 시트가 제스처를 가져간다(버튼 탭은 그대로 동작)
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) dragY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        const sheetHeight = sheetHeightRef.current || 400;
        // 시트 높이의 30% 이상 내렸거나 빠르게 튕기면 닫는다
        const shouldClose = gesture.dy > sheetHeight * 0.3 || gesture.vy > 0.8;

        if (shouldClose) {
          if (isClosingRef.current) return;
          Animated.timing(dragY, {
            toValue: sheetHeight + 80,
            duration: 180,
            useNativeDriver: true,
          }).start(() => handleDismissRef.current());
          return;
        }

        Animated.spring(dragY, {
          toValue: 0,
          bounciness: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          bounciness: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  // 시트를 내릴수록 뒤 배경도 함께 옅어진다
  const backdropOpacity = dragY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const stopExample = useCallback(() => {
    const requestController = exampleRequestControllerRef.current;
    exampleRequestControllerRef.current = null;
    requestController?.abort();

    // 네이티브 플레이어 정리는 실패할 수 있어 통째로 감싼다.
    // - 화면이 사라진 뒤 정리가 돌면 플레이어가 이미 해제돼 있다
    //   (ERR_USING_RELEASED_SHARED_OBJECT)
    // - Android의 expo-audio는 replace(null)을 거부한다 (ERR_NULL_ARGUMENT)
    // 소스는 아래 setExampleAudioSource(null)로 어차피 해제되므로 실패는 무시한다.
    try {
      const player = examplePlayerRef.current;
      player.pause();
      player.replace(null);
    } catch {
      // 이미 해제됐거나 null 해제를 지원하지 않는 플랫폼
    }

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

  const isExampleLoading =
    isFetchingExample || Boolean(exampleAudioSource && !exampleStatus.isLoaded);
  const isExamplePlaying = Boolean(exampleAudioSource && exampleStatus.playing);

  const handleExamplePress = async () => {
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

  /** 훈련 시작 설정 화면으로 이동 */
  const handleStart = () => {
    if (!scenario) return;

    /*
      상세는 목록 위에 뜬 모달이라, 닫지 않으면 훈련 흐름 내내 화면 위에 남고
      뒤따르는 화면들이 모달 컨텍스트를 물려받아 시트로 그려진다. 먼저 닫는다.
    */
    if (router.canGoBack() && !isClosingRef.current) {
      isClosingRef.current = true;
      router.back();
    }

    router.push({
      pathname: "/start",
      params: {
        id: String(scenario.scenario_id),
        title: scenario.title,
        content: scenario.content,
        isCustom: String(scenario.is_custom),
        scenarioImage: scenario.scenario_image ?? "",
        category: scenario.category,
      },
    });
  };

  return (
    <View className="flex-1 justify-end">
      {/* 시트 바깥을 누르면 닫힌다 */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.2)", opacity: backdropOpacity },
        ]}
      >
        <Pressable className="flex-1" onPress={handleDismiss} />
      </Animated.View>

      {/*
        NativeWind는 Animated.View에 className을 적용하지 않는다.
        애니메이션 래퍼(style만)와 실제 스타일을 입히는 View를 분리한다.
      */}
      <Animated.View
        {...panResponder.panHandlers}
        onLayout={({ nativeEvent }) => {
          sheetHeightRef.current = nativeEvent.layout.height;
        }}
        style={{
          transform: [{ translateY: dragY }],
          // 탭 바 안쪽에 떠서 하단 인셋은 이미 확보돼 있다
          marginBottom: 11,
        }}
      >
        <View
          className="mx-[11px] gap-y-4 overflow-hidden rounded-dialog bg-background-normal px-[22px] pt-2 pb-[22px]"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 32.9,
            shadowOffset: { width: 0, height: 0 },
            elevation: 12,
          }}
        >
        <View className="h-3 items-center justify-center">
          <View className="h-[5px] w-[100px] rounded-pill bg-line-neutral" />
        </View>

        {/* 시나리오 정보를 아직 못 받았을 때 */}
        {isPending ? (
          <View className="h-[163px] items-center justify-center">
            <ActivityIndicator color="#0AE365" />
          </View>
        ) : isError ? (
          /* 목록 조회 자체가 실패한 경우 — 재시도를 제공한다 */
          <View className="h-[163px] items-center justify-center gap-y-3">
            <Text className="text-body text-label-alternative">
              시나리오를 불러오지 못했습니다.
            </Text>
            <CustomButton
              label="다시 시도"
              backgroundColor="#0AE365"
              color="white"
              variant="md"
              onPress={() => refetch()}
            />
          </View>
        ) : !scenario ? (
          <View className="h-[163px] items-center justify-center">
            <Text className="text-body text-label-alternative">
              시나리오를 찾을 수 없습니다.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row gap-x-4">
              <View className="h-[163px] w-[163px] overflow-hidden rounded-control border border-line-alternative">
                <Image
                  source={getScenarioThumbnail(
                    scenario.scenario_image,
                    scenario.category,
                  )}
                  // require() 에셋은 원본 크기가 인라인 스타일로 새어 컨테이너를 벗어난다.
                  // 크기를 명시해 컨테이너를 정확히 채운다(여백 없음, 넘치는 부분은 cover가 잘라냄).
                  style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
                  resizeMode="cover"
                />
                <GradientOverlay direction="bottom" style={{ top: "32%" }} />
                {/* 패딩은 콘텐츠에만 준다. 컨테이너에 주면 절대배치 이미지가 그만큼 작아져 여백이 생긴다. */}
                <View className="flex-1 items-end justify-end p-3">
                  <GlassChip onPress={handleExamplePress}>
                    {isExampleLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons
                        name={isExamplePlaying ? "pause" : "play"}
                        size={12}
                        color="white"
                      />
                    )}
                    <Text className="text-label font-medium text-white">
                      예시 대화 듣기
                    </Text>
                  </GlassChip>
                </View>
              </View>

              <View className="flex-1 gap-y-3">
                <View className="gap-y-[2px]">
                  <Text className="text-caption font-medium text-label-alternative">
                    {scenario.is_copied
                      ? "공유받은 시나리오"
                      : scenario.is_custom
                        ? "커스텀 시나리오"
                        : "기본 제공 시나리오"}
                  </Text>
                  <Text className="text-headline1 font-bold text-label-normal">
                    {scenario.title}
                  </Text>
                  <TrainingCountLabel
                    count={scenario.practice_count ?? 0}
                    size="md"
                    color="#5C5E5E"
                  />
                </View>
                <Text className="text-label font-medium text-label-neutral">
                  {scenario.content}
                </Text>
              </View>
            </View>

            <CustomButton
              label="훈련 시작하기"
              backgroundColor="#0AE365"
              onPress={handleStart}
            />
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
