import { getFileUrl } from "@/api/fileApi";

const PROFILE_IMAGE_URL_CACHE_TTL_MS = 5 * 60 * 1000;
const PROFILE_IMAGE_URL_CACHE_MAX_SIZE = 100;

interface CachedProfileImageUrl {
  uri: string;
  expiresAt: number;
}

const resolvedUrlCache = new Map<string, CachedProfileImageUrl>();
const pendingUrlRequests = new Map<string, Promise<string>>();

function cacheResolvedUrl(s3Key: string, uri: string): void {
  if (resolvedUrlCache.size >= PROFILE_IMAGE_URL_CACHE_MAX_SIZE) {
    const oldestKey = resolvedUrlCache.keys().next().value;
    if (oldestKey) resolvedUrlCache.delete(oldestKey);
  }

  resolvedUrlCache.set(s3Key, {
    uri,
    expiresAt: Date.now() + PROFILE_IMAGE_URL_CACHE_TTL_MS,
  });
}

export function invalidateProfileImageUrl(s3Key: string): void {
  resolvedUrlCache.delete(s3Key.trim());
}

export async function resolveProfileImage(s3Key: string): Promise<string> {
  const normalizedKey = s3Key.trim();
  if (/^https?:\/\//i.test(normalizedKey)) return normalizedKey;

  const cached = resolvedUrlCache.get(normalizedKey);
  if (cached && cached.expiresAt > Date.now()) {
    // 최근 사용 항목을 뒤로 보내 간단한 LRU 순서를 유지합니다.
    resolvedUrlCache.delete(normalizedKey);
    resolvedUrlCache.set(normalizedKey, cached);
    return cached.uri;
  }
  if (cached) resolvedUrlCache.delete(normalizedKey);

  const pending = pendingUrlRequests.get(normalizedKey);
  if (pending) return pending;

  const request = getFileUrl(normalizedKey)
    .then((uri) => {
      cacheResolvedUrl(normalizedKey, uri);
      return uri;
    })
    .finally(() => {
      pendingUrlRequests.delete(normalizedKey);
    });

  pendingUrlRequests.set(normalizedKey, request);
  return request;
}
