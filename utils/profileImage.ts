import { getFileUrl } from "@/api/fileApi";
import { FileUploadResponse } from "@/api/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const fileIds = new Map<string, number>();
const cacheKey = (s3Key: string) =>
  `profileImageFileId:${encodeURIComponent(s3Key)}`;

export async function rememberProfileImage(file: FileUploadResponse) {
  fileIds.set(file.s3Key, file.fileId);
  try {
    await AsyncStorage.setItem(cacheKey(file.s3Key), String(file.fileId));
  } catch {
    // 기기 저장소 기록이 실패해도 현재 세션에서는 메모리 값을 사용합니다.
  }
}

export async function resolveProfileImage(s3Key: string): Promise<string> {
  if (/^https?:\/\//i.test(s3Key)) return s3Key;

  let fileId = fileIds.get(s3Key);
  if (!fileId) {
    const stored = await AsyncStorage.getItem(cacheKey(s3Key));
    const parsed = Number(stored);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      fileId = parsed;
      fileIds.set(s3Key, parsed);
    }
  }

  if (!fileId) {
    throw new Error(
      "사진의 fileId를 찾지 못했어요. 서버 프로필 응답에 fileId가 필요합니다.",
    );
  }
  return getFileUrl(fileId);
}
