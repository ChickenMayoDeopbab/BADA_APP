import CustomButton from "@/components/common/CustomButton";
import Top from "@/components/common/Top";
import { router } from "expo-router";
import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <Top title={title} back onBack={cancel} right={headerAction} safeArea={false} />

      <ScrollView
        className="flex-1 bg-background-alternative"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow"
      >
        <View className="grow px-[33px] pb-4">
          <View className={compactTop ? "pt-[17px]" : "pt-[23px]"}>
            {children}
          </View>

          <View className="gap-1 pt-6 mt-auto">
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
