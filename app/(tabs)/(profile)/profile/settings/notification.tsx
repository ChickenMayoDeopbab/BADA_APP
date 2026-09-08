import { NotificationSettingResponse } from "@/api/types";
import ProfileSettingsScreen from "@/components/profile/ProfileSettingsScreen";
import {
  SettingCard,
  SettingRow,
  SettingToggle,
} from "@/components/profile/SettingControls";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/hooks/useNotifications";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

export default function NotificationSettingsScreen() {
  const settingsQuery = useNotificationSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();
  const [initialSettings, setInitialSettings] =
    useState<NotificationSettingResponse | null>(null);
  const [settings, setSettings] =
    useState<NotificationSettingResponse | null>(null);

  useEffect(() => {
    if (!settingsQuery.data) return;

    setInitialSettings(settingsQuery.data);
    setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  const hasChanges =
    settings !== null &&
    initialSettings !== null &&
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const setAllNotifications = (enabled: boolean) => {
    setSettings({
      allEnabled: enabled,
      communityEnabled: enabled,
      trainingEnabled: enabled,
    });
  };

  const save = () => {
    if (!settings || updateSettingsMutation.isPending) return;

    updateSettingsMutation.mutate(settings, {
      onSuccess: ({ data }) => {
        setInitialSettings(data);
        setSettings(data);
        router.back();
      },
      onError: () => {
        Alert.alert(
          "알림 설정을 저장하지 못했어요",
          "네트워크 상태를 확인하고 다시 시도해 주세요.",
        );
      },
    });
  };

  return (
    <ProfileSettingsScreen
      title="알림 설정"
      hasChanges={hasChanges && !updateSettingsMutation.isPending}
      onSave={save}
    >
      {settingsQuery.isPending ? (
        <View className="items-center justify-center py-16">
          <ActivityIndicator />
        </View>
      ) : settingsQuery.isError || !settings ? (
        <View className="items-center justify-center gap-3 py-16">
          <Text className="font-medium text-body text-label-neutral">
            알림 설정을 불러오지 못했어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void settingsQuery.refetch()}
            className="rounded-component bg-primary-normal px-4 py-2 active:opacity-70"
          >
            <Text className="font-medium text-body text-static-white">
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-[19px]">
          <SettingCard>
            <SettingRow label="전체 알림">
              <SettingToggle
                label="전체 알림"
                value={settings.allEnabled}
                onValueChange={setAllNotifications}
              />
            </SettingRow>
          </SettingCard>

          <SettingCard>
            <SettingRow label="커뮤니티 알림">
              <SettingToggle
                label="커뮤니티 알림"
                value={settings.communityEnabled}
                disabled={!settings.allEnabled}
                onValueChange={(communityEnabled) =>
                  setSettings((current) =>
                    current ? { ...current, communityEnabled } : current,
                  )
                }
              />
            </SettingRow>
            <SettingRow label="훈련 알림">
              <SettingToggle
                label="훈련 알림"
                value={settings.trainingEnabled}
                disabled={!settings.allEnabled}
                onValueChange={(trainingEnabled) =>
                  setSettings((current) =>
                    current ? { ...current, trainingEnabled } : current,
                  )
                }
              />
            </SettingRow>
          </SettingCard>
        </View>
      )}
    </ProfileSettingsScreen>
  );
}
