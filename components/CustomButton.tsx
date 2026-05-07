import { ReactNode } from "react";
import { Pressable, PressableProps, Text, View } from "react-native";

interface CustomButtonProps extends PressableProps {
  label: string;
  backgroundColor?: string;
  icon?: ReactNode;
  color: string;
}

export default function CustomButton({
  label,
  icon,
  color,
  backgroundColor,
  ...props
}: CustomButtonProps) {
  return (
    <Pressable
      className={`rounded-lg justify-center items-center active:opacity-80 w-full h-[51px] ${color}`}
      style={backgroundColor ? { backgroundColor } : undefined}
      {...props}
    >
      <View className="flex-row items-center gap-x-2">
        {icon}
        <Text className="text-lg font-bold" style={{ color }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
