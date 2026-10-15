import type { ImageSource } from "expo-image";

// 카테고리별 썸네일 (scenario_image가 없을 때 폴백)
const CATEGORY_THUMBNAIL_MAP: Record<string, number> = {
  work: require("@/assets/Q1_s.jpg"),
  daily: require("@/assets/Q2_s.jpg"),
  school: require("@/assets/Q3_s.jpg"),
  other: require("@/assets/Q4_s.jpg"),
  restaurant: require("@/assets/Q1_s.jpg"),
  hospital: require("@/assets/Q2_s.jpg"),
  complaint: require("@/assets/Q3_s.jpg"),
  delivery: require("@/assets/Q4_s.jpg"),
  bank: require("@/assets/Q5_s.jpg"),
  custom: require("@/assets/Q6_s.jpg"),
};

// 카테고리별 대형 이미지 (추천 카드처럼 넓게 쓰는 자리의 폴백)
const CATEGORY_COVER_MAP: Record<string, number> = {
  work: require("@/assets/Q1_l.jpg"),
  daily: require("@/assets/Q2_l.jpg"),
  school: require("@/assets/Q3_l.jpg"),
  other: require("@/assets/Q3_l.jpg"),
  restaurant: require("@/assets/Q1_l.jpg"),
  hospital: require("@/assets/Q2_l.jpg"),
  complaint: require("@/assets/Q3_l.jpg"),
  delivery: require("@/assets/Q3_l.jpg"),
  bank: require("@/assets/Q2_l.jpg"),
  custom: require("@/assets/Q1_l.jpg"),
};

const FALLBACK_THUMBNAIL: number = require("@/assets/Q1_s.jpg");
const FALLBACK_COVER: number = require("@/assets/Q1_l.jpg");

/**
 * 원격 이미지 URL의 캐시 키를 만든다.
 * 시나리오 이미지는 S3 presigned URL이라 API를 호출할 때마다 서명 쿼리가 바뀐다.
 * 쿼리를 뺀 객체 경로를 키로 써야 같은 이미지를 다시 내려받지 않는다.
 */
export const getImageCacheKey = (url: string): string => url.split("?")[0];

/** 원격 URL을 고정 캐시 키가 붙은 expo-image 소스로 변환 */
const toRemoteSource = (url: string): ImageSource => ({
  uri: url,
  cacheKey: getImageCacheKey(url),
});

/** 시나리오 썸네일(카드용) 이미지 소스를 반환 (expo-image 전용) */
export const getScenarioThumbnail = (
  scenarioImage?: string | null,
  category?: string | null,
): ImageSource | number =>
  scenarioImage
    ? toRemoteSource(scenarioImage)
    : (CATEGORY_THUMBNAIL_MAP[category ?? ""] ?? FALLBACK_THUMBNAIL);

/** 시나리오 대형(추천 카드용) 이미지 소스를 반환 (expo-image 전용) */
export const getScenarioCover = (
  scenarioImage?: string | null,
  category?: string | null,
): ImageSource | number =>
  scenarioImage
    ? toRemoteSource(scenarioImage)
    : (CATEGORY_COVER_MAP[category ?? ""] ?? FALLBACK_COVER);
