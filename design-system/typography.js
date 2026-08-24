/** Pretendard is the single typeface used throughout Bada. */
const FONT_FAMILY = "Pretendard";

const FONT_WEIGHT = {
  regular: "400",
  medium: "500",
  bold: "700",
};

/**
 * Tailwind-compatible font-size definitions.
 * Every hierarchy uses 130% line height and -2% letter spacing.
 */
const TYPOGRAPHY = {
  display1: ["36px", { lineHeight: "46.8px", letterSpacing: "-0.72px" }],
  display2: ["32px", { lineHeight: "41.6px", letterSpacing: "-0.64px" }],
  title1: ["28px", { lineHeight: "36.4px", letterSpacing: "-0.56px" }],
  title2: ["24px", { lineHeight: "31.2px", letterSpacing: "-0.48px" }],
  headline1: ["20px", { lineHeight: "26px", letterSpacing: "-0.4px" }],
  headline2: ["18px", { lineHeight: "23.4px", letterSpacing: "-0.36px" }],
  body: ["16px", { lineHeight: "20.8px", letterSpacing: "-0.32px" }],
  label: ["14px", { lineHeight: "18.2px", letterSpacing: "-0.28px" }],
  caption: ["12px", { lineHeight: "15.6px", letterSpacing: "-0.24px" }],
};

module.exports = {
  FONT_FAMILY,
  FONT_WEIGHT,
  TYPOGRAPHY,
};
