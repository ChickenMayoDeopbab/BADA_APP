import { Platform } from "react-native";
import apiClient from "./client";
import { ApiResponse, FileUploadResponse, FileUrlResponse } from "./types";

export interface ProfileImageFile {
  uri: string;
  fileName?: string;
}

const imageMimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
};

export const uploadProfileImage = async ({ uri, fileName }: ProfileImageFile) => {
  const name = fileName || uri.split(/[?#]/)[0].split("/").pop() || "profile.jpg";
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const type = imageMimeTypes[extension] ?? "application/octet-stream";
  const formData = new FormData();

  if (Platform.OS === "web") {
    const fileResponse = await fetch(uri);
    if (!fileResponse.ok) throw new Error("선택한 사진을 읽지 못했습니다.");
    formData.append("file", await fileResponse.blob(), name);
  } else {
    // React Native의 FormData는 Blob 대신 로컬 URI 파일 객체를 지원합니다.
    formData.append("file", { uri, name, type } as unknown as Blob);
  }

  const response = await apiClient.post<ApiResponse<FileUploadResponse>>(
    "/api/v1/file/upload",
    formData,
    {
      params: { fileType: "PROFILE" },
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    },
  );
  const uploaded = response.data.data;
  if (!uploaded?.s3Key) {
    throw new Error("사진 업로드 응답에 파일 정보가 없습니다.");
  }
  return uploaded;
};

export const getFileUrl = async (s3Key: string): Promise<string> => {
  const response = await apiClient.post<ApiResponse<FileUrlResponse>>(
    "/api/v1/file",
    null,
    { params: { s3Key } },
  );
  const url = response.data.data?.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("사진 조회 URL을 받지 못했습니다.");
  }
  return url;
};
