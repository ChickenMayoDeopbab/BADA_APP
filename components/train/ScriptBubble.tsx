import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface ScriptBubbleProps {
  isMine: boolean;
  /** 대사 대신 다른 내용(로딩 점 등)을 넣을 때 사용 */
  children?: ReactNode;
  text?: string;
}

/** 스크립트 대사 말풍선 (상대 = 왼쪽 흰색, 나 = 오른쪽 초록색) */
export default function ScriptBubble({ isMine, children, text }: ScriptBubbleProps) {
  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {children ?? (
          <Text
            style={[styles.text, isMine ? styles.textMine : styles.textOther]}
            className="text-label font-medium"
          >
            {text}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", alignItems: "flex-start" },
  rowMine: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "91%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bubbleOther: {
    borderWidth: 1,
    borderColor: SEMANTIC_COLORS.line.alternative,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
    backgroundColor: PALETTE.common[0],
  },
  bubbleMine: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: PALETTE.green[40],
  },
  text: { includeFontPadding: false },
  textOther: { color: SEMANTIC_COLORS.label.alternative },
  textMine: { color: PALETTE.common[0], textAlign: "right" },
});
