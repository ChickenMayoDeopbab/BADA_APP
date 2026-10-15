import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import BadaLogo from "@/assets/badaLogo2.svg";
import { SEMANTIC_COLORS } from "@/design-system";
import { ReactNode } from "react";

interface TopProps {
  title?: string;
  isMain?: boolean;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  safeArea?: boolean;
}

export const HEADER_CONTENT_HEIGHT = 64;
const BACK_ICON_SIZE = 30;
const ACTION_WIDTH = 64;

/** 화면 폭과 글자 배율에 맞춰 제목을 한 줄로 유지하고 좌우 버튼 공간을 확보한다. */
export default function Top({
  title,
  isMain = false,
  back = false,
  onBack,
  right,
  safeArea = true,
}: TopProps) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const router = useRouter();
  const safeAreaTop = safeArea ? insets.top : 0;
  const contentHeight = Math.max(
    HEADER_CONTENT_HEIGHT,
    Math.ceil(26 * fontScale + 16),
  );
  const titleInset = back || right ? ACTION_WIDTH + 8 : 16;

  /** 화면에서 지정한 동작 또는 이전 화면으로 이동한다. */
  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View
      className="relative w-full shrink-0 items-center justify-center"
      style={{ paddingTop: safeAreaTop, height: safeAreaTop + contentHeight }}
    >
      {back ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={handleBack}
          className="absolute left-[22px] size-11 items-center justify-center"
          style={{ top: safeAreaTop + (contentHeight - 44) / 2 }}
          hitSlop={4}
        >
          <Ionicons
            name="chevron-back-sharp"
            size={BACK_ICON_SIZE}
            color={SEMANTIC_COLORS.label.normal}
          />
        </TouchableOpacity>
      ) : null}

      <View
        className="w-full min-w-0 items-center"
        style={{ paddingHorizontal: titleInset }}
        pointerEvents="none"
      >
        {isMain ? (
          <BadaLogo style={styles.logo} />
        ) : (
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            className="w-full text-center font-bold text-headline1 text-label-neutral"
          >
            {title}
          </Text>
        )}
      </View>

      {right ? (
        <View
          className="absolute right-2 size-16 items-center justify-center"
          style={{ top: safeAreaTop + (contentHeight - ACTION_WIDTH) / 2 }}
        >
          {right}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 80, aspectRatio: 126 / 58 },
});
