import { useAppAlert } from "@/context/AppAlertContext";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

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
  const { showAlert } = useAppAlert();
  const help = SETTING_HELP[setting];

  /** 현재 설정의 의미를 공용 안내 모달로 표시한다. */
  const handleHelpPress = () => {
    showAlert({
      title: help.title,
      description: help.description,
      confirmLabel: "확인",
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
        accessibilityRole="button"
        accessibilityLabel={`${help.title} 도움말`}
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
    </View>
  );
}
