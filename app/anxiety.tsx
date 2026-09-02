import { recordAnxietyScore } from "@/api/recordApi";
import GrinningFace from "@/assets/grinningFace.svg";
import ThinkingFace from "@/assets/thinkingFace.svg";
import WinkingFace from "@/assets/winkingFace.svg";
import CustomButton from "@/components/common/CustomButton";
import AnxietyScoreScale from "@/components/train/AnxietyScoreScale";
import {
  TRAIN_END_MESSAGES,
  TRAIN_END_MESSAGE_HOLD_MS,
  TRAIN_END_MESSAGE_TYPING_MS,
} from "@/constants/train";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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

/** 안내 메시지를 보여줄 때 이모지가 놓이는 위치 */
const MESSAGE_HEADER_TOP = 289;
/** 점수 입력이 열렸을 때 이모지가 올라가는 위치 */
const SCORE_HEADER_TOP = 105;
/** 헤더가 올라가는 데 걸리는 시간(ms) */
const HEADER_RISE_MS = 500;

export default function Anxiety() {
  const params = useLocalSearchParams<AnxietyParams>();
  const { sessionId } = params;

  const [messageIndex, setMessageIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [isScoreVisible, setIsScoreVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 안드로이드 뒤로 가기로는 훈련 중간 상태로 되돌아갈 수 없게 막는다
  useAndroidBackHandler(() => true);

  // 점수 입력이 열리면 이모지·문구가 위로 올라간다
  const headerTop = useSharedValue(MESSAGE_HEADER_TOP);
  const headerStyle = useAnimatedStyle(() => ({ paddingTop: headerTop.value }));

  useEffect(() => {
    headerTop.value = withTiming(
      isScoreVisible ? SCORE_HEADER_TOP : MESSAGE_HEADER_TOP,
      { duration: HEADER_RISE_MS, easing: Easing.out(Easing.cubic) },
    );
  }, [isScoreVisible, headerTop]);

  const message = TRAIN_END_MESSAGES[messageIndex];
  const isTypingDone = typedLength >= message.text.length;

  /** 메시지가 바뀌면 처음부터 한 글자씩 타이핑한다 */
  useEffect(() => {
    if (isScoreVisible) return;

    setTypedLength(0);
    const interval = setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= message.text.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, TRAIN_END_MESSAGE_TYPING_MS);

    return () => clearInterval(interval);
  }, [message.text, isScoreVisible]);

  /** 타이핑이 끝나면 잠시 두었다가 다음 메시지로, 마지막이면 점수 입력을 연다 */
  useEffect(() => {
    if (isScoreVisible || !isTypingDone) return;

    const timeout = setTimeout(() => {
      if (messageIndex < LAST_MESSAGE_INDEX) {
        setMessageIndex((prev) => prev + 1);
        return;
      }
      setIsScoreVisible(true);
    }, TRAIN_END_MESSAGE_HOLD_MS);

    return () => clearTimeout(timeout);
  }, [isTypingDone, messageIndex, isScoreVisible]);

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

    router.replace({ pathname: "/report", params });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-normal">
      <View className="flex-1 px-[33px]">
        {/*
          이모지와 문구는 두 화면에서 같은 요소다.
          점수 입력이 열릴 때 다시 그리지 않고 위치만 옮겨 자연스럽게 올라가게 한다.
        */}
        <Animated.View style={[styles.header, headerStyle]}>
          {/* 얼굴이 바뀔 때만 교차 페이드 — 같은 얼굴이 이어지면 깜빡이지 않는다 */}
          <View style={styles.faceSlot}>
            <Animated.View
              key={message.face}
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(300)}
              style={StyleSheet.absoluteFill}
            >
              <MessageFace face={message.face} />
            </Animated.View>
          </View>
          <Text className="mt-[14px] text-title2 font-bold text-label-normal text-center">
            {/* 건너뛰면 타이핑이 도중에 멈추므로 점수 화면에서는 전체 문구를 쓴다 */}
            {isScoreVisible ? message.text : message.text.slice(0, typedLength)}
          </Text>
        </Animated.View>

        {isScoreVisible ? (
          <>
            {/* 헤더가 올라간 뒤에 점수 입력이 따라 나타난다 */}
            <Animated.View
              entering={FadeIn.duration(300).delay(HEADER_RISE_MS - 150)}
              className="mt-auto"
            >
              <AnxietyScoreScale score={score} onChange={setScore} />
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(300).delay(HEADER_RISE_MS - 150)}
              className="pt-[82px] pb-4"
            >
              <CustomButton
                label={isSubmitting ? "기록 중..." : "훈련 마치기"}
                tone="primary"
                disabled={isSubmitting}
                onPress={handleSubmit}
              />
            </Animated.View>
          </>
        ) : (
          /* 첫 메시지에는 건너뛰기를 두지 않아 안내를 한 번은 읽게 한다 */
          messageIndex > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={handleSkip}
              hitSlop={12}
              className="mt-auto flex-row items-center justify-center gap-x-[2px] pb-[45px] active:opacity-70"
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
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
  },
  faceSlot: {
    width: FACE_SIZE,
    height: FACE_SIZE,
  },
});
