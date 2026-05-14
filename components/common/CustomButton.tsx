import { ReactNode } from "react";
import { Pressable, PressableProps, Text, View } from "react-native";

interface CustomButtonProps extends PressableProps {
  label: string;
  backgroundColor?: string;
  variant?: "xl" | "lg" | "md" | "sm";
  icon?: ReactNode;
  color?: string;
}

const variantStyle = {
  xl: { height: "h-[51px]", text: "text-lg" },
  lg: { height: "h-[41px]", text: "text-base" },
  md: { height: "h-[38px]", text: "text-sm" },
  sm: { height: "h-[28px]", text: "text-xs" },
};

export default function CustomButton({
  label,
  icon,
  variant = "xl",
  color = "#F6F6F6",
  backgroundColor,
  disabled,
  ...props
}: CustomButtonProps) {
  const { height, text } = variantStyle[variant];
  return (
    <Pressable
      className={`rounded-xl justify-center items-center active:opacity-80 w-full ${height} ${disabled ? "opacity-50" : "opacity-100"}`}
      style={backgroundColor ? { backgroundColor } : undefined}
      disabled={disabled}
      {...props}
    >
      <View className="flex-row items-center gap-x-2">
        {icon}
        <Text className={`font-bold ${text}`} style={{ color }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}