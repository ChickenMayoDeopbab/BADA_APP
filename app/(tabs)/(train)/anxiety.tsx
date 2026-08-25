import { recordAnxietyScore } from "@/api/recordApi";
import GrinningFace from "@/assets/grinningFace.svg";
import ThinkingFace from "@/assets/thinkingFace.svg";
import WinkingFace from "@/assets/winkingFace.svg";
import CustomButton from "@/components/common/CustomButton";
import AnxietyScoreScale from "@/components/train/AnxietyScoreScale";
import {
  TRAIN_END_MESSAGES,
  TRAIN_END_MESSAGE_DURATION_MS,
} from "@/constants/train";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AnxietyParams = {
  sessionId?: string;
  scenarioId?: string;
  mode?: "scenario" | "warmUp";
  title?: string;
  content?: string;
  isCustom?: string;
  scenarioImage?: string;
  category?: string;
};

const FACE_SIZE = 68;

/** 안내 메시지에 붙는 이모지 얼굴 */
function MessageFace({ face }: { face: (typeof TRAIN_END_MESSAGES)[number]["face"] }) {
  if (face === "thinking") return <ThinkingFace width={FACE_SIZE} height={FACE_SIZE} />;
  if (face === "grinning") return <GrinningFace width={FACE_SIZE} height={FACE_SIZE} />;
  return <WinkingFace width={FACE_SIZE} height={FACE_SIZE} />;
}

const LAST_MESSAGE_INDEX = TRAIN_END_MESSAGES.length - 1;

export default function Anxiety() {
  const params = useLocalSearchParams<AnxietyParams>();
  const { sessionId } = params;

  const [messageIndex, setMessageIndex] = useState(0);
  const [isScoreVisible, setIsScoreVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 안드로이드 뒤로 가기로는 훈련 중간 상태로 되돌아갈 수 없게 막는다
  useAndroidBackHandler(() => true);

  /** 안내 메시지를 일정 시간마다 자동으로 넘기고, 마지막 메시지에서 점수 입력을 연다 */
  useEffect(() => {
    if (isScoreVisible) return;

    const timeout = setTimeout(() => {
      if (messageIndex < LAST_MESSAGE_INDEX) {
        setMessageIndex((prev) => prev + 1);
        return;
      }
      setIsScoreVisible(true);
    }, TRAIN_END_MESSAGE_DURATION_MS);

    return () => clearTimeout(timeout);
  }, [messageIndex, isScoreVisible]);

  /** 건너뛰기: 남은 안내 메시지를 생략하고 바로 점수를 입력한다 */
  const handleSkip = () => {
    setMessageIndex(LAST_MESSAGE_INDEX);
    setIsScoreVisible(true);
  };

  /** 불안 점수를 기록하고 리포트로 이동 — 기록에 실패해도 리포트는 보여준다 */
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (sessionId) {
      try {
        await recordAnxietyScore(sessionId, { score });
      } catch {
        // 점수 기록 실패는 리포트 열람을 막을 이유가 아니라 조용히 넘어간다
      }
    }

    router.replace({ pathname: "/(tabs)/(train)/report", params });
  };

  const message = TRAIN_END_MESSAGES[messageIndex];

  return (
    <SafeAreaView className="flex-1 bg-background-normal">
      {isScoreVisible ? (
        <View className="flex-1 px-[33px]">
          <View className="items-center gap-y-[14px] pt-[105px]">
            <MessageFace face={message.face} />
            <Text className="text-title2 font-bold text-label-normal text-center">
              {message.text}
            </Text>
          </View>

          <View className="mt-auto">
            <AnxietyScoreScale score={score} onChange={setScore} />
          </View>

          <View className="pt-[82px] pb-4">
            <CustomButton
              label={isSubmitting ? "기록 중..." : "훈련 마치기"}
              tone="primary"
              disabled={isSubmitting}
              onPress={handleSubmit}
            />
          </View>
        </View>
      ) : (
        <View className="flex-1 px-[33px]">
          <View className="flex-1 items-center justify-center gap-y-[14px]">
            <MessageFace face={message.face} />
            <Text className="text-title2 font-bold text-label-normal text-center">
              {message.text}
            </Text>
          </View>

          {/* 첫 메시지에는 건너뛰기를 두지 않아 안내를 한 번은 읽게 한다 */}
          {messageIndex > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={handleSkip}
              hitSlop={12}
              className="flex-row items-center justify-center gap-x-[2px] pb-[45px] active:opacity-70"
            >
              <Text className="text-label font-medium text-label-alternative">
                건너뛰기
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={SEMANTIC_COLORS.label.alternative}
              />
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
