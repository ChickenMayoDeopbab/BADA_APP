import { ReactNode, useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

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
        className={`h-4 text-xs mb-0.5 transition duration-100 ${labelColor} ${isFocused || hasValue ? "opacity-100" : "opacity-0"}`}
      >
        {label ?? " "}
      </Text>

      <View
        className={`
          h-[44px] flex-row items-center border-b
          ${variantClass[variant]}
          ${borderColor}
        `}
      >
        <TextInput
          className="flex-1 p-0 text-base text-[#0D0D0E] outline-none"
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
        className={`h-4 mt-1 text-xs text-[#FF0000] ${isError ? "opacity-100" : "opacity-0"}`}
      >
        {error ?? " "}
      </Text>
    </View>
  );
}
