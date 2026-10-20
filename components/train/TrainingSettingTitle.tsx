import { SEMANTIC_COLORS } from "@/design-system/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SETTING_HELP = {
  difficulty: {
    title: "난이도",
    description:
      "하·중·상 중에서 훈련 난이도를 선택해 주세요. 처음이라면 하 단계부터 시작하고, 익숙해지면 난이도를 높여 보세요.",
  },
  attitude: {
    title: "상대의 태도",
    description:
      "전화 상대방의 응대 태도를 선택해 주세요. 친절·보통·까다로움·진상 순서로 더 까다로운 상대와 대화하는 연습을 할 수 있어요.",
  },
} as const;

interface TrainingSettingTitleProps {
  setting: keyof typeof SETTING_HELP;
}

/** 훈련 설정 제목을 한 줄로 표시하고 선택한 항목의 도움말을 연다. */
export default function TrainingSettingTitle({
  setting,
}: TrainingSettingTitleProps) {
  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; height: number } | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const help = SETTING_HELP[setting];
  const tooltipWidth = Math.min(240, width - insets.left - insets.right - 32);
  const left = Math.max(insets.left + 16, Math.min(anchor?.x ?? 0, width - insets.right - tooltipWidth - 16));
  const top = Math.max(insets.top + 16, Math.min((anchor?.y ?? 0) + (anchor?.height ?? 0) + 8, height - insets.bottom - 160));

  /** 물음표 바로 아래에 자가진단과 같은 작은 설명 카드를 연다. */
  const handleHelpPress = () => {
    anchorRef.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ x, y, height });
    });
  };

  return (
    <View className="max-w-full flex-row items-center gap-x-2">
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        className="shrink text-headline1 font-bold text-label-neutral"
      >
        {help.title}
      </Text>
      <Pressable
        ref={anchorRef}
        accessibilityRole="button"
        accessibilityLabel={`${help.title} 도움말`}
        accessibilityState={{ expanded: Boolean(anchor) }}
        onPress={handleHelpPress}
        hitSlop={10}
        className="size-6 shrink-0 items-center justify-center"
      >
        <Ionicons
          name="help-circle-outline"
          size={20}
          color={SEMANTIC_COLORS.label.alternative}
        />
      </Pressable>
      <Modal
        visible={Boolean(anchor)}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => setAnchor(null)}
      >
        <View className="flex-1">
          <Pressable
            accessibilityLabel="도움말 닫기"
            onPress={() => setAnchor(null)}
            className="absolute inset-0"
          />
          <View
            className="absolute rounded-component border border-line-neutral bg-background-normal p-3 shadow-xl"
            style={{ left, top }}
          >
            <ScrollView
              bounces={false}
              style={{ width: tooltipWidth - 24, maxHeight: height - insets.bottom - top - 40 }}
            >
              <Text className="text-label text-label-neutral">{help.description}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
