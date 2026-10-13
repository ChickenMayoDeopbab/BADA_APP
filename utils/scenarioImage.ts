import { ImageSourcePropType } from "react-native";

// 카테고리별 썸네일 (scenario_image가 없을 때 폴백)
const CATEGORY_THUMBNAIL_MAP: Record<string, ImageSourcePropType> = {
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
const CATEGORY_COVER_MAP: Record<string, ImageSourcePropType> = {
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

const FALLBACK_THUMBNAIL: ImageSourcePropType = require("@/assets/Q1_s.jpg");
const FALLBACK_COVER: ImageSourcePropType = require("@/assets/Q1_l.jpg");

/** 시나리오 썸네일(카드용) 이미지 소스를 반환 */
export const getScenarioThumbnail = (
  scenarioImage?: string | null,
  category?: string | null,
): ImageSourcePropType =>
  scenarioImage
    ? { uri: scenarioImage }
    : (CATEGORY_THUMBNAIL_MAP[category ?? ""] ?? FALLBACK_THUMBNAIL);

/** 시나리오 대형(추천 카드용) 이미지 소스를 반환 */
export const getScenarioCover = (
  scenarioImage?: string | null,
  category?: string | null,
): ImageSourcePropType =>
  scenarioImage
    ? { uri: scenarioImage }
    : (CATEGORY_COVER_MAP[category ?? ""] ?? FALLBACK_COVER);
