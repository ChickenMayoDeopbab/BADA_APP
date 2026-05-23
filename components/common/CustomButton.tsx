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
  xl: { height: "min-h-[51px]", text: "text-lg", padding: "p-[14px]" },
  lg: { height: "min-h-[41px]", text: "text-base", padding: "p-[10px]" },
  md: { height: "min-h-[38px]", text: "text-sm", padding: "p-[10px]" },
  sm: { height: "min-h-[28px]", text: "text-xs", padding: "p-[6px]" },
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
  const { height, text, padding } = variantStyle[variant];
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
