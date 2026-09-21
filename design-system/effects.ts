import { Platform, type ViewStyle } from "react-native";

/** Use the same shadow geometry on iOS, Android 9+ and web. */
function cardShadow(boxShadow: string, fallbackElevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: { boxShadow },
    android: Number(Platform.Version) >= 28
      ? { boxShadow }
      : { elevation: fallbackElevation },
    web: { boxShadow },
  }) ?? {};
}

/** Home and featured training cards: 0px 2px 5.3px rgba(0, 0, 0, 0.12). */
export const ELEVATED_CARD_SHADOW = cardShadow(
  "0px 2px 5.3px 0px rgba(0,0,0,0.12)",
  3,
);

/** List, community and profile surfaces: 0px 0px 3.4px rgba(0, 0, 0, 0.08). */
export const SURFACE_CARD_SHADOW = cardShadow(
  "0px 0px 3.4px 0px rgba(0,0,0,0.08)",
  2,
);

/** Record detail and report cards: 0px 2px 5.3px rgba(0, 0, 0, 0.04). */
export const SUBTLE_CARD_SHADOW = cardShadow(
  "0px 2px 5.3px 0px rgba(0,0,0,0.04)",
  1,
);
