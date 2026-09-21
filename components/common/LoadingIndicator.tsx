import { SEMANTIC_COLORS } from "@/design-system/colors";
import { ActivityIndicator, ActivityIndicatorProps } from "react-native";

type LoadingIndicatorProps = ActivityIndicatorProps & {
  tone?: "primary" | "inverse";
};

export default function LoadingIndicator({
  size = "large",
  tone = "primary",
  color,
  accessibilityLabel = "로딩 중",
  ...props
}: LoadingIndicatorProps) {
  return (
    <ActivityIndicator
      size={size}
      color={
        color ??
        (tone === "inverse" ? "#FFFFFF" : SEMANTIC_COLORS.primary.normal)
      }
      accessibilityLabel={accessibilityLabel}
      {...props}
    />
  );
}
