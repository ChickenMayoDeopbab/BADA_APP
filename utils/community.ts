export const getCommunityAuthorName = (name?: string | null) =>
  name?.trim() || "이름 없는 사용자";

export const formatCommunityTimestamp = (value: string) => {
  const trimmedValue = value.trim();
  const hasTime = /[T ]\d{2}:\d{2}/.test(trimmedValue);
  const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmedValue);
  const normalizedValue =
    hasTime && !hasTimezone ? `${trimmedValue}Z` : trimmedValue;
  const timestamp = new Date(normalizedValue).getTime();
  if (!Number.isFinite(timestamp)) return value;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return "방금 전";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};
