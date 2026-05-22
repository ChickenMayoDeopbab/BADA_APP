import { ReactNode, useState } from "react";
import { Text, TextInput, TextInputProps, useWindowDimensions, View } from "react-native";

interface InputFieldProps extends TextInputProps {
  label?: string;
  variant?: "filled" | "standard" | "outlined";
  error?: string;
  rightIcon?: ReactNode;
}

const variantClass = {
  filled: "bg-[#F2F4F6] rounded-lg",
  standard: "",
  outlined: "border border-[#BDBEBE] rounded-lg",
};

function getJosa(word: string): string {
  if (!word) return "을/를";
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return "를";
  return (code - 0xAC00) % 28 > 0 ? "을" : "를";
}

export default function CustomInput({
  label,
  variant = "standard",
  error = "",
  rightIcon,
  onFocus,
  onBlur,
  value,
  placeholder,
  ...props
}: InputFieldProps) {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 393, 0.94), width >= 600 ? 1.06 : 1);
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = Boolean(value);
  const isError = Boolean(error);

  const borderColor = isError
    ? "border-[#FF0000]"
    : isFocused
      ? "border-[#0D0D0E]"
      : "border-[#BDBEBE]";

  const labelColor = isError
    ? "text-[#FF0000]"
    : isFocused
      ? "text-[#0D0D0E]"
      : "text-[#5C5E5E]";

  return (
    <View className="w-full">
      <Text
        className={`transition duration-100 ${labelColor} ${isFocused || hasValue ? "opacity-100" : "opacity-0"}`}
        style={{ height: 16 * scale, marginBottom: 2 * scale, fontSize: 12 * scale }}
      >
        {label ?? " "}
      </Text>

      <View
        className={`
          flex-row items-center border-b
          ${variantClass[variant]}
          ${borderColor}
        `}
        style={{ minHeight: 44 * scale }}
      >
        <TextInput
          className="flex-1 p-0 text-lg font-medium text-[#0D0D0E] outline-none"
          placeholderTextColor="#BDBEBE"
          placeholder={
            isFocused
              ? ""
              : (placeholder ??
                (label ? `${label}${getJosa(label)} 입력하세요.` : ""))
          }
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>

      <Text
        className={`text-[#FF0000] ${isError ? "opacity-100" : "opacity-0"}`}
        style={{ height: 16 * scale, marginTop: 4 * scale, fontSize: 12 * scale }}
      >
        {error ?? " "}
      </Text>
    </View>
  );
}
