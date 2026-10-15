import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

const IMAGE_PICKER_UNAVAILABLE_MESSAGE =
  "현재 설치된 앱에서는 사진 선택 기능을 사용할 수 없어요. 사진 기능을 지원하는 버전으로 앱을 다시 설치해주세요.";

/** 사진을 선택할 때만 모듈을 불러오고 구버전 앱에서는 안내 오류를 반환한다. */
async function loadImagePicker(): Promise<typeof import("expo-image-picker")> {
  if (
    Platform.OS !== "web" &&
    !requireOptionalNativeModule("ExponentImagePicker")
  ) {
    throw new Error(IMAGE_PICKER_UNAVAILABLE_MESSAGE);
  }

  try {
    return await import("expo-image-picker");
  } catch {
    throw new Error(IMAGE_PICKER_UNAVAILABLE_MESSAGE);
  }
}

/** 시스템 사진 선택기에서 이미지 한 장을 선택한다. */
export async function pickSingleImage() {
  const ImagePicker = await loadImagePicker();
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
}

/** 사진 선택기를 지원하는 Android 앱에서만 중단된 선택 결과를 복원한다. */
export async function getPendingImagePickerResult() {
  if (
    Platform.OS !== "android" ||
    !requireOptionalNativeModule("ExponentImagePicker")
  ) {
    return null;
  }

  const ImagePicker = await loadImagePicker();
  return ImagePicker.getPendingResultAsync();
}
