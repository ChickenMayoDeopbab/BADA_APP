import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TrainStep = "receive" | "training" | "end";

const gridButtonLabels = ["스크립트 보기", "버튼명", "버튼명", "버튼명", "버튼명", "버튼명"];

const dummyScript = [
  { speaker: "상대", text: "죄송하지만, 페퍼로니 피자의 재료가 소진되었습니다." },
  { speaker: "나", text: "저는 페퍼로니 피자가 아니면 먹지 못합니다." },
  { speaker: "상대", text: "손님 죄송합니다만 다른 메뉴로 주문 부탁드립니다." },
];
const dummyRecommendation = "그러면 (메뉴명)으로 주문하겠습니다.";

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
        <Text style={styles.dialogTitle}>훈련 전 명상을 할까요?</Text>
        <Text style={styles.dialogDesc}>
          명상은 통화 전 마음을 안정시키는 데 도움이 돼요.
        </Text>
        <View style={styles.dialogButtonRow}>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMeditate} activeOpacity={0.8} style={styles.meditateButton}>
            <Text style={styles.meditateButtonText}>명상하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function Train() {
  const [step, setStep] = useState<TrainStep>("receive");
  const [isMeditationVisible, setIsMeditationVisible] = useState(false);
  const [isScriptVisible, setIsScriptVisible] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (step !== "training") return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  useEffect(() => {
    if (step !== "end") return;
    const timeout = setTimeout(() => router.replace("/(tabs)/(train)/report"), 2500);
    return () => clearTimeout(timeout);
  }, [step]);

  useFocusEffect(
    useCallback(() => {
      setStep("receive");
      setIsMeditationVisible(false);
      setIsScriptVisible(false);
      setSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }, [])
  );

  const handleAccept = () => setIsMeditationVisible(true);
  const handleDecline = () => router.back();
  /** 명상 건너뛰기: 다이얼로그 닫고 훈련 시작 */
  const handleMeditationSkip = () => {
    setIsMeditationVisible(false);
    setStep("training");
  };
  const handleMeditationStart = () => {
    setIsMeditationVisible(false);
    // TODO: 명상 화면 연결
    setStep("training");
  };
  /** 통화 종료: 타이머 정리 후 종료 단계로 전환 */
  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("end");
  };

  const safeArea = { paddingTop: insets.top, paddingBottom: insets.bottom };

  if (step === "receive") {
    return (
      <>
        <View className="flex-1 bg-[#F0F0F0]" style={safeArea}>
          <View className="flex-1 items-center pt-10">
            <Text className="text-sm text-[#5C5E5E]">바다 시나리오 훈련</Text>
            <Text className="mt-6 text-4xl font-bold text-[#3B3D3E]">배준하 피자</Text>
            <Text className="text-sm text-[#5C5E5E] mt-2">휴대전화</Text>
            <Text className="text-sm text-[#5C5E5E]">010-0000-0000</Text>
            <View style={styles.avatar} />
          </View>
          <View className="flex-row justify-around items-center pb-14">
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
      </>
    );
  }

  const isEnd = step === "end";
  const timerColor = isEnd ? "#FF3B30" : "#5C5E5E";

  return (
    <View className="flex-1 bg-white" style={safeArea}>
      <View className="flex-row items-center justify-center gap-x-1 mt-6">
        <Ionicons name="call" size={14} color={timerColor} />
        <Text style={[styles.timerText, { color: timerColor }]}>
          {formatTime(seconds)}{isEnd ? "  훈련종료" : ""}
        </Text>
      </View>
      <View className="flex-1 items-center pt-8">
        <Text className="text-4xl font-bold text-[#3B3D3E]">배준하 피자</Text>
        <Text className="text-sm text-[#5C5E5E] mt-2">휴대전화 010-0000-0000</Text>
        <View style={styles.avatar} />
      </View>
      {!isEnd && !isScriptVisible && (
        <View style={styles.gridContainer}>
          {gridButtonLabels.map((label, index) => (
            <View key={index} style={styles.gridItem}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.gridButton}
                onPress={index === 0 ? () => setIsScriptVisible(true) : undefined}
              />
              <Text className="text-xs text-[#5C5E5E] mt-2">{label}</Text>
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
            <Text style={styles.scriptHideText}>스크립트 가리기</Text>
          </TouchableOpacity>
          <View style={styles.scriptContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {dummyScript.map((line, index) => (
                <Text key={index} style={styles.scriptLine}>
                  <Text style={styles.scriptSpeaker}>{line.speaker} : </Text>
                  {line.text}
                </Text>
              ))}
            </ScrollView>
            <View style={styles.scriptDivider} />
            <Text style={styles.scriptRecommend}>
              추천 : {dummyRecommendation}
            </Text>
          </View>
        </View>
      )}
      <View className="items-center pb-12 mt-6">
        <TouchableOpacity
          onPress={isEnd ? undefined : handleEndCall}
          activeOpacity={isEnd ? 1 : 0.8}
          style={isEnd ? styles.endButtonDimmed : styles.endButton}
        >
          <Ionicons name="call" size={32} color="white" style={styles.rotatedIcon} />
        </TouchableOpacity>
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
  timerText: {
    fontSize: 14,
    fontWeight: "500",
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
  },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  endButtonDimmed: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFBCBC",
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
  scriptHideText: {
    fontSize: 14,
    color: "#3B3D3E",
    fontWeight: "500",
  },
  scriptContainer: {
    borderWidth: 1,
    borderColor: "#EBEBEC",
    borderRadius: 16,
    padding: 16,
  },
  scriptLine: {
    fontSize: 14,
    color: "#3B3D3E",
    lineHeight: 22,
    marginBottom: 8,
  },
  scriptSpeaker: {
    fontWeight: "600",
  },
  scriptDivider: {
    height: 1,
    backgroundColor: "#EBEBEC",
    marginVertical: 12,
  },
  scriptRecommend: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3B3D3E",
    lineHeight: 22,
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
  dialogTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3B3D3E",
    marginBottom: 8,
  },
  dialogDesc: {
    fontSize: 14,
    color: "#5C5E5E",
    lineHeight: 22,
    marginBottom: 24,
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
  skipButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B3D3E",
  },
  meditateButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#0AE365",
    justifyContent: "center",
    alignItems: "center",
  },
  meditateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
});
