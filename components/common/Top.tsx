import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import BadaLogo from "@/assets/badaLogo2.svg";
import { ReactNode } from "react";

interface TopProps {
  title?: string;
  isMain?: boolean;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  safeArea?: boolean;
}

/**
 * safe area 아래 실제 콘텐츠 영역 높이.
 * 바 전체 높이를 고정하면 상단 인셋만큼 콘텐츠 영역이 깎여, 인셋이 큰 iOS에서만
 * 제목이 아래 내용에 바짝 붙는다. 인셋에 이 값을 더해 두 플랫폼을 같게 맞춘다.
 */
export const HEADER_CONTENT_HEIGHT = 64;
/** 뒤로 가기 아이콘 한 변 */
const BACK_ICON_SIZE = 30;

export default function Top({
  title,
  isMain = false,
  back = false,
  onBack,
  right,
  safeArea = true,
}: TopProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const safeAreaTop = safeArea ? insets.top : 0;

  // 뒤로 가기 버튼 눌렀을 때
  const handleBack = () => {
    if (onBack) {
      onBack();  
    } else {
      router.back(); 
    }
  };

  /*
    제목은 flex 자식이라 safe area 패딩 아래 영역의 한가운데에 놓이는데,
    절대 배치한 뒤로 가기 버튼은 패딩을 무시하고 바 위쪽 끝을 기준으로 잡힌다.
    고정값을 쓰면 상단 인셋이 큰 iOS에서만 제목보다 위로 뜨므로 같은 기준으로 맞춘다.
  */
  const actionTop = safeAreaTop + (HEADER_CONTENT_HEIGHT - BACK_ICON_SIZE) / 2;

  return (
    <View
      className="relative w-full items-center justify-center"
      style={{
        paddingTop: safeAreaTop,
        height: safeAreaTop + HEADER_CONTENT_HEIGHT,
      }}
    >
      {back ? (
        <TouchableOpacity
          onPress={handleBack}
          className="absolute left-[30px]"
          style={{ top: actionTop }}
        >
          <Ionicons name="chevron-back-sharp" size={BACK_ICON_SIZE} color="black" />
        </TouchableOpacity>
      ) : null}

      {isMain ? (
        <BadaLogo style={{ width: 80, aspectRatio: 126 / 58 }} />
      ) : (
        <Text className="font-bold text-headline1 text-label-neutral">{title}</Text>
      )}

      <View className="absolute right-2 items-center justify-center size-16" style={{ top: actionTop }}>
        {right}
      </View>
    </View>
  );
}
