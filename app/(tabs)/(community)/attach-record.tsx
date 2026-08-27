import CustomButton from "@/components/common/CustomButton";
import CommunityHeader from "@/components/community/CommunityHeader";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AttachTrainingRecordScreen() {
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-background-normal"
    >
      <CommunityHeader title="첨부 훈련기록 선택" />

      <View className="mx-3 mb-5 mt-2 h-12 flex-row items-center justify-between rounded-component bg-fill-normal px-6 opacity-70">
        <Ionicons
          name="calendar-outline"
          size={18}
          color={SEMANTIC_COLORS.line.normal}
        />
        <Text className="text-body font-medium text-label-alternative">
          날짜 선택
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={SEMANTIC_COLORS.line.normal}
        />
      </View>

      <View className="mx-3 flex-1 items-center justify-center rounded-component bg-background-alternative px-8">
        <Ionicons
          name="time-outline"
          size={36}
          color={SEMANTIC_COLORS.line.normal}
        />
        <Text className="mt-3 text-center text-body text-label-alternative">
          훈련기록 첨부 기능을 준비하고 있어요.
        </Text>
        <Text className="mt-1 text-center text-caption text-line-normal">
          첨부 API가 연결되면 날짜별 기록을 선택할 수 있어요.
        </Text>
      </View>

      <View className="gap-y-1.5 px-[33px] pb-6 pt-4">
        <CustomButton
          label="선택 훈련기록 첨부하기"
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
