import ProfileSettingsScreen from "@/components/profile/ProfileSettingsScreen";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type AppLanguage = "ko" | "en";

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  ko: "한국어",
  en: "English",
};

export default function LanguageSettingsScreen() {
  const [initialLanguage, setInitialLanguage] = useState<AppLanguage>("ko");
  const [language, setLanguage] = useState<AppLanguage>("ko");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const hasChanges = language !== initialLanguage;

  const chooseLanguage = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setDropdownOpen(false);
  };

  const save = () => {
    setInitialLanguage(language);
    router.back();
  };

  return (
    <ProfileSettingsScreen
      title="언어 설정"
      hasChanges={hasChanges}
      onSave={save}
      compactTop
    >
      <View className="gap-1">
        <Text className="text-label font-medium text-label-alternative">
          언어
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="언어 목록 열기"
          accessibilityState={{ expanded: dropdownOpen }}
          onPress={() => setDropdownOpen((open) => !open)}
          className="h-14 w-full flex-row items-center justify-between rounded-component bg-background-normal px-3 active:bg-fill-pressed"
        >
          <Text className="text-headline2 font-medium text-label-normal">
            {LANGUAGE_LABELS[language]}
          </Text>
          <Ionicons
            name={dropdownOpen ? "caret-up" : "caret-down"}
            size={18}
            color={SEMANTIC_COLORS.line.normal}
          />
        </Pressable>

        {dropdownOpen && (
          <View className="mt-0 w-full overflow-hidden rounded-component bg-background-normal">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: language === "ko" }}
              onPress={() => chooseLanguage("ko")}
              className="h-[52px] w-full justify-center bg-background-normal p-3 active:bg-fill-pressed"
            >
              <Text className="text-headline2 font-medium text-label-normal">
                한국어
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: language === "en" }}
              onPress={() => chooseLanguage("en")}
              className="h-[52px] w-full justify-center bg-fill-normal p-3 active:bg-fill-pressed"
            >
              <Text className="text-headline2 font-medium text-label-normal">
                English
              </Text>
            </Pressable>
          </View>
        )}
        <View className="h-4" />
      </View>
    </ProfileSettingsScreen>
  );
}
