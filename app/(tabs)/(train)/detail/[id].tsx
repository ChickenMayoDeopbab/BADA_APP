import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { router, useLocalSearchParams } from "expo-router";
import { Image, ImageSourcePropType, ScrollView, Text, View } from "react-native";

type ScenarioDetail = {
  id: string;
  title: string;
  type: "기본 제공 시나리오" | "커스텀 시나리오";
  description: string;
  image: ImageSourcePropType;
};

const dummyScenarioDetails: ScenarioDetail[] = [
  {
    id: "1",
    title: "피자 주문하기",
    type: "기본 제공 시나리오",
    description:
      "집 근처 피자 가게인 '준하네 피자'에서 원하는 피자를 주문하는 시나리오입니다. 메뉴 결정, 배송지, 결제 수단에 이르는 상황을 훈련해 보세요.",
    image: require("@/assets/Q1_l.png"),
  },
  {
    id: "2",
    title: "병원 예약하기",
    type: "기본 제공 시나리오",
    description:
      "내과 병원에 전화하여 진료 예약을 잡는 시나리오입니다. 증상 설명, 원하는 날짜와 시간 조율, 이름과 연락처 전달 등의 상황을 훈련해 보세요.",
    image: require("@/assets/Q2_l.png"),
  },
  {
    id: "3",
    title: "피자 주문하기",
    type: "기본 제공 시나리오",
    description:
      "집 근처 피자 가게인 '준하네 피자'에서 원하는 피자를 주문하는 시나리오입니다. 메뉴 결정, 배송지, 결제 수단에 이르는 상황을 훈련해 보세요.",
    image: require("@/assets/Q1_l.png"),
  },
  {
    id: "4",
    title: "주문 정정하기",
    type: "기본 제공 시나리오",
    description:
      "온라인으로 주문한 물건의 수량이나 배송지를 전화로 수정하는 시나리오입니다. 주문 번호 확인, 변경 요청, 수정 완료 확인 등의 상황을 훈련해 보세요.",
    image: require("@/assets/Q3_l.png"),
  },
  {
    id: "5",
    title: "피자 주문하기",
    type: "기본 제공 시나리오",
    description:
      "집 근처 피자 가게인 '준하네 피자'에서 원하는 피자를 주문하는 시나리오입니다. 메뉴 결정, 배송지, 결제 수단에 이르는 상황을 훈련해 보세요.",
    image: require("@/assets/Q1_l.png"),
  },
  {
    id: "6",
    title: "피자 주문하기",
    type: "기본 제공 시나리오",
    description:
      "집 근처 피자 가게인 '준하네 피자'에서 원하는 피자를 주문하는 시나리오입니다. 메뉴 결정, 배송지, 결제 수단에 이르는 상황을 훈련해 보세요.",
    image: require("@/assets/Q2_l.png"),
  },
  {
    id: "7",
    title: "변성우한테 전화하기",
    type: "커스텀 시나리오",
    description:
      "지인에게 직접 전화를 걸어 용건을 전달하는 시나리오입니다. 간단한 안부 교환부터 약속 잡기, 부탁 전달까지 일상적인 통화 상황을 훈련해 보세요.",
    image: require("@/assets/Q2_l.png"),
  },
  {
    id: "8",
    title: "변성우한테 전화하기",
    type: "커스텀 시나리오",
    description:
      "지인에게 직접 전화를 걸어 용건을 전달하는 시나리오입니다. 간단한 안부 교환부터 약속 잡기, 부탁 전달까지 일상적인 통화 상황을 훈련해 보세요.",
    image: require("@/assets/Q2_l.png"),
  },
  {
    id: "9",
    title: "변성우한테 전화하기",
    type: "커스텀 시나리오",
    description:
      "지인에게 직접 전화를 걸어 용건을 전달하는 시나리오입니다. 간단한 안부 교환부터 약속 잡기, 부탁 전달까지 일상적인 통화 상황을 훈련해 보세요.",
    image: require("@/assets/Q2_l.png"),
  },
  {
    id: "10",
    title: "변성우한테 전화하기",
    type: "커스텀 시나리오",
    description:
      "지인에게 직접 전화를 걸어 용건을 전달하는 시나리오입니다. 간단한 안부 교환부터 약속 잡기, 부탁 전달까지 일상적인 통화 상황을 훈련해 보세요.",
    image: require("@/assets/Q2_l.png"),
  },
  {
    id: "11",
    title: "변성우한테 전화하기",
    type: "커스텀 시나리오",
    description:
      "지인에게 직접 전화를 걸어 용건을 전달하는 시나리오입니다. 간단한 안부 교환부터 약속 잡기, 부탁 전달까지 일상적인 통화 상황을 훈련해 보세요.",
    image: require("@/assets/Q2_l.png"),
  },
];

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scenario = dummyScenarioDetails.find((s) => s.id === id);

  if (!scenario) {
    return (
      <View className="flex-1 bg-white">
        <Top title="시나리오 선택" back onBack={() => router.push("/(tabs)/(train)/list")} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-[#5C5E5E]">시나리오를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Top title="시나리오 선택" back onBack={() => router.push("/(tabs)/(train)/list")} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Image
          source={scenario.image}
          className="w-full"
          style={{ height: 240 }}
          resizeMode="cover"
        />
        <View className="px-8 pt-5 pb-6">
          <Text className="text-base text-[#5C5E5E] font-medium mb-2">{scenario.type}</Text>
          <Text className="text-3xl font-bold text-[#3B3D3E] mb-6">{scenario.title}</Text>
          <Text className="text-sm font-semibold text-[#BDBEBE] mb-1">시나리오 설명</Text>
          <Text className="text-sm text-[#5C5E5E] leading-6">{scenario.description}</Text>
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
          onPress={() => {
            // TODO: 훈련 시작 화면으로 라우팅
          }}
        />
      </View>
    </View>
  );
}
