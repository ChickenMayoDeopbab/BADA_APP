import CustomButton from "@/components/common/CustomButton";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ProfileSettingsScreenProps {
  title: string;
  children: ReactNode;
  hasChanges: boolean;
  onSave: () => void;
  onCancel?: () => void;
  headerAction?: ReactNode;
  compactTop?: boolean;
}

export default function ProfileSettingsScreen({
  title,
  children,
  hasChanges,
  onSave,
  onCancel,
  headerAction,
  compactTop = false,
}: ProfileSettingsScreenProps) {
  const cancel = onCancel ?? (() => router.back());

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
      <View className="h-16 flex-row items-center justify-between bg-background-normal px-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="프로필로 돌아가기"
          onPress={cancel}
          hitSlop={8}
          className="size-16 items-center justify-center active:opacity-70"
        >
          <Ionicons
            name="chevron-back"
            size={32}
            color={SEMANTIC_COLORS.label.alternative}
          />
        </Pressable>
        <Text className="text-headline1 font-bold text-label-neutral">
          {title}
        </Text>
        <View className="size-16 items-center justify-center">{headerAction}</View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow"
      >
        <View className="grow px-[33px] pb-4">
          <View className={compactTop ? "pt-[17px]" : "pt-[23px]"}>
            {children}
          </View>

          <View className="mt-auto gap-1 pt-6">
            <CustomButton
              label="변경사항 저장하기"
              disabled={!hasChanges}
              onPress={onSave}
              tone="primary"
            />
            <CustomButton
              label="취소하기"
              onPress={cancel}
              tone="neutral"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
