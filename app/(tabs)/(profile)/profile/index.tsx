import { deleteSignout } from "@/api/authApi";
import { MyPageResponse } from "@/api/types";
import { getMyPage } from "@/api/userInfoApi";
import CustomButton from "@/components/common/CustomButton";
import DeleteAccountDialog from "@/components/profile/DeleteAccountDialog";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { clearAuthTokens } from "@/utils/authTokenStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MenuRowProps {
  label: string;
  destructive?: boolean;
  onPress?: () => void;
}

const menuRowClassName =
  "h-[55px] w-full flex-row items-center justify-between px-[22px]";
const profileCardShadow = {
  boxShadow: `0px 0px 3.4px 0px ${PALETTE.common[100]}14`,
} as const;

function MenuRow({ label, destructive = false, onPress }: MenuRowProps) {
  const content = (
    <>
      <Text
        className={
          destructive
            ? "text-headline2 font-medium text-status-error"
            : "text-headline2 font-medium text-label-normal"
        }
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={23}
        color={SEMANTIC_COLORS.line.normal}
      />
    </>
  );

  if (!onPress) return <View className={menuRowClassName}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`${menuRowClassName} active:bg-fill-pressed`}
    >
      {content}
    </Pressable>
  );
}

function ProfileScreen() {
  const [myPage, setMyPage] = useState<MyPageResponse | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const response = await getMyPage();
          const profile = response.data;

          if (!active) return;
          setMyPage(profile);
        } catch {
          // 이전에 불러온 정보가 있다면 그대로 유지합니다.
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const handleSignOut = async () => {
    try {
      await deleteSignout();
    } catch {
      // 서버 로그아웃에 실패해도 기기의 로그인 정보는 반드시 제거합니다.
    }

    await Promise.all([
      clearAuthTokens(),
      AsyncStorage.multiRemove([
        "autoLogin",
        "authenticatedUsername",
        "diagnosisResult",
      ]),
    ]);
    router.replace("/auth");
  };

  const displayName = myPage?.name?.trim() || myPage?.username || "";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
      <View className="flex-row items-center justify-between h-16 px-2 bg-background-normal">
        <View className="size-16" />
        <Text className="font-bold text-headline1 text-label-neutral">프로필</Text>
        <View className="size-16" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-6 pt-[22px]"
      >
        <View className="gap-4 px-[33px]">
          <View
            className="w-full items-center gap-4 rounded-component bg-background-normal px-[22px] py-[14px]"
            style={profileCardShadow}
          >
            <View className="items-center gap-3">
              <View className="h-[107px] w-[100px] items-center justify-center overflow-hidden rounded-[36px] bg-fill-neutral">
                <Ionicons
                  name="person"
                  size={52}
                  color={SEMANTIC_COLORS.line.normal}
                />
              </View>

              <View className="w-full items-center gap-0.5">
                <Text
                  numberOfLines={1}
                  className="max-w-[282px] text-title2 font-bold text-label-normal"
                >
                  {displayName}
                </Text>
                <View className="min-h-[18px] w-full flex-row items-center justify-center gap-[10px]">
                  <View className="min-w-0 flex-row items-center gap-0.5">
                    <Ionicons
                      name="person"
                      size={18}
                      color={SEMANTIC_COLORS.label.alternative}
                    />
                    <Text
                      numberOfLines={1}
                      className="max-w-[84px] text-label text-label-alternative"
                    >
                      {myPage?.username ?? ""}
                    </Text>
                  </View>
                  <View className="h-3 w-px bg-line-neutral" />
                  <View className="min-w-0 shrink flex-row items-center gap-0.5">
                    <Ionicons
                      name="mail"
                      size={18}
                      color={SEMANTIC_COLORS.label.alternative}
                    />
                    <Text
                      numberOfLines={1}
                      className="max-w-[158px] shrink text-label text-label-alternative"
                    >
                      {myPage?.email ?? ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <CustomButton
              label="프로필 수정하기"
              variant="md"
              tone="neutral"
              onPress={() => router.push("/(tabs)/(profile)/profile/edit")}
            />
          </View>

          <View className="w-full gap-1.5">
            <Text className="px-1 text-body font-medium text-label-alternative">
              설정
            </Text>
            <View
              className="w-full rounded-component bg-background-normal"
              style={profileCardShadow}
            >
              <View className="w-full overflow-hidden rounded-component">
                <MenuRow
                  label="벨소리"
                  onPress={() =>
                    router.push("/(tabs)/(profile)/profile/settings/ringtone")
                  }
                />
                <MenuRow
                  label="알림"
                  onPress={() =>
                    router.push(
                      "/(tabs)/(profile)/profile/settings/notification",
                    )
                  }
                />
                <MenuRow
                  label="언어"
                  onPress={() =>
                    router.push("/(tabs)/(profile)/profile/settings/language")
                  }
                />
              </View>
            </View>
          </View>

          <View className="w-full gap-1.5">
            <Text className="px-1 text-body font-medium text-label-alternative">
              계정
            </Text>
            <View
              className="w-full rounded-component bg-background-normal"
              style={profileCardShadow}
            >
              <View className="w-full overflow-hidden rounded-component">
                <MenuRow label="로그아웃" destructive onPress={handleSignOut} />
                <MenuRow
                  label="회원 탈퇴"
                  destructive
                  onPress={() => setDeleteDialogVisible(true)}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <DeleteAccountDialog
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

export default ProfileScreen;
