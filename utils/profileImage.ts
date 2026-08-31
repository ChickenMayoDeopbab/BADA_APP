import { getFileUrl } from "@/api/fileApi";

export async function resolveProfileImage(s3Key: string): Promise<string> {
  if (/^https?:\/\//i.test(s3Key)) return s3Key;
  return getFileUrl(s3Key);
}
