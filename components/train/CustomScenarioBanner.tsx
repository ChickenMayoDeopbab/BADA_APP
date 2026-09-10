import LightBulb from "@/assets/lightBulb.svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import GradientOverlay from "./GradientOverlay";

interface CustomScenarioBannerProps {
  onPress: () => void;
}

// 배너 배경 그라데이션 (디자인: 49deg, #09C357 → #8BBA9F)
const BANNER_GRADIENT_STOPS = [
  { color: "#09C357", offset: "0%" },
  { color: "#8BBA9F", offset: "100%" },
];

/** 커스텀 탭 상단의 「나만의 시나리오 만들기」 배너 */
export default function CustomScenarioBanner({
  onPress,
}: CustomScenarioBannerProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between overflow-hidden rounded-component p-4 active:opacity-90"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 5.3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <GradientOverlay direction="diagonal" stops={BANNER_GRADIENT_STOPS} />

      <View className="gap-y-3">
        <LightBulb width={40} height={40} />
        <View className="gap-y-[2px]">
          <Text className="text-headline1 font-bold text-white">
            나만의 시나리오 만들기
          </Text>
          <Text className="text-caption font-medium text-white opacity-80">
            내가 원하는 상황에서 전화를 훈련해 보세요!
          </Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={32}
        color="white"
        style={{ opacity: 0.6 }}
      />
    </Pressable>
  );
}
