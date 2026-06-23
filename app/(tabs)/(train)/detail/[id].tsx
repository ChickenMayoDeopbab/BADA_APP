import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { router, useLocalSearchParams } from "expo-router";
import { Image, ImageSourcePropType, ScrollView, Text, View } from "react-native";

const fallbackLargeImage: ImageSourcePropType = require("@/assets/Q1_l.png");

// 카테고리별 대형 이미지 폴백
const categoryLargeImageMap: Record<string, ImageSourcePropType> = {
  restaurant: require("@/assets/Q1_l.png"),
  hospital: require("@/assets/Q2_l.png"),
  complaint: require("@/assets/Q3_l.png"),
  delivery: require("@/assets/Q3_l.png"),
  bank: require("@/assets/Q2_l.png"),
  custom: require("@/assets/Q1_l.png"),
};

export default function Detail() {
  const { id, title, content, isCustom, scenarioImage, category } =
    useLocalSearchParams<{
      id: string;
      title: string;
      content: string;
      isCustom: string;
      scenarioImage: string;
      category: string;
    }>();

  if (!id || !title) {
    return (
      <View className="flex-1 bg-white">
        <Top title="시나리오 선택" back onBack={() => router.push("/(tabs)/(train)/list")} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-[#5C5E5E]">시나리오를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  const imageSource: ImageSourcePropType = scenarioImage
    ? { uri: scenarioImage }
    : (categoryLargeImageMap[category ?? ""] ?? fallbackLargeImage);

  const typeLabel =
    isCustom === "true" ? "커스텀 시나리오" : "기본 제공 시나리오";

  return (
    <View className="flex-1 bg-white">
      <Top title="시나리오 선택" back onBack={() => router.push("/(tabs)/(train)/list")} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Image
          source={imageSource}
          className="w-full"
          style={{ height: 240 }}
          resizeMode="cover"
        />
        <View className="px-8 pt-5 pb-6">
          <Text className="text-base text-[#5C5E5E] font-medium mb-2">{typeLabel}</Text>
          <Text className="text-3xl font-bold text-[#3B3D3E] mb-6">{title}</Text>
          <Text className="text-sm font-semibold text-[#BDBEBE] mb-1">시나리오 설명</Text>
          <Text className="text-sm text-[#5C5E5E] leading-6">{content}</Text>
        </View>
      </ScrollView>
      <View className="px-8 pb-10 pt-4 gap-y-3">
        <CustomButton
          label="예시 대화 들어보기"
          color="#3B3D3E"
          onPress={() => {
            // TODO: 예시 대화 연결
          }}
        />
        <CustomButton
          label="선택하기"
          backgroundColor="#0AE365"
          color="white"
          onPress={() =>
            router.push({ pathname: "/(tabs)/(train)/start", params: { id } })
          }
        />
      </View>
    </View>
  );
}
