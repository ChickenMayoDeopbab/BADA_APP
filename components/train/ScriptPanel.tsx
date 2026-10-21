import ChevronDownIcon from "@/assets/train/chevron-down.svg";
import ScriptBubble from "@/components/train/ScriptBubble";
import ScriptTypingDots from "@/components/train/ScriptTypingDots";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { SCRIPT_PANEL_SHADOW } from "@/design-system/effects";
import { TranscriptTurn } from "@/hooks/useTrainWebSocket";
import { ReactNode, useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ScriptPanelProps {
  transcript: TranscriptTurn[];
  /** AI가 말하는 중인데 그 대사가 아직 도착하지 않았는지 */
  isAiTyping: boolean;
  onHide: () => void;
  /** 패널 하단 힌트 영역 */
  children?: ReactNode;
}

/** 통화 중 실시간 대화 스크립트 패널 (헤더 + 말풍선 대화 + 하단 힌트) */
export default function ScriptPanel({ transcript, isAiTyping, onHide, children }: ScriptPanelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isEmpty = transcript.length === 0 && !isAiTyping;

  return (
    <View style={[styles.panel, SCRIPT_PANEL_SHADOW]}>
      <View style={styles.header}>
        <Text style={styles.text} className="text-label font-bold text-label-normal">
          스크립트
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="스크립트 접기"
          onPress={onHide}
          activeOpacity={0.8}
          style={styles.hideButton}
        >
          <Text style={styles.text} className="text-caption font-medium text-label-neutral">
            접기
          </Text>
          <ChevronDownIcon />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      {/* 대화가 아직 없으면 안내 문구만 보여준다 */}
      {isEmpty ? (
        <View style={styles.empty}>
          <Text className="text-label text-label-alternative">아직 대화 내용이 없어요.</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {transcript.map((line) => (
            <ScriptBubble key={line.id} isMine={line.role === "user"} text={line.text} />
          ))}
          {/* AI 발화 중 대사가 오기 전까지 상대 말풍선 자리에 로딩 점을 띄운다 */}
          {isAiTyping && (
            <ScriptBubble isMine={false}>
              <ScriptTypingDots />
            </ScriptBubble>
          )}
        </ScrollView>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: PALETTE.common[0],
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  hideButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: SEMANTIC_COLORS.fill.field,
  },
  divider: { height: 1, backgroundColor: SEMANTIC_COLORS.line.alternative },
  chat: { flex: 1, minHeight: 0 },
  chatContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { includeFontPadding: false },
});
