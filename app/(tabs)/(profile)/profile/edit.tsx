import { MyPageResponse } from "@/api/types";
import { getMyPage } from "@/api/userInfoApi";
import CustomButton from "@/components/common/CustomButton";
import StyledImage from "@/components/common/StyledImage";
import PhotoLibrarySheet from "@/components/profile/PhotoLibrarySheet";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="font-medium text-label text-label-alternative">
        {label}
      </Text>
      <View className="justify-center h-12 px-3 overflow-hidden rounded-component bg-neutral-95">
        <TextInput
          accessibilityLabel={label}
          editable={false}
          value={value}
          textAlignVertical="center"
          className="h-full w-full p-0 text-body text-label-normal"
        />
      </View>
      <View className="h-4" />
    </View>
  );
}

export default function ProfileEditScreen() {
  const [myPage, setMyPage] = useState<MyPageResponse | null>(null);
  const [savedImageUri, setSavedImageUri] = useState<string | null>(null);
  const [draftImageUri, setDraftImageUri] = useState<string | null>(null);
  const [libraryVisible, setLibraryVisible] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await getMyPage();
        const profile = response.data;

        if (!active) return;
        setMyPage(profile);
      } catch {
        // 프로필 화면은 빈 상태를 유지합니다.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const saveChanges = () => {
    setSavedImageUri(draftImageUri);
    router.back();
  };

  const cancelChanges = () => {
    setDraftImageUri(savedImageUri);
    router.back();
  };

  const displayName = myPage?.name?.trim() || myPage?.username || "";
  const hasChanges = draftImageUri !== savedImageUri;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <View className="flex-row items-center justify-between h-16 px-2 bg-background-normal">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="프로필로 돌아가기"
          onPress={cancelChanges}
          hitSlop={8}
          className="items-center justify-center size-16 active:opacity-70"
        >
          <Ionicons
            name="chevron-back"
            size={32}
            color={SEMANTIC_COLORS.label.alternative}
          />
        </Pressable>
        <Text className="font-bold text-headline1 text-label-neutral">
          프로필 수정
        </Text>
        <View className="size-16" />
      </View>

      <ScrollView
        className="flex-1 bg-background-normal"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow"
      >
        <View className="grow px-[33px] pb-4 pt-[21px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="프로필 사진 변경"
            onPress={() => setLibraryVisible(true)}
            className="h-[116px] w-[104px] self-center active:opacity-70"
          >
            <View className="h-[107px] w-[100px] items-center justify-center overflow-hidden rounded-[36px] bg-fill-neutral">
              {draftImageUri ? (
                <StyledImage
                  source={{ uri: draftImageUri }}
                  contentFit="cover"
                  className="absolute inset-0 size-full"
                />
              ) : (
                <Ionicons
                  name="person"
                  size={52}
                  color={SEMANTIC_COLORS.line.normal}
                />
              )}
            </View>
            <View className="absolute bottom-0 right-0 items-center justify-center border-2 size-8 rounded-component border-background-normal bg-fill-neutral">
              <Ionicons
                name="pencil"
                size={20}
                color={SEMANTIC_COLORS.label.neutral}
              />
            </View>
          </Pressable>

          <View className="mt-[21px]">
            <ReadonlyField label="이름" value={displayName} />
            <View className="flex-row items-start gap-[5px]">
              <View className="flex-1">
                <ReadonlyField label="아이디" value={myPage?.username ?? ""} />
              </View>
              <View className="mt-[22px] h-12 w-[105px]">
                <CustomButton
                  label="중복 확인"
                  variant="lg"
                  tone="primary"
                  className="h-12"
                />
              </View>
            </View>
          </View>

          <View className="gap-1 pt-6 mt-auto">
            <CustomButton
              label="변경사항 저장하기"
              disabled={!hasChanges}
              onPress={saveChanges}
              tone="primary"
            />
            <CustomButton
              label="취소하기"
              onPress={cancelChanges}
              tone="neutral"
            />
          </View>
        </View>
      </ScrollView>

      <PhotoLibrarySheet
        visible={libraryVisible}
        onClose={() => setLibraryVisible(false)}
        onSelect={setDraftImageUri}
      />
    </SafeAreaView>
  );
}
