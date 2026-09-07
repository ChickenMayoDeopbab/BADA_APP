/**
 * Bada color foundations.
 *
 * Product UI should prefer SEMANTIC_COLORS. PALETTE is exposed for defining
 * semantic roles and for cases where the design explicitly calls for a
 * primitive color.
 */

const PALETTE = {
  common: {
    0: "#FFFFFF",
    100: "#000000",
  },
  neutral: {
    99: "#FCFCFD",
    97: "#F7F7F8",
    95: "#F2F2F3",
    90: "#E5E5E6",
    80: "#CACACE",
    70: "#B0B0B5",
    60: "#95959D",
    50: "#7B7B84",
    40: "#62626A",
    30: "#4A4A4F",
    20: "#313135",
    10: "#19191A",
    7: "#111113",
    5: "#0D0D0E",
  },
  red: {
    90: "#FFCCCC",
    80: "#FF9999",
    70: "#FF6666",
    60: "#FF3333",
    50: "#FF0000",
    40: "#CC0000",
    30: "#990000",
    20: "#660000",
    10: "#330000",
  },
  green: {
    90: "#CEFDE2",
    80: "#9DFBC5",
    70: "#6DF8A7",
    60: "#3CF68A",
    50: "#0BF46D",
    40: "#09C357",
    30: "#079241",
    20: "#04622C",
    10: "#023116",
  },
  blue: {
    90: "#CCE8FF",
    80: "#99D1FF",
    70: "#66BAFF",
    60: "#33A2FF",
    50: "#008BFF",
    40: "#006FCC",
    30: "#005499",
    20: "#003866",
    10: "#001C33",
  },
  yellow: {
    90: "#FFF5CC",
    80: "#FFEB99",
    70: "#FFE066",
    60: "#FFD633",
    50: "#FFCC00",
    40: "#CCA300",
    30: "#997A00",
    20: "#665200",
    10: "#332900",
  },
};

const SEMANTIC_COLORS = {
  primary: {
    normal: "#0AE365",
    alternative: "#0AE36533",
  },
  secondary: {
    normal: "#1E2546",
    alternative: "#787C90",
    assistive: "#BBBEC7",
  },
  label: {
    normal: "#0D0D0E",
    strong: "#000000",
    neutral: "#3B3D3E",
    alternative: "#5C5E5E",
    disabled: "#E2E2E3",
    buttonText: "#F6F6F6",
  },
  line: {
    normal: "#BDBEBE",
    neutral: "#DADADB",
    alternative: "#EAEAEA",
  },
  fill: {
    normal: "#F8F8F8",
    neutral: "#EBEBEC",
    alternative: "#E1E2E3",
    pressed: "#F2F2F2",
  },
  background: {
    normal: "#FEFEFE",
    alternative: "#F5F5F5",
  },
  status: {
    error: "#FF0000",
    info: "#008BFF",
    success: "#0BF46D",
    warning: "#FFCC00",
  },
};

const DARK_SEMANTIC_COLORS = {
  primary: {
    normal: "#0AE365",
    alternative: "#0AE36533",
  },
  secondary: {
    normal: "#1E2546",
    alternative: "#22273A",
    assistive: "#262832",
  },
  label: {
    normal: "#F2F2F3",
    strong: "#FFFFFF",
    neutral: "#C0C2C3",
    alternative: "#A0A1A2",
    disabled: "#1C1C1C",
    buttonText: "#F6F6F6",
  },
  line: {
    normal: "#5D5D5D",
    neutral: "#474747",
    alternative: "#1E1E21",
  },
  fill: {
    normal: "#0E0D0D",
    neutral: "#141415",
    alternative: "#1B1C1D",
    pressed: "#303031",
  },
  background: {
    normal: "#222223",
    alternative: "#2D2D2D",
  },
  status: SEMANTIC_COLORS.status,
};

module.exports = {
  PALETTE,
  SEMANTIC_COLORS,
  DARK_SEMANTIC_COLORS,
};
