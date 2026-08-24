const {
  BORDER_RADIUS,
  FONT_FAMILY,
  PALETTE,
  SEMANTIC_COLORS,
  TYPOGRAPHY,
} = require("./design-system");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...PALETTE,
        ...SEMANTIC_COLORS,
      },
      fontFamily: {
        sans: [FONT_FAMILY],
        pretendard: [FONT_FAMILY],
      },
      fontSize: TYPOGRAPHY,
      borderRadius: BORDER_RADIUS,
    },
  },
  plugins: [],
};
