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

  // 뒤로 가기 버튼 눌렀을 때
  const handleBack = () => {
    if (onBack) {
      onBack();  
    } else {
      router.back(); 
    }
  };

  return (
    <View
      className="relative w-full flex-row items-center justify-between px-2"
      style={{ height: 64 + (safeArea ? insets.top : 0), paddingTop: safeArea ? insets.top : 0 }}
    >
      <View className="items-center justify-center size-16">
        {back && (
          <TouchableOpacity onPress={handleBack} className="items-center justify-center size-16">
            <Ionicons name="chevron-back" size={32} color="black" />
          </TouchableOpacity>
        )}
      </View>

      {isMain ? (
        <BadaLogo style={{ width: 80, aspectRatio: 126 / 58 }} />
      ) : (
        <Text className="font-bold text-headline1 text-label-neutral">{title}</Text>
      )}

      <View className="items-center justify-center size-16">{right}</View>
    </View>
  );
}
