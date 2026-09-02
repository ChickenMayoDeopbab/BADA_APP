import { postCheckUsername } from "@/api/authApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/api/error";
import { ProfileImageFile, uploadProfileImage } from "@/api/fileApi";
import { MyPageResponse } from "@/api/types";
import { getMyPage, patchMyPage } from "@/api/userInfoApi";
import CustomButton from "@/components/common/CustomButton";
import StyledImage from "@/components/common/StyledImage";
import Top from "@/components/common/Top";
import PhotoLibrarySheet from "@/components/profile/PhotoLibrarySheet";
import {
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_USERNAME_MAX_LENGTH,
  toSingleLine,
  validateProfileName,
  validateProfileUsername,
} from "@/constants/profileValidation";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useProfileImage } from "@/hooks/useProfileImage";
import { setAuthenticatedUsername } from "@/utils/diagnosisFlow";
import { prepareProfileImageForUpload } from "@/utils/profileImageProcessing";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ProfileField({
  label,
  error,
  success,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; success?: string; hint: string }) {
  return (
    <View className="gap-1 pb-3">
      <Text className="font-medium text-label text-label-alternative">{label}</Text>
      <View className={`h-12 justify-center rounded-component bg-neutral-95 px-3 ${error ? "border border-status-error" : ""}`}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={false}
          numberOfLines={1}
          textAlignVertical="center"
          className="h-full w-full p-0 text-body text-label-normal"
        />
      </View>
      <Text
        accessibilityLiveRegion="polite"
        className={`text-caption ${error ? "text-status-error" : success ? "text-primary-normal" : "text-label-alternative"}`}
      >
        {error || success || hint}
      </Text>
    </View>
  );
}

export default function ProfileEditScreen() {
  const [myPage, setMyPage] = useState<MyPageResponse | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [checkedUsername, setCheckedUsername] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [selectedImage, setSelectedImage] = useState<ProfileImageFile | null>(null);
  const [uploadedS3Key, setUploadedS3Key] = useState<string | null>(null);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mounted = useRef(false);
  const checkRequest = useRef(0);
  const saving = useRef(false);
  const savedImage = useProfileImage(myPage?.s3Key);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { data: profile } = await getMyPage();
      if (!mounted.current) return;
      setMyPage(profile);
      setName(profile.name?.trim() ?? "");
      setUsername(profile.username);
    } catch (error) {
      if (mounted.current) {
        setLoadError(getApiErrorMessage(error, "프로필을 불러오지 못했어요. 다시 시도해주세요."));
      }
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadProfile();
    return () => {
      mounted.current = false;
      checkRequest.current += 1;
    };
  }, [loadProfile]);

  const usernameChanged = Boolean(myPage && username.trim() !== myPage.username);
  const hasChanges = Boolean(myPage && (
    name.trim() !== (myPage.name?.trim() ?? "") || usernameChanged || selectedImage
  ));
  const canEdit = Boolean(myPage) && !isLoading && !isSaving;

  const checkUsername = async () => {
    if (!canEdit || isChecking || !usernameChanged) return;
    const validationError = validateProfileUsername(username);
    setUsernameError(validationError);
    if (validationError) return;

    const candidate = username.trim();
    const request = ++checkRequest.current;
    setCheckedUsername(null);
    setIsChecking(true);
    try {
      const response = await postCheckUsername({ username: candidate });
      if (!mounted.current || request !== checkRequest.current) return;
      if (response.data !== true) {
        setUsernameError("이미 사용 중인 아이디입니다.");
        return;
      }
      setCheckedUsername(candidate);
      setUsernameError("");
    } catch (error) {
      if (mounted.current && request === checkRequest.current) {
        setUsernameError(getApiErrorMessage(error, "아이디 중복 확인에 실패했어요. 다시 시도해주세요."));
      }
    } finally {
      if (mounted.current && request === checkRequest.current) setIsChecking(false);
    }
  };

  const selectImage = (uri: string, fileName?: string) => {
    if (!canEdit || saving.current) return;
    setSelectedImage({ uri, fileName });
    setUploadedS3Key(null);
    setUploadError("");
    setSaveError("");
  };

  const saveChanges = async () => {
    if (!myPage || !hasChanges || saving.current || isChecking) return;
    const nextNameError = validateProfileName(name);
    const nextUsernameError = validateProfileUsername(username) ||
      (usernameChanged && checkedUsername !== username.trim() ? "아이디 중복 확인을 완료해주세요." : "");
    setNameError(nextNameError);
    setUsernameError(nextUsernameError);
    if (nextNameError || nextUsernameError) return;

    saving.current = true;
    setIsSaving(true);
    setSaveError("");
    setUploadError("");
    let stage: "upload" | "profile" = selectedImage && !uploadedS3Key
      ? "upload"
      : "profile";
    try {
      let nextS3Key = uploadedS3Key ?? myPage.s3Key ?? undefined;
      if (selectedImage && !uploadedS3Key) {
        setIsUploading(true);
        const prepared = await prepareProfileImageForUpload(
          selectedImage.uri,
          selectedImage.fileName,
        );
        const uploaded = await uploadProfileImage(prepared);
        nextS3Key = uploaded.s3Key;
        if (!mounted.current) return;
        setUploadedS3Key(uploaded.s3Key);
        setIsUploading(false);
      }

      stage = "profile";
      await patchMyPage({
        name: name.trim(),
        username: username.trim(),
        // 사진을 바꾸지 않았다면 기존 key를 보존합니다. 로컬 URI는 전송하지 않습니다.
        s3Key: nextS3Key,
      });
      if (usernameChanged) {
        await setAuthenticatedUsername(username.trim()).catch(() => {
          // 서버 저장은 완료되었으므로 로컬 로그인 표시값 실패로 재전송하지 않습니다.
        });
      }
      if (mounted.current) router.back();
    } catch (error) {
      if (!mounted.current) return;
      const message = getApiErrorMessage(
        error,
        stage === "upload"
          ? "사진 업로드에 실패했어요. 저장 버튼을 눌러 다시 시도해주세요."
          : "프로필 저장에 실패했어요. 다시 시도해주세요.",
      );
      if (stage === "upload") {
        setUploadError(message);
      } else if (usernameChanged && getApiErrorStatus(error) === 409) {
        setCheckedUsername(null);
        setUsernameError(message);
      } else {
        setSaveError(message);
      }
    } finally {
      saving.current = false;
      if (mounted.current) {
        setIsUploading(false);
        setIsSaving(false);
      }
    }
  };

  const cancelChanges = () => {
    if (saving.current) return;
    checkRequest.current += 1;
    router.back();
  };
  const imageUri = selectedImage?.uri || savedImage.uri;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <Top title="프로필 수정" back onBack={cancelChanges} safeArea={false} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          className="flex-1 bg-background-normal"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="grow"
        >
          <View className="grow px-[33px] pb-4 pt-[21px]">
            {isLoading && <ActivityIndicator accessibilityLabel="프로필 불러오는 중" color={SEMANTIC_COLORS.primary.normal} />}
            {loadError ? (
              <View className="mb-4 gap-2">
                <Text className="text-label text-status-error">{loadError}</Text>
                <CustomButton label="다시 불러오기" variant="md" onPress={() => void loadProfile()} />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="프로필 사진 변경"
              disabled={!canEdit}
              onPress={() => setLibraryVisible(true)}
              className="h-[116px] w-[104px] self-center active:opacity-70"
            >
              <View className="h-[107px] w-[100px] items-center justify-center overflow-hidden rounded-[36px] bg-fill-neutral">
                {imageUri ? (
                  <StyledImage
                    source={{ uri: imageUri }}
                    contentFit="cover"
                    className="absolute inset-0 size-full"
                    onError={selectedImage ? undefined : savedImage.onError}
                  />
                ) : <Ionicons name="person" size={52} color={SEMANTIC_COLORS.line.normal} />}
                {isUploading && (
                  <View className="absolute inset-0 items-center justify-center bg-common-100/30">
                    <ActivityIndicator accessibilityLabel="사진 업로드 중" color={SEMANTIC_COLORS.background.normal} />
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 size-8 items-center justify-center rounded-component border-2 border-background-normal bg-fill-neutral">
                <Ionicons name="pencil" size={20} color={SEMANTIC_COLORS.label.neutral} />
              </View>
            </Pressable>
            {isUploading && <Text className="mt-2 text-center text-caption text-label-alternative">사진을 업로드하고 있어요.</Text>}
            {uploadError ? (
              <Text accessibilityLiveRegion="polite" className="mt-2 text-center text-caption text-status-error">{uploadError}</Text>
            ) : !selectedImage && savedImage.error ? (
              <Pressable onPress={savedImage.retry} accessibilityRole="button" accessibilityLabel="프로필 사진 다시 불러오기">
                <Text className="mt-2 text-center text-caption text-status-error">{savedImage.error}</Text>
              </Pressable>
            ) : null}

            <View className="mt-[21px]">
              <ProfileField
                label="이름"
                value={name}
                editable={canEdit}
                maxLength={PROFILE_NAME_MAX_LENGTH}
                placeholder="이름을 입력해주세요"
                returnKeyType="done"
                error={nameError}
                hint={`2~${PROFILE_NAME_MAX_LENGTH}자 · ${name.length}/${PROFILE_NAME_MAX_LENGTH}`}
                onChangeText={(text) => {
                  setName(toSingleLine(text).slice(0, PROFILE_NAME_MAX_LENGTH));
                  setNameError("");
                  setSaveError("");
                }}
              />
              <View className="flex-row items-start gap-[5px]">
                <View className="min-w-0 flex-1">
                  <ProfileField
                    label="아이디"
                    value={username}
                    editable={canEdit}
                    maxLength={PROFILE_USERNAME_MAX_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={() => void checkUsername()}
                    error={usernameError}
                    success={usernameChanged && checkedUsername === username.trim() ? "사용 가능한 아이디입니다." : ""}
                    hint={usernameChanged ? "변경 시 중복 확인이 필요해요." : `2~${PROFILE_USERNAME_MAX_LENGTH}자 · ${username.length}/${PROFILE_USERNAME_MAX_LENGTH}`}
                    onChangeText={(text) => {
                      setUsername(toSingleLine(text).slice(0, PROFILE_USERNAME_MAX_LENGTH));
                      checkRequest.current += 1;
                      setCheckedUsername(null);
                      setIsChecking(false);
                      setUsernameError("");
                      setSaveError("");
                    }}
                  />
                </View>
                <View className="mt-[22px] h-12 w-[105px]">
                  <CustomButton
                    label={isChecking ? "확인 중" : "중복 확인"}
                    variant="lg"
                    tone="primary"
                    className="h-12"
                    disabled={!canEdit || isChecking || !usernameChanged || checkedUsername === username.trim()}
                    onPress={() => void checkUsername()}
                  />
                </View>
              </View>
            </View>

            <View className="mt-auto gap-1 pt-6">
              {saveError ? <Text accessibilityLiveRegion="polite" className="mb-2 text-center text-label text-status-error">{saveError}</Text> : null}
              <CustomButton
                label={isSaving ? "저장 중" : "변경사항 저장하기"}
                disabled={!canEdit || !hasChanges || isChecking}
                onPress={() => void saveChanges()}
                tone="primary"
              />
              <CustomButton label="취소하기" disabled={isSaving} onPress={cancelChanges} tone="neutral" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PhotoLibrarySheet visible={libraryVisible} onClose={() => setLibraryVisible(false)} onSelect={selectImage} />
    </SafeAreaView>
  );
}
