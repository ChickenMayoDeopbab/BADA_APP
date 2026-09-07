import ProfileSettingsScreen from "@/components/profile/ProfileSettingsScreen";
import {
  SettingCard,
  SettingRow,
  SettingToggle,
} from "@/components/profile/SettingControls";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

interface NotificationSettings {
  all: boolean;
  community: boolean;
  training: boolean;
}

const DUMMY_NOTIFICATION_SETTINGS: NotificationSettings = {
  all: true,
  community: true,
  training: true,
};

export default function NotificationSettingsScreen() {
  const [initialSettings, setInitialSettings] =
    useState<NotificationSettings>(DUMMY_NOTIFICATION_SETTINGS);
  const [settings, setSettings] = useState<NotificationSettings>(
    DUMMY_NOTIFICATION_SETTINGS,
  );

  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const setAllNotifications = (enabled: boolean) => {
    setSettings({
      all: enabled,
      community: enabled,
      training: enabled,
    });
  };

  const save = () => {
    setInitialSettings(settings);
    router.back();
  };

  return (
    <ProfileSettingsScreen
      title="알림 설정"
      hasChanges={hasChanges}
      onSave={save}
    >
      <View className="gap-[19px]">
        <SettingCard>
          <SettingRow label="전체 알림">
            <SettingToggle
              label="전체 알림"
              value={settings.all}
              onValueChange={setAllNotifications}
            />
          </SettingRow>
        </SettingCard>

        <SettingCard>
          <SettingRow label="커뮤니티 알림">
            <SettingToggle
              label="커뮤니티 알림"
              value={settings.community}
              disabled={!settings.all}
              onValueChange={(community) =>
                setSettings((current) => ({ ...current, community }))
              }
            />
          </SettingRow>
          <SettingRow label="훈련 알림">
            <SettingToggle
              label="훈련 알림"
              value={settings.training}
              disabled={!settings.all}
              onValueChange={(training) =>
                setSettings((current) => ({ ...current, training }))
              }
            />
          </SettingRow>
        </SettingCard>
      </View>
    </ProfileSettingsScreen>
  );
}
