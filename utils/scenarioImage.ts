import { ImageSourcePropType } from "react-native";

// 카테고리별 썸네일 (scenario_image가 없을 때 폴백)
const CATEGORY_THUMBNAIL_MAP: Record<string, ImageSourcePropType> = {
  restaurant: require("@/assets/Q1_s.png"),
  hospital: require("@/assets/Q2_s.png"),
  complaint: require("@/assets/Q3_s.png"),
  delivery: require("@/assets/Q4_s.png"),
  bank: require("@/assets/Q5_s.png"),
  custom: require("@/assets/Q6_s.png"),
};

// 카테고리별 대형 이미지 (추천 카드처럼 넓게 쓰는 자리의 폴백)
const CATEGORY_COVER_MAP: Record<string, ImageSourcePropType> = {
  restaurant: require("@/assets/Q1_l.png"),
  hospital: require("@/assets/Q2_l.png"),
  complaint: require("@/assets/Q3_l.png"),
  delivery: require("@/assets/Q3_l.png"),
  bank: require("@/assets/Q2_l.png"),
  custom: require("@/assets/Q1_l.png"),
};

const FALLBACK_THUMBNAIL: ImageSourcePropType = require("@/assets/Q1_s.png");
const FALLBACK_COVER: ImageSourcePropType = require("@/assets/Q1_l.png");

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
