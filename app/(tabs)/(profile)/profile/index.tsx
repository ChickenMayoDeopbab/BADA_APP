import { deleteSignout } from "@/api/authApi";
import { MyPageResponse } from "@/api/types";
import { getMyPage } from "@/api/userInfoApi";
import CustomButton from "@/components/common/CustomButton";
import StyledImage from "@/components/common/StyledImage";
import Top from "@/components/common/Top";
import DeleteAccountDialog from "@/components/profile/DeleteAccountDialog";
import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { useProfileImage } from "@/hooks/useProfileImage";
import { unregisterForPushNotifications } from "@/services/pushNotifications";
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
  const profileImage = useProfileImage(myPage?.s3Key);

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
    await unregisterForPushNotifications();

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

  const displayName = myPage?.name?.trim() ?? "";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <Top title="프로필" safeArea={false} />

      <ScrollView
        className="flex-1 bg-background-alternative"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-[33px] pb-6 pt-[22px]"
      >
        <View
          className="w-full items-center gap-6 rounded-component bg-background-normal px-[22px] py-[14px]"
          style={profileCardShadow}
        >
          <View className="items-center gap-4">
            <View className="size-[90px] items-center justify-center overflow-hidden rounded-[32px] bg-fill-neutral">
              {profileImage.uri ? (
                <StyledImage
                  source={{ uri: profileImage.uri }}
                  contentFit="cover"
                  className="absolute inset-0 size-full"
                  onError={profileImage.onError}
                />
              ) : <Ionicons
                name="person"
                size={52}
                color={SEMANTIC_COLORS.line.normal}
              />}
            </View>
            {profileImage.error ? (
              <Pressable onPress={profileImage.retry} accessibilityRole="button" accessibilityLabel="프로필 사진 다시 불러오기">
                <Text className="text-center text-caption text-status-error">{profileImage.error}</Text>
              </Pressable>
            ) : null}

            <View className="w-full items-center gap-2">
              <Text
                numberOfLines={1}
                className="max-w-[282px] text-title2 font-bold text-label-normal"
              >
                {displayName}
              </Text>
              {myPage?.levelName ? (
                <View className="flex-row items-center gap-1 rounded-pill bg-primary-normal px-2.5 py-1">
                  <Ionicons
                    name="sparkles"
                    size={14}
                    color={SEMANTIC_COLORS.label.buttonText}
                  />
                  <Text className="font-bold text-caption text-label-buttonText">
                    자가진단 · {myPage.levelName}
                  </Text>
                </View>
              ) : null}
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
                <View className="w-px h-3 bg-line-neutral" />
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

          <View className="w-full gap-2">
            <CustomButton
              label="프로필 수정하기"
              variant="md"
              backgroundColor={SEMANTIC_COLORS.background.alternative}
              color={SEMANTIC_COLORS.label.neutral}
              onPress={() => router.push("/(tabs)/(profile)/profile/edit")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                myPage?.levelName
                  ? "자가진단 다시 하기"
                  : "자가진단 시작하기"
              }
              className="items-center justify-center py-1 active:opacity-60"
              onPress={() =>
                router.push({
                  pathname: "/diagnosis/question",
                  params: { from: "profile" },
                })
              }
            >
              <Text className="font-medium text-caption text-label-alternative">
                {myPage?.levelName
                  ? "자가진단 다시 하기"
                  : "자가진단 시작하기"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="w-full gap-1.5">
          <Text className="px-1 font-medium text-body text-label-alternative">
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
                  router.push("/(tabs)/(profile)/profile/settings/notification")
                }
              />
              {/* <MenuRow
                label="언어"
                onPress={() =>
                  router.push("/(tabs)/(profile)/profile/settings/language")
                }
              />
              외국어 구현이 아직 안되어 있어 언어 설정은 숨김 처리합니다. 
              */}
            </View>
          </View>
        </View>

        <View className="w-full gap-1.5">
          <Text className="px-1 font-medium text-body text-label-alternative">
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
      </ScrollView>

      <DeleteAccountDialog
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

export default ProfileScreen;
