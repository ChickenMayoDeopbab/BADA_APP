import CallBackground from "@/components/train/CallBackground";
import CallControls from "@/components/train/CallControls";
import CallIcon from "@/assets/train/call.svg";
import HangupIcon from "@/assets/train/hangup.svg";
import { acceptTrainingCallSchedule, cancelTrainingCallSchedule } from "@/api/trainingCallApi";
import { getApiErrorMessage } from "@/api/error";
import type { CreateSessionResponse } from "@/api/types";
import { useSensitiveConsentGuard } from "@/hooks/useSensitiveConsentGuard";
import { getTrainingCallScenario, removeTrainingCallScenario } from "@/utils/trainingCallScenario";
import ScriptHintBar from "@/components/train/ScriptHintBar";
import { useAppAlert } from "@/context/AppAlertContext";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { useScenario } from "@/hooks/useScenarios";
import { useIncomingCallRinging } from "@/hooks/useIncomingCallRinging";
import { useAudio } from "@/hooks/useAudio";
import { ScriptHint, TranscriptTurn, useTrainWebSocket } from "@/hooks/useTrainWebSocket";
import { saveCompletedCallDuration } from "@/utils/completedCallDuration";
import { setMediaVolumeControlEnabled } from "@/utils/mediaVolumeControl";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Image,
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

/** 명상을 선택했을 때만 기존 영상 모듈을 불러와 일반 통화에서는 오디오 세션에 관여하지 않게 한다. */
function MeditationVideoContent({
  bottomInset,
  onEnd,
}: {
  bottomInset: number;
  onEnd: () => void;
}) {
  // expo-video를 추가하지 않는 동안 명상 영상 기능만 기존 모듈을 지연 로드한다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ResizeMode, Video } = require("expo-av") as typeof import("expo-av");

  return (
    <View style={styles.meditationVideoContainer}>
      <Video
        source={require("@/assets/meditate.mp4")}
        style={styles.meditationVideo}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) onEnd();
        }}
      />
      <View
        style={[
          styles.meditationSkipWrapper,
          { paddingBottom: bottomInset + 24 },
        ]}
      >
        <TouchableOpacity
          onPress={onEnd}
          activeOpacity={0.8}
          style={styles.meditationSkipButton}
        >
          <Text className="text-body font-bold text-white">건너뛰기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** 통화 상대 이름 · 번호 · 프로필 사진 묶음 */
function CalleeProfile({ name, phoneNumber, avatarSize = 140, isCompact = false }: {
  name: string;
  phoneNumber: string;
  avatarSize?: number;
  isCompact?: boolean;
}) {
  return (
    <View className="w-full items-center px-4" style={{ gap: isCompact ? 12 : 16 }}>
      <View className="w-full items-center">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          className={`w-full text-center font-bold text-label-normal ${isCompact ? "text-title2" : "text-display1"}`}
          style={styles.profileText}
        >
          {name}
        </Text>
        <Text style={styles.profileText} className="w-full text-center text-body text-label-neutral">폰 {phoneNumber}</Text>
      </View>
      <Image
        source={require("@/assets/train/callee-avatar.png")}
        resizeMode="contain"
        style={{ width: avatarSize, height: avatarSize }}
      />
    </View>
  );
}

/** 어떤 시나리오로 훈련 중인지 화면 맨 아래에 작게 적어 둔다 */
function ScenarioLabel({ title, isCompact = false }: { title?: string; isCompact?: boolean }) {
  if (!title) return null;
  return (
    <Text
      numberOfLines={1}
      className={`px-4 text-caption font-medium text-label-alternative text-center opacity-60 ${isCompact ? "mt-3" : "mt-[26px]"}`}
    >
      {title}
    </Text>
  );
}

export default function Train() {
  const { showAlert } = useAppAlert();
  const {
    sessionId: initialSessionId, wsUrl: initialWsUrl, scheduleId,
    isWarmup, scenarioId: initialScenarioId, title, content, isCustom, scenarioImage, category,
  } = useLocalSearchParams<{
    sessionId?: string;
    wsUrl?: string;
    scheduleId?: string;
    isWarmup?: string;
    scenarioId?: string;
    title?: string;
    content?: string;
    isCustom?: string;
    scenarioImage?: string;
    category?: string;
  }>();
  const [acceptedSession, setAcceptedSession] = useState<CreateSessionResponse | null>(null);
  const sessionId = acceptedSession?.sessionId ?? initialSessionId;
  const wsUrl = acceptedSession?.wsUrl ?? initialWsUrl;
  const [recoveredScenarioId, setRecoveredScenarioId] = useState<string>();
  const scenarioId = initialScenarioId ?? recoveredScenarioId;
  const ensureSensitiveConsent = useSensitiveConsentGuard();
  const isHandlingScheduleRef = useRef(false);
  const [isHandlingSchedule, setIsHandlingSchedule] = useState(false);

  useAndroidBackHandler(() => {
    if (step === "training") {
      showAlert({
        title: "통화를 종료할까요?",
        confirmLabel: "종료하기",
        cancelLabel: "계속 통화하기",
        onConfirm: handleEndCall,
      });
    } else if (step === "receive") {
      void handleDecline();
    }
    return true;
  });

  const [step, setStep] = useState<TrainStep>("receive");
  const [isMeditationVisible, setIsMeditationVisible] = useState(false);
  const [isMeditationVideoVisible, setIsMeditationVideoVisible] = useState(false);
  const [isScriptVisible, setIsScriptVisible] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [scriptHint, setScriptHint] = useState<ScriptHint | null>(null); // 다음 힌트가 올 때까지 유지
  const [seconds, setSeconds] = useState(0);
  const [calleeName, setCalleeName] = useState<string | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const completedCallDurationRef = useRef<number | null>(null);
  const endHandledRef = useRef(false);
  const isScreenActiveRef = useRef(true);
  const isStartingRef = useRef(false);
  const startAttemptRef = useRef(0);
  const scriptScrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  /**
   * 즉시 발신에서 시나리오 정보가 생략되어도 scenarioId로 조회한다.
   * 목록 캐시를 공유하는 useScenario로 조회해 두 경로 모두 이름이 뜨게 한다.
   */
  const { data: scenario } = useScenario(scenarioId);
  const scenarioTitle = title ?? scenario?.title;
  /** iPhone SE·8처럼 세로가 짧은 기기에서 통화 버튼이 잘리지 않도록 값을 줄인다 */
  const { height: windowHeight, width: windowWidth, fontScale } = useWindowDimensions();
  const availableHeight = windowHeight - insets.top - insets.bottom;
  const isCompactScreen = availableHeight < 700 || fontScale > 1.2;
  const isShortScreen = availableHeight < 580;
  const callScale = Math.min(1, availableHeight / 700, (windowWidth - 32) / 312);
  const spacingScale = Math.min(1, availableHeight / 786);
  const avatarSize = isCompactScreen ? (isShortScreen ? 72 : 96) : 140;

  const [isMuted, setIsMuted] = useState(false);
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
    setMicrophoneMuted,
    beginPlayback,
    streamPcmChunk,
    flushPlayback,
    resetStream,
  } = useAudio({
    onPlaybackBlocked: (blocked) => setPlaybackBlocked(blocked),
    onPlaybackStats: (stats) => { sendJson(stats); },
    onPlaybackComplete: (turnId) => {
      sendJson({ type: "playback_done", turn_id: turnId });
    },
    onPlaybackError: () => handleCallFailure("통화 음성을 재생하지 못했어요"),
    onRecordingError: () => handleCallFailure("마이크 연결에 실패했어요"),
  });

  const { isConnected, displayName, sendEndCall, sendBinary, sendMute, sendJson, setPlaybackBlocked } = useTrainWebSocket({
    sessionId: sessionId ?? null,
    wsUrl: wsUrl ?? null,
    enabled: step === "training" && isAudioReady,
    onBinaryMessage: (data) => {
      streamPcmChunk(data);
    },
    onTranscript: (turn) => setTranscript((prev) => [...prev, turn]),
    onScriptHint: setScriptHint,
    onEmotion: beginPlayback,
    onSpeakingEnd: flushPlayback,
    onInterrupt: resetStream,
    onEnd: () => handleEndCall(),
    onError: () => handleCallFailure("통화 연결이 끊겼어요"),
  });
  /**
   * 통화가 끝나면 WS가 끊기며 displayName이 비워진다.
   * 종료 화면에서도 상대 이름을 유지하도록 한 번 받은 이름을 붙들어 둔다.
   */
  useEffect(() => {
    if (displayName) setCalleeName(displayName);
  }, [displayName]);
  const roleName = calleeName ?? "통화 상대";

  useEffect(() => {
    const isInCall = step === "training";
    setMediaVolumeControlEnabled(isInCall);

    return () => {
      if (isInCall) setMediaVolumeControlEnabled(false);
    };
  }, [step]);

  // WS 연결과 오디오 준비가 모두 끝난 뒤 마이크 스트리밍 시작.
  // 둘 중 어느 쪽이 먼저 끝나도 state 변경으로 이 effect가 다시 실행된다.
  useEffect(() => {
    if (isConnected && step === "training" && isAudioReady) {
      void startSendingAudio(sendBinary).catch(() => {});
      return () => { void stopSendingAudio().catch(() => {}); };
    }
  }, [isAudioReady, isConnected, step, startSendingAudio, stopSendingAudio, sendBinary]);

  useEffect(() => {
    if (step !== "training" || !isConnected || !isAudioReady || endHandledRef.current) return;
    if (callStartedAtRef.current === null) callStartedAtRef.current = Date.now();
    const startedAt = callStartedAtRef.current;
    const updateElapsed = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    updateElapsed();
    timerRef.current = setInterval(updateElapsed, 250);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAudioReady, isConnected, step]);

  /**
   * 통화 종료 화면을 잠시 보여준 뒤 다음 화면으로 넘긴다.
   * 시나리오·커스텀 훈련은 불안 점수 입력을 거치고, 워밍업은 바로 리포트로 간다.
   */
  useEffect(() => {
    if (step !== "end" || callStartedAtRef.current === null) return;

    const nextParams = {
      sessionId,
      scenarioId,
      callDurationSeconds: String(completedCallDurationRef.current ?? 0),
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
            ? "/report"
            : "/anxiety",
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
      isScreenActiveRef.current = true;
      startAttemptRef.current++;
      isStartingRef.current = false;
      setStep("receive");
      setIsMeditationVisible(false);
      setIsMeditationVideoVisible(false);
      setIsScriptVisible(false);
      setTranscript([]);
      setScriptHint(null);
      setSeconds(0);
      setCalleeName(null);
      setIsMuted(false);
      setMicrophoneMuted(false);
      setIsAudioReady(false);
      callStartedAtRef.current = null;
      completedCallDurationRef.current = null;
      endHandledRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      void stopSendingAudio().catch(() => {});
      resetStream();
      return () => {
        isScreenActiveRef.current = false;
        startAttemptRef.current++;
        endHandledRef.current = true;
        isStartingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        void stopSendingAudio().catch(() => {});
        resetStream("screen_exit");
      };
    }, [stopSendingAudio, resetStream, setMicrophoneMuted])
  );

  // 벨소리·진동은 벨이 울리는 동안만 — 전화를 받으면(명상 안내가 뜨면) 바로 멈춘다
  useIncomingCallRinging(
    step === "receive" && !isMeditationVisible &&
      !isMeditationVideoVisible && !isHandlingSchedule,
  );

  /** 서버 예약은 사용자가 수락한 시점에 세션을 만들고 명상 안내로 이어간다. */
  const handleAccept = async () => {
    if (isHandlingScheduleRef.current) return;
    if (!scheduleId || acceptedSession) {
      setIsMeditationVisible(true);
      return;
    }
    isHandlingScheduleRef.current = true;
    setIsHandlingSchedule(true);
    try {
      if (!(await ensureSensitiveConsent()) || !isScreenActiveRef.current) return;
      const session = await acceptTrainingCallSchedule(Number(scheduleId));
      if (!isScreenActiveRef.current) return;
      // 예약 생성 직후 수신 화면이 먼저 열려도 저장이 끝난 시나리오 ID를 복구한다.
      if (!scenarioId) {
        const recovered = await getTrainingCallScenario(Number(scheduleId));
        if (!isScreenActiveRef.current) return;
        setRecoveredScenarioId(recovered);
      }
      setAcceptedSession(session);
      setIsMeditationVisible(true);
      void removeTrainingCallScenario(Number(scheduleId)).catch(() => undefined);
    } catch (error) {
      if (!isScreenActiveRef.current) return;
      showAlert({
        title: "전화를 받지 못했어요",
        description: getApiErrorMessage(error, "예약 상태를 확인하고 다시 시도해 주세요."),
      });
    } finally {
      isHandlingScheduleRef.current = false;
      if (isScreenActiveRef.current) setIsHandlingSchedule(false);
    }
  };

  /** 예약 수신을 거절할 때 서버 예약도 취소한다. */
  const handleDecline = async () => {
    if (isHandlingScheduleRef.current) return;
    isHandlingScheduleRef.current = true;
    setIsHandlingSchedule(true);
    try {
      if (scheduleId && !acceptedSession) {
        await cancelTrainingCallSchedule(Number(scheduleId));
        void removeTrainingCallScenario(Number(scheduleId)).catch(() => undefined);
      }
      if (!isScreenActiveRef.current) return;
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/(home)/home");
    } catch (error) {
      if (!isScreenActiveRef.current) return;
      showAlert({
        title: "전화를 거절하지 못했어요",
        description: getApiErrorMessage(error, "잠시 후 다시 시도해 주세요."),
      });
    } finally {
      isHandlingScheduleRef.current = false;
      if (isScreenActiveRef.current) setIsHandlingSchedule(false);
    }
  };
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    setMicrophoneMuted(next);
    sendMute(next);
  }, [isMuted, sendMute, setMicrophoneMuted]);

  /**
   * 훈련 시작: 통화 화면은 바로 띄우고, WS는 마이크 권한·오디오 세션이 준비된 뒤에 연다.
   * 준비 전에 연 WS를 실패로 닫으면 서버가 세션을 끝내 다시 받을 수 없다.
   */
  const startTraining = useCallback(async () => {
    if (isStartingRef.current || endHandledRef.current || !isScreenActiveRef.current) return;
    isStartingRef.current = true;
    const attempt = ++startAttemptRef.current;
    setIsAudioReady(false);
    setStep("training");

    const granted = await requestPermission().catch(() => false);
    if (attempt !== startAttemptRef.current || endHandledRef.current || !isScreenActiveRef.current) return;
    isStartingRef.current = false;
    if (!granted) {
      showAlert({
        title: "마이크를 사용할 수 없어요",
        description:
          "훈련을 시작하려면 마이크 권한을 허용하고 앱을 화면에 열어 주세요.",
      });
      setStep("receive");
      return;
    }
    setIsAudioReady(true);
  }, [requestPermission, showAlert]);

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
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    const callDurationSeconds = callStartedAtRef.current === null
      ? 0
      : Math.max(0, Math.floor((Date.now() - callStartedAtRef.current) / 1000));
    completedCallDurationRef.current = callDurationSeconds;
    setSeconds(callDurationSeconds);
    if (sessionId && callStartedAtRef.current !== null) {
      void saveCompletedCallDuration(sessionId, callDurationSeconds).catch(() => {});
    }
    // Release the microphone lookahead synchronously before the end message.
    void stopSendingAudio(true).catch(() => {});
    resetStream("call_end"); // Flush playback stats before the server closes the socket.
    sendEndCall();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStep("end");
    if (callStartedAtRef.current === null) router.replace("/(tabs)/(train)/list");
  };

  /** Explain interrupted calls and release audio before leaving an unsuccessful connection. */
  const handleCallFailure = (message: string) => {
    if (endHandledRef.current || !isScreenActiveRef.current) return;
    showAlert({
      title: message,
      description: callStartedAtRef.current === null
        ? "네트워크와 마이크 권한을 확인한 뒤 다시 시도해 주세요."
        : "통화를 종료했어요. 네트워크와 오디오 연결을 확인해 주세요.",
    });
    handleEndCall();
  };

  const safeArea = { paddingTop: insets.top, paddingBottom: insets.bottom };

  if (step === "receive") {
    return (
      <>
        {/* 배경은 safe area 패딩 바깥에 둬야 화면 끝까지 깔린다 */}
        <View className="flex-1">
          <CallBackground />
          <View className="flex-1" style={safeArea}>
            <View className="flex-1 items-center pt-[22px] pb-6">
              <Text className="text-body font-medium text-label-alternative">
                바다 시나리오 훈련
              </Text>
              <View className="mt-10 w-full">
                <CalleeProfile
                  name={roleName}
                  phoneNumber={generatedPhoneNumber}
                  avatarSize={avatarSize}
                  isCompact={isCompactScreen}
                />
              </View>
            </View>
            <View className={`shrink-0 items-center ${isCompactScreen ? "pb-3" : "pb-6"}`}>
              <View className="w-full max-w-[300px] flex-row items-center justify-between px-4">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="전화 받기"
                  onPress={() => void handleAccept()}
                  disabled={isHandlingSchedule}
                  accessibilityState={{
                    disabled: isHandlingSchedule,
                    busy: isHandlingSchedule,
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.callButton,
                    isCompactScreen && styles.callButtonCompact,
                    { backgroundColor: PALETTE.green[40] },
                  ]}
                >
                  <Ionicons name="call" size={36} color={PALETTE.common[0]} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="전화 거절하기"
                  onPress={() => void handleDecline()}
                  disabled={isHandlingSchedule}
                  activeOpacity={0.8}
                  style={[styles.callButton, isCompactScreen && styles.callButtonCompact, { backgroundColor: PALETTE.red[40] }]}
                >
                  <Ionicons
                    name="call"
                    size={36}
                    color={PALETTE.common[0]}
                    style={styles.rotatedIcon}
                  />
                </TouchableOpacity>
              </View>
              <ScenarioLabel title={scenarioTitle} isCompact={isCompactScreen} />
            </View>
          </View>
        </View>
        <Modal visible={isMeditationVisible} transparent animationType="fade">
          <MeditationDialog
            onSkip={handleMeditationSkip}
            onMeditate={handleMeditationStart}
          />
        </Modal>
        {isMeditationVideoVisible && (
          <Modal visible animationType="fade">
            <MeditationVideoContent
              bottomInset={insets.bottom}
              onEnd={handleMeditationVideoEnd}
            />
          </Modal>
        )}
      </>
    );
  }

  const isEnd = step === "end";
  const hangupButtonSize = { width: 80 * callScale, height: 80 * callScale };

  return (
    <View className={`flex-1 ${isEnd ? "bg-background-normal" : ""}`}>
      {/* 통화가 끝나면 초록 배경을 걷어내 훈련이 종료됐음을 드러낸다 */}
      {/* 배경은 safe area 패딩 바깥에 둬야 화면 끝까지 깔린다 */}
      {!isEnd && <CallBackground />}
      <View className="flex-1" style={safeArea}>
        <View className="min-h-0 flex-1">
          <View style={[styles.callHeader, { paddingTop: 22 * spacingScale }]}>
            <View style={styles.callTimer}>
              {isEnd ? (
                <Ionicons name="call" size={20} color={PALETTE.red[40]} style={styles.rotatedIcon} />
              ) : <CallIcon />}
              <Text
                className="text-body font-medium"
                style={[styles.profileText, { color: isEnd ? PALETTE.red[40] : SEMANTIC_COLORS.label.alternative }]}
              >
                {formatTime(seconds)}{isEnd ? " 훈련을 종료했습니다." : ""}
              </Text>
            </View>
            <View style={[styles.profileContainer, { paddingTop: (isCompactScreen ? 20 : 40) * spacingScale }]}>
              <CalleeProfile
                name={roleName}
                phoneNumber={generatedPhoneNumber}
                avatarSize={avatarSize}
                isCompact={isCompactScreen}
              />
              {!isConnected && step === "training" && (
                <Text className="text-label text-label-alternative mt-2">연결 중...</Text>
              )}
            </View>
          </View>

          <View style={[styles.controlsArea, { paddingBottom: (isScriptVisible ? 16 : 40) * spacingScale }]}>
            {!isEnd && !isScriptVisible && (
              <CallControls
                isWarmup={isWarmupSession}
                isMuted={isMuted}
                scale={callScale}
                onShowScript={() => setIsScriptVisible(true)}
                onToggleMute={handleToggleMute}
              />
            )}

            {!isEnd && isScriptVisible && (
              <View className="mx-[33px] min-h-0 flex-1 mt-4">
                <TouchableOpacity
                  onPress={() => setIsScriptVisible(false)}
                  activeOpacity={0.8}
                  style={styles.scriptHideButton}
                >
                  <Text style={styles.profileText} className="text-body font-medium text-label-neutral">
                    스크립트 가리기
                  </Text>
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
                      className="min-h-0 flex-1"
                      bounces={false}
                      overScrollMode="never"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      contentContainerClassName="gap-y-[10px]"
                      onContentSizeChange={() =>
                        scriptScrollRef.current?.scrollToEnd({ animated: true })
                      }
                    >
                      {transcript.map((line, index) => (
                        <Text
                          key={index}
                          style={styles.profileText}
                          className="text-body font-medium text-label-neutral"
                        >
                          {roleToSpeaker(line.role)} : {line.text}
                        </Text>
                      ))}
                    </ScrollView>
                  )}
                  <ScriptHintBar hint={scriptHint} />
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.hangupArea, { paddingBottom: (isScriptVisible && isCompactScreen ? 24 : 58) * spacingScale }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="통화 종료"
            onPress={handleEndCall}
            activeOpacity={0.8}
            disabled={isEnd}
            style={[
              styles.callButton,
              hangupButtonSize,
              { backgroundColor: PALETTE.red[40], opacity: isEnd ? 0.4 : 1 },
            ]}
          >
            <HangupIcon />
          </TouchableOpacity>
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
  },
  rotatedIcon: {
    transform: [{ rotate: "135deg" }],
  },
  callButtonCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileText: { includeFontPadding: false },
  callHeader: { flexShrink: 0, alignItems: "center" },
  callTimer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  profileContainer: { width: "100%", alignItems: "center" },
  controlsArea: { minHeight: 0, flex: 1, justifyContent: "flex-end" },
  hangupArea: { flexShrink: 0, alignItems: "center" },
  scriptHideButton: {
    alignSelf: "center",
    alignItems: "center",
    minWidth: 178,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SEMANTIC_COLORS.background.normal,
    marginBottom: 8,
  },
  scriptContainer: {
    flex: 1,
    minHeight: 0,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "rgba(254,254,254,0.72)",
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
