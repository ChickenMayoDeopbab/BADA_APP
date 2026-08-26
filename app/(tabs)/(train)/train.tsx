import { TranscriptTurn, useTrainWebSocket } from "@/hooks/useTrainWebSocket";
import { useAudio } from "@/hooks/useAudio";
import CustomButton from "@/components/common/CustomButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResizeMode, Video } from "expo-av";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";

type TrainStep = "receive" | "training" | "end";

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
      <View style={styles.dialogCard}>
        <Text className="text-xl font-bold text-[#3B3D3E] mb-2">훈련 전 명상을 할까요?</Text>
        <Text className="text-sm text-[#5C5E5E] mb-6" style={{ lineHeight: 22 }}>
          명상은 통화 전 마음을 안정시키는 데 도움이 돼요.
        </Text>
        <View style={styles.dialogButtonRow}>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={styles.skipButton}>
            <Text className="text-base font-bold text-[#3B3D3E]">건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMeditate} activeOpacity={0.8} style={styles.meditateButton}>
            <Text className="text-base font-bold text-white">명상하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scriptScrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const [isMuted, setIsMuted] = useState(false);
  const permissionGrantedRef = useRef(false);
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
  const roleName = displayName ?? "연결 중...";

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

  useFocusEffect(
    useCallback(() => {
      setStep("receive");
      setIsMeditationVisible(false);
      setIsMeditationVideoVisible(false);
      setIsScriptVisible(false);
      setTranscript([]);
      setSeconds(0);
      setIsMuted(false);
      permissionGrantedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      stopSendingAudio();
      resetStream();
    }, [stopSendingAudio, resetStream])
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

  const handleOpenReport = () => {
    router.replace({
      pathname: "/(tabs)/(train)/report",
      params: {
        sessionId,
        scenarioId,
        mode: isWarmup === "true" ? "warmUp" : "scenario",
        title,
        content,
        isCustom,
        scenarioImage,
        category,
      },
    });
  };

  const safeArea = { paddingTop: insets.top, paddingBottom: insets.bottom };

  if (step === "receive") {
    return (
      <>
        <View className="flex-1 bg-[#F0F0F0]" style={safeArea}>
          <View className="items-center flex-1 pt-10">
            <Text className="text-sm text-[#5C5E5E]">바다 시나리오 훈련</Text>
            <Text className="mt-6 text-4xl font-bold text-[#3B3D3E]">{roleName}</Text>
            <Text className="text-sm text-[#5C5E5E] mt-2">휴대전화</Text>
            <Text className="text-sm text-[#5C5E5E]">{generatedPhoneNumber}</Text>
            <View style={styles.avatar}>
              <Ionicons name="person" size={72} color="#FFFFFF" />
            </View>
          </View>
          <View className="flex-row items-center justify-around pb-14">
            <TouchableOpacity onPress={handleAccept} activeOpacity={0.8} style={styles.receiveCallButton}>
              <Ionicons name="call" size={28} color="#0AE365" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDecline} activeOpacity={0.8} style={styles.receiveCallButton}>
              <Ionicons name="call" size={28} color="#FF3B30" style={styles.rotatedIcon} />
            </TouchableOpacity>
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
  const timerColor = isEnd ? "#FF3B30" : isAiSpeaking ? "#0AE365" : "#5C5E5E";

  return (
    <View className="flex-1 bg-white" style={safeArea}>
      <View className="flex-row items-center justify-center mt-6 gap-x-1">
        <Ionicons name="call" size={14} color={timerColor} />
        <Text className="text-sm font-medium" style={{ color: timerColor }}>
          {formatTime(seconds)}{isEnd ? "  훈련종료" : isAiSpeaking ? "  AI 발화 중..." : ""}
        </Text>
      </View>
      <View className="items-center flex-1 pt-8">
        <Text className="text-4xl font-bold text-[#3B3D3E]">{roleName}</Text>
        <Text className="text-sm text-[#5C5E5E] mt-2">휴대전화 {generatedPhoneNumber}</Text>
        <View style={[styles.avatar, isAiSpeaking && styles.avatarSpeaking]}>
          <Ionicons name="person" size={72} color="#FFFFFF" />
        </View>
        {!isConnected && step === "training" && (
          <Text className="text-sm text-[#BDBEBE] mt-2">연결 중...</Text>
        )}
      </View>
      {!isEnd && !isScriptVisible && (
        <View style={styles.gridContainer}>
          {[
            /* 워밍업에서는 스크립트 보기 비활성화 */
            isWarmup === "true"
              ? { label: "스크립트 보기", onPress: undefined, icon: "document-text", active: false, disabled: true }
              : { label: "스크립트 보기", onPress: () => setIsScriptVisible(true), icon: "document-text", active: false, disabled: false },
            { label: isMuted ? "음소거 해제" : "음소거", onPress: handleToggleMute, icon: isMuted ? "mic-off" : "mic", active: isMuted, disabled: false },
            /* 아래 버튼들은 UI만 제공하며 실제 동작하지 않아 비활성화 처리 */
            { label: "녹음", onPress: undefined, icon: "radio-button-on", active: false, disabled: true },
            { label: "스피커", onPress: undefined, icon: "volume-high", active: false, disabled: true },
            { label: "영상통화", onPress: undefined, icon: "videocam", active: false, disabled: true },
            { label: "키패드", onPress: undefined, icon: "keypad", active: false, disabled: true },
          ].map((btn, index) => (
            <View key={index} style={styles.gridItem}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={btn.disabled}
                style={[
                  styles.gridButton,
                  btn.active && styles.gridButtonActive,
                  btn.disabled && styles.gridButtonDisabled,
                ]}
                onPress={btn.onPress}
              >
                {btn.icon && (
                  <Ionicons
                    name={btn.icon as any}
                    size={24}
                    color={btn.disabled ? "#C8C8C8" : btn.active ? "#FF3B30" : "#3B3D3E"}
                  />
                )}
              </TouchableOpacity>
              <Text className={`text-xs mt-2 ${btn.disabled ? "text-[#C8C8C8]" : "text-[#5C5E5E]"}`}>
                {btn.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      {!isEnd && isScriptVisible && (
        <View className="flex-1 mx-5">
          <TouchableOpacity
            onPress={() => setIsScriptVisible(false)}
            activeOpacity={0.8}
            style={styles.scriptHideButton}
          >
            <Text className="text-sm text-[#3B3D3E] font-medium">스크립트 가리기</Text>
          </TouchableOpacity>
          <View style={[styles.scriptContainer, { flex: 1 }]}>
            {transcript.length === 0 ? (
              <View className="items-center justify-center flex-1">
                <Text className="text-sm text-[#BDBEBE]">아직 대화 내용이 없어요.</Text>
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
                  <Text key={index} className="text-sm text-[#3B3D3E] mb-2" style={{ lineHeight: 22 }}>
                    <Text className="font-semibold">{roleToSpeaker(line.role)} : </Text>
                    {line.text}
                  </Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
      <View className="items-center pb-12 mt-6">
        {isEnd ? (
          <View className="w-full px-8">
            <CustomButton
              label="다음"
              backgroundColor="#0AE365"
              color="white"
              onPress={handleOpenReport}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleEndCall}
            activeOpacity={0.8}
            style={styles.endButton}
          >
            <Ionicons
              name="call"
              size={32}
              color="white"
              style={styles.rotatedIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#E0E0E0",
    marginTop: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSpeaking: {
    backgroundColor: "#B8F5D4",
  },
  receiveCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  rotatedIcon: {
    transform: [{ rotate: "135deg" }],
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    marginHorizontal: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  gridItem: {
    width: "33.33%",
    alignItems: "center",
    marginBottom: 16,
  },
  gridButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  gridButtonActive: {
    backgroundColor: "#FFE5E5",
  },
  gridButtonDisabled: {
    backgroundColor: "#EFEFEF",
  },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  scriptHideButton: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#EBEBEC",
    marginBottom: 16,
  },
  scriptContainer: {
    borderWidth: 1,
    borderColor: "#EBEBEC",
    borderRadius: 16,
    padding: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dialogCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
  },
  dialogButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  skipButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  meditateButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#0AE365",
    justifyContent: "center",
    alignItems: "center",
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
