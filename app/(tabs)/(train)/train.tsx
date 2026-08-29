import CallBackground from "@/components/train/CallBackground";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useIncomingCallRinging } from "@/hooks/useIncomingCallRinging";
import { useAudio } from "@/hooks/useAudio";
import { TranscriptTurn, useTrainWebSocket } from "@/hooks/useTrainWebSocket";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ResizeMode, Video } from "expo-av";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TrainStep = "receive" | "training" | "end";

/** 통화 종료 화면을 보여준 뒤 다음 화면으로 넘어가기까지 기다리는 시간(ms) */
const END_STEP_DURATION_MS = 2000;
/** 워밍업은 불안 점수를 받지 않으므로 피드백 생성 시간을 따로 기다린다(ms) */
const WARMUP_REPORT_DELAY_MS = 3000;

/** WebSocket transcript role → 화면 표시 이름 (user=나, ai=상대) */
const roleToSpeaker = (role: string): string =>
  role === "user" ? "나" : "상대";

/** 경과 시간을 MM:SS 형식으로 변환 */
const formatTime = (totalSeconds: number): string => {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

interface MeditationDialogProps {
  onSkip: () => void;
  onMeditate: () => void;
}

/** 훈련 전 명상 선택 다이얼로그 */
function MeditationDialog({ onSkip, onMeditate }: MeditationDialogProps) {
  return (
    <View style={styles.overlay}>
      <View className="rounded-dialog bg-background-normal p-5 gap-4">
        <View className="gap-[10px]">
          <Text className="text-headline2 font-bold text-label-normal">
            훈련 전 명상을 할까요?
          </Text>
          <Text className="text-label font-medium text-label-alternative">
            명상은 통화 전 마음을 안정시키는 데 도움이 돼요.
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onSkip}
            activeOpacity={0.8}
            className="flex-1 min-h-[38px] items-center justify-center rounded-control bg-fill-normal"
          >
            <Text className="text-label font-bold text-label-normal">건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMeditate}
            activeOpacity={0.8}
            className="flex-1 min-h-[38px] items-center justify-center rounded-control bg-primary-normal"
          >
            <Text className="text-label font-bold text-label-buttonText">명상하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/** 통화 상대 이름 · 번호 · 프로필 사진 묶음 */
function CalleeProfile({ name, phoneNumber, isSpeaking, avatarSize = 140 }: {
  name: string;
  phoneNumber: string;
  isSpeaking?: boolean;
  avatarSize?: number;
}) {
  return (
    <View className="items-center gap-y-6">
      <View className="items-center">
        <Text className="text-title1 font-bold text-label-normal">{name}</Text>
        <Text className="text-body text-label-neutral">폰 {phoneNumber}</Text>
      </View>
      <View
        style={{ width: avatarSize, height: avatarSize }}
        className={`items-center justify-center rounded-pill ${
          isSpeaking ? "bg-primary-alternative" : "bg-fill-neutral"
        }`}
      >
        <Ionicons
          name="person"
          size={Math.round(avatarSize * 0.57)}
          color={PALETTE.neutral[80]}
        />
      </View>
    </View>
  );
}

/** 어떤 시나리오로 훈련 중인지 화면 맨 아래에 작게 적어 둔다 */
function ScenarioLabel({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <Text className="mt-[26px] text-caption font-medium text-label-alternative text-center opacity-60">
      {title}
    </Text>
  );
}

export default function Train() {
  const { sessionId, wsUrl, isWarmup, scenarioId, title, content, isCustom, scenarioImage, category } = useLocalSearchParams<{
    sessionId: string;
    wsUrl: string;
    isWarmup?: string;
    scenarioId?: string;
    title?: string;
    content?: string;
    isCustom?: string;
    scenarioImage?: string;
    category?: string;
  }>();

  useAndroidBackHandler(() => {
    BackHandler.exitApp();
    return true;
  });

  const [step, setStep] = useState<TrainStep>("receive");
  const [isMeditationVisible, setIsMeditationVisible] = useState(false);
  const [isMeditationVideoVisible, setIsMeditationVideoVisible] = useState(false);
  const [isScriptVisible, setIsScriptVisible] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [calleeName, setCalleeName] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scriptScrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  /** iPhone SE·8처럼 세로가 짧은 기기에서 통화 버튼이 잘리지 않도록 값을 줄인다 */
  const { height: windowHeight } = useWindowDimensions();
  const isCompactScreen = windowHeight < 700;

  const [isMuted, setIsMuted] = useState(false);
  const permissionGrantedRef = useRef(false);
  const isWarmupSession = isWarmup === "true";
  const generatedPhoneNumber = useMemo(() => {
    const source = sessionId ?? "";
    const hash = Array.from(source).reduce((acc, char) => {
      return (acc * 31 + char.charCodeAt(0)) % 900000;
    }, 0);
    const first = String((hash % 900) + 100);
    const second = String(((Math.floor(hash / 900) % 900) + 100));
    return `010-${first}-${second}`;
  }, [sessionId]);

  const {
    requestPermission,
    startSendingAudio,
    stopSendingAudio,
    streamPcmChunk,
    resetStream,
  } = useAudio();

  const { isConnected, isAiSpeaking, displayName, sendEndCall, sendBinary, sendMute } = useTrainWebSocket({
    sessionId: sessionId ?? null,
    wsUrl: wsUrl ?? null,
    enabled: step === "training",
    onBinaryMessage: streamPcmChunk,
    onSpeakingEnd: () => {},
    onTranscript: (turn) => setTranscript((prev) => [...prev, turn]),
    onEmotion: () => resetStream(),
    onInterrupt: resetStream,
    onEnd: () => handleEndCall(),
    onError: (code) => {
      console.warn("WS error:", code);
      handleEndCall();
    },
  });
  /**
   * 통화가 끝나면 WS가 끊기며 displayName이 비워진다.
   * 그대로 두면 종료 화면에 다시 "연결 중..."이 뜨므로 한 번 받은 이름을 붙들어 둔다.
   */
  useEffect(() => {
    if (displayName) setCalleeName(displayName);
  }, [displayName]);
  const roleName = calleeName ?? "연결 중...";

  // WS 연결 완료 후 오디오 스트리밍 시작 (연결 전 전송 시 프레임 유실 방지)
  useEffect(() => {
    if (isConnected && step === "training" && permissionGrantedRef.current) {
      permissionGrantedRef.current = false;
      startSendingAudio(sendBinary);
    }
  }, [isConnected, step, startSendingAudio, sendBinary]);

  useEffect(() => {
    if (step !== "training") return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  /**
   * 통화 종료 화면을 잠시 보여준 뒤 다음 화면으로 넘긴다.
   * 시나리오·커스텀 훈련은 불안 점수 입력을 거치고, 워밍업은 바로 리포트로 간다.
   */
  useEffect(() => {
    if (step !== "end") return;

    const nextParams = {
      sessionId,
      scenarioId,
      mode: isWarmupSession ? "warmUp" : "scenario",
      title,
      content,
      isCustom,
      scenarioImage,
      category,
    };

    const timeout = setTimeout(
      () =>
        router.replace({
          pathname: isWarmupSession
            ? "/(tabs)/(train)/report"
            : "/(tabs)/(train)/anxiety",
          params: nextParams,
        }),
      isWarmupSession ? WARMUP_REPORT_DELAY_MS : END_STEP_DURATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [
    step,
    isWarmupSession,
    sessionId,
    scenarioId,
    title,
    content,
    isCustom,
    scenarioImage,
    category,
  ]);

  useFocusEffect(
    useCallback(() => {
      setStep("receive");
      setIsMeditationVisible(false);
      setIsMeditationVideoVisible(false);
      setIsScriptVisible(false);
      setTranscript([]);
      setSeconds(0);
      setCalleeName(null);
      setIsMuted(false);
      permissionGrantedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      stopSendingAudio();
      resetStream();
    }, [stopSendingAudio, resetStream])
  );

  // 벨소리·진동은 벨이 울리는 동안만 — 전화를 받으면(명상 안내가 뜨면) 바로 멈춘다
  useIncomingCallRinging(
    step === "receive" && !isMeditationVisible && !isMeditationVideoVisible,
  );

  const handleAccept = () => setIsMeditationVisible(true);
  const handleDecline = () => router.back();
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    sendMute(next);
  }, [isMuted, sendMute]);

  /** 훈련 시작: 마이크 권한 확인 후 WS 연결 대기, 연결 완료 시 오디오 스트리밍 시작 */
  const startTraining = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) permissionGrantedRef.current = true;
    setStep("training");
  }, [requestPermission]);

  /** 명상 건너뛰기: 다이얼로그 닫고 훈련 시작 */
  const handleMeditationSkip = () => {
    setIsMeditationVisible(false);
    startTraining();
  };
  /** 명상하기: 다이얼로그 닫고 명상 영상 재생 */
  const handleMeditationStart = () => {
    setIsMeditationVisible(false);
    setIsMeditationVideoVisible(true);
  };
  /** 명상 영상 종료(건너뛰기 또는 재생 완료): 영상 닫고 훈련 시작 */
  const handleMeditationVideoEnd = () => {
    setIsMeditationVideoVisible(false);
    startTraining();
  };
  /** 통화 종료: WS end 메시지 전송, 녹음 중지, 재생 버퍼 정리, 타이머 정리 */
  const handleEndCall = () => {
    sendEndCall();
    stopSendingAudio();
    resetStream();
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("end");
  };

  const safeArea = { paddingTop: insets.top, paddingBottom: insets.bottom };

  if (step === "receive") {
    return (
      <>
        {/* 배경은 safe area 패딩 바깥에 둬야 화면 끝까지 깔린다 */}
        <View className="flex-1">
          <CallBackground />
          <View className="flex-1" style={safeArea}>
          <View className="items-center flex-1 pt-[22px]">
            <Text className="text-body font-medium text-label-alternative">
              바다 시나리오 훈련
            </Text>
            <View className="mt-10">
              <CalleeProfile name={roleName} phoneNumber={generatedPhoneNumber} />
            </View>
          </View>
          <View className="items-center pb-6">
            <View className="flex-row items-center justify-between w-[300px]">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="전화 받기"
              onPress={handleAccept}
              activeOpacity={0.8}
              style={[styles.callButton, { backgroundColor: PALETTE.green[40] }]}
            >
              <Ionicons name="call" size={36} color={PALETTE.common[0]} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="전화 거절하기"
              onPress={handleDecline}
              activeOpacity={0.8}
              style={[styles.callButton, { backgroundColor: PALETTE.red[40] }]}
            >
              <Ionicons name="call" size={36} color={PALETTE.common[0]} style={styles.rotatedIcon} />
            </TouchableOpacity>
            </View>
            <ScenarioLabel title={title} />
          </View>
          </View>
        </View>
        <Modal visible={isMeditationVisible} transparent animationType="fade">
          <MeditationDialog onSkip={handleMeditationSkip} onMeditate={handleMeditationStart} />
        </Modal>
        <Modal visible={isMeditationVideoVisible} animationType="fade">
          <View style={styles.meditationVideoContainer}>
            <Video
              source={require("@/assets/meditate.mp4")}
              style={styles.meditationVideo}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded && status.didJustFinish) handleMeditationVideoEnd();
              }}
            />
            <View style={[styles.meditationSkipWrapper, { paddingBottom: insets.bottom + 24 }]}>
              <TouchableOpacity
                onPress={handleMeditationVideoEnd}
                activeOpacity={0.8}
                style={styles.meditationSkipButton}
              >
                <Text className="text-base font-bold text-white">건너뛰기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  const isEnd = step === "end";

  return (
    <View className={`flex-1 ${isEnd ? "bg-background-normal" : ""}`}>
      {/* 통화가 끝나면 초록 배경을 걷어내 훈련이 종료됐음을 드러낸다 */}
      {/* 배경은 safe area 패딩 바깥에 둬야 화면 끝까지 깔린다 */}
      {!isEnd && <CallBackground />}
      <View className="flex-1" style={safeArea}>

      <View className="flex-row items-center justify-center mt-6 gap-x-2">
        <Ionicons
          name="call"
          size={20}
          color={isEnd ? PALETTE.red[40] : SEMANTIC_COLORS.label.neutral}
          style={isEnd ? styles.rotatedIcon : undefined}
        />
        <Text
          className="text-body font-medium"
          style={{ color: isEnd ? PALETTE.red[40] : SEMANTIC_COLORS.label.neutral }}
        >
          {formatTime(seconds)}
          {isEnd ? " 훈련을 종료했습니다." : isAiSpeaking ? "  AI 발화 중..." : ""}
        </Text>
      </View>

      <View className={`items-center ${isCompactScreen ? "pt-3" : "pt-10"}`}>
        <CalleeProfile
          name={roleName}
          phoneNumber={generatedPhoneNumber}
          isSpeaking={isAiSpeaking}
          avatarSize={isCompactScreen ? 112 : 140}
        />
        {/* WS 연결 전에는 상대가 아직 응답할 수 없다는 것을 알린다 */}
        {!isConnected && step === "training" && (
          <Text className="text-label text-label-alternative mt-2">연결 중...</Text>
        )}
      </View>

      {/* 남는 공간을 여기서 흡수해야 작은 화면에서 아래 통화 버튼이 밀려나지 않는다 */}
      <View className="flex-1 justify-center">
      {!isEnd && !isScriptVisible && (
        <View style={styles.gridContainer}>
          {[
            /* 워밍업에서는 스크립트 보기 비활성화 */
            isWarmupSession
              ? { label: "스크립트 보기", onPress: undefined, icon: "document-text", active: false, disabled: true }
              : { label: "스크립트 보기", onPress: () => setIsScriptVisible(true), icon: "document-text", active: false, disabled: false },
            { label: isMuted ? "음소거 해제" : "음소거", onPress: handleToggleMute, icon: isMuted ? "mic-off" : "mic", active: isMuted, disabled: false },
            /* 아래 버튼들은 UI만 제공하며 실제 동작하지 않아 비활성화 처리 */
            { label: "녹음", onPress: undefined, icon: "radio-button-on", active: false, disabled: true },
            { label: "스피커", onPress: undefined, icon: "volume-high", active: false, disabled: true },
            { label: "영상통화", onPress: undefined, icon: "videocam", active: false, disabled: true },
            { label: "키패드", onPress: undefined, icon: "keypad", active: false, disabled: true },
          ].map((btn, index) => (
            <View
              key={index}
              style={[styles.gridItem, isCompactScreen && styles.gridItemCompact]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={btn.disabled}
                style={styles.gridButton}
                onPress={btn.onPress}
              >
                <Ionicons
                  name={btn.icon as any}
                  size={32}
                  color={
                    btn.disabled
                      ? SEMANTIC_COLORS.line.normal
                      : btn.active
                        ? PALETTE.red[40]
                        : SEMANTIC_COLORS.label.normal
                  }
                />
              </TouchableOpacity>
              <Text
                className={`text-label font-medium mt-2 ${
                  btn.disabled ? "text-line-normal" : "text-label-normal"
                }`}
              >
                {btn.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!isEnd && isScriptVisible && (
        <View className="flex-1 mx-[33px]">
          <TouchableOpacity
            onPress={() => setIsScriptVisible(false)}
            activeOpacity={0.8}
            style={styles.scriptHideButton}
          >
            <Text className="text-body font-medium text-label-normal">스크립트 가리기</Text>
          </TouchableOpacity>
          <View style={styles.scriptContainer}>
            {transcript.length === 0 ? (
              <View className="items-center justify-center flex-1">
                <Text className="text-label text-label-alternative">
                  아직 대화 내용이 없어요.
                </Text>
              </View>
            ) : (
              <ScrollView
                ref={scriptScrollRef}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                  scriptScrollRef.current?.scrollToEnd({ animated: true })
                }
              >
                {transcript.map((line, index) => (
                  <Text
                    key={index}
                    className="text-label text-label-normal mb-3"
                    style={{ lineHeight: 22 }}
                  >
                    <Text className="font-semibold">{roleToSpeaker(line.role)} : </Text>
                    {line.text}
                  </Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      </View>

      <View className="items-center pb-6">
        <TouchableOpacity
          onPress={handleEndCall}
          activeOpacity={0.8}
          disabled={isEnd}
          style={[
            styles.callButton,
            { backgroundColor: PALETTE.red[40], opacity: isEnd ? 0.4 : 1 },
          ]}
        >
          <Ionicons name="call" size={36} color={PALETTE.common[0]} style={styles.rotatedIcon} />
        </TouchableOpacity>
        <ScenarioLabel title={title} />
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  callButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 9.45,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  rotatedIcon: {
    transform: [{ rotate: "135deg" }],
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 47,
  },
  gridItem: {
    width: "33.33%",
    alignItems: "center",
    marginBottom: 15,
  },
  gridItemCompact: {
    marginBottom: 6,
  },
  gridButton: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(254,254,254,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  scriptHideButton: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(254,254,254,0.85)",
    marginBottom: 16,
  },
  scriptContainer: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(254,254,254,0.6)",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 33,
  },
  meditationVideoContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  meditationVideo: {
    flex: 1,
  },
  meditationSkipWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  meditationSkipButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
});
