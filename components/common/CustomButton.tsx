import { SEMANTIC_COLORS } from "@/design-system/colors";
import { ReactNode } from "react";
import { Pressable, PressableProps, Text, View } from "react-native";

interface CustomButtonProps extends PressableProps {
  label: string;
  backgroundColor?: string;
  variant?: "xl" | "lg" | "md" | "sm";
  icon?: ReactNode;
  color?: string;
  tone?: "primary" | "neutral" | "danger";
}

const variantStyle = {
  xl: {
    height: "min-h-[51px]",
    text: "text-headline2",
    padding: "p-[14px]",
    radius: "rounded-component",
  },
  lg: {
    height: "min-h-[41px]",
    text: "text-body",
    padding: "p-[10px]",
    radius: "rounded-component",
  },
  md: {
    height: "min-h-[38px]",
    text: "text-label",
    padding: "p-[10px]",
    radius: "rounded-[8px]",
  },
  sm: {
    height: "min-h-[28px]",
    text: "text-caption",
    padding: "p-[6px]",
    radius: "rounded-[8px]",
  },
};

export default function CustomButton({
  label,
  icon,
  variant = "xl",
  color,
  backgroundColor,
  disabled,
  tone,
  className,
  ...props
}: CustomButtonProps) {
  const { height, text, padding, radius } = variantStyle[variant];
  const usesCustomColors = Boolean(backgroundColor || color);
  const resolvedTone = tone ?? (usesCustomColors ? undefined : "neutral");
  const toneClassName = disabled
    ? "bg-fill-alternative"
    : resolvedTone === "primary"
      ? "bg-primary-normal"
      : resolvedTone === "danger"
        ? "bg-status-error"
        : resolvedTone === "neutral"
          ? "bg-fill-normal"
          : "";
  const textClassName = disabled
    ? "text-line-normal"
    : resolvedTone === "neutral"
      ? "text-label-normal"
      : resolvedTone
        ? "text-label-buttonText"
        : "";
  const pressedClassName =
    resolvedTone === "neutral"
      ? "active:bg-fill-pressed"
      : "active:opacity-80";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={`w-full items-center justify-center ${radius} ${height} ${padding} ${toneClassName} ${pressedClassName} ${className ?? ""}`}
      style={
        backgroundColor && !disabled ? { backgroundColor } : undefined
      }
      disabled={disabled}
      {...props}
    >
      <View className="flex-row items-center justify-center gap-x-2">
        {icon}
        <Text
          className={`font-pretendard font-bold ${text} ${textClassName}`}
          style={
            !resolvedTone && !disabled
              ? { color: color ?? SEMANTIC_COLORS.label.buttonText }
              : undefined
          }
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
