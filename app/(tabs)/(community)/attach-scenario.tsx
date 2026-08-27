import CustomButton from "@/components/common/CustomButton";
import CommunityHeader from "@/components/community/CommunityHeader";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AttachScenarioScreen() {
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-background-normal"
    >
      <CommunityHeader title="첨부 시나리오 선택" />

      <View className="items-end px-[33px] pb-3 pt-2">
        <View className="h-12 w-[135px] flex-row items-center justify-between rounded-component bg-fill-normal px-3 opacity-70">
          <Text className="text-label text-label-alternative">전체</Text>
          <Ionicons
            name="caret-down"
            size={18}
            color={SEMANTIC_COLORS.line.normal}
          />
        </View>
      </View>

      <View className="mx-[33px] flex-1 items-center justify-center rounded-component bg-background-alternative px-8">
        <Ionicons
          name="videocam-outline"
          size={38}
          color={SEMANTIC_COLORS.line.normal}
        />
        <Text className="mt-3 text-center text-body text-label-alternative">
          시나리오 첨부 기능을 준비하고 있어요.
        </Text>
        <Text className="mt-1 text-center text-caption text-line-normal">
          첨부 API가 연결되면 내 커스텀 시나리오를 선택할 수 있어요.
        </Text>
      </View>

      <View className="gap-y-1.5 px-[33px] pb-6 pt-4">
        <CustomButton
          label="선택 시나리오 첨부하기"
          tone="primary"
          disabled
        />
        <CustomButton
          label="취소하기"
          tone="neutral"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}
