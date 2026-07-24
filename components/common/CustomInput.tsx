import { forwardRef, ReactNode, useState } from "react";
import {
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
} from "react-native";

interface InputFieldProps extends TextInputProps {
  label?: string;
  variant?: "filled" | "standard" | "outlined";
  error?: string;
  success?: string;
  rightIcon?: ReactNode;
}

const variantStyles = {
  filled: "bg-[#F2F4F6] rounded-lg",
  standard: "",
  outlined: "border border-[#BDBEBE] rounded-lg",
};

function getJosa(word: string): string {
  if (!word) return "을/를";
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "를";
  return (code - 0xac00) % 28 > 0 ? "을" : "를";
}

const CustomInput = forwardRef<TextInput, InputFieldProps>(
  (
    {
      label,
      variant = "standard",
      error = "",
      success = "",
      rightIcon,
      onFocus,
      onBlur,
      value,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const { width } = useWindowDimensions();
    const scale = Math.min(
      Math.max(width / 393, 0.94),
      width >= 600 ? 1.06 : 1,
    );
    const [isFocused, setIsFocused] = useState(false);

    const hasValue = Boolean(value);
    const isError = Boolean(error);
    const isSuccess = Boolean(success);

    const accentColor = isError
      ? "#FF0000"
      : isSuccess
        ? "#0BF46D"
        : isFocused
          ? "#0D0D0E"
          : "#BDBEBE";

    const messageColor = isError ? "#FF0000" : "#0BF46D";
    const message = error || success || "";

    return (
      <View className="w-full" style={{ marginBottom: 8 * scale }}>
        <Text
          style={{
            height: 16 * scale,
            marginBottom: 2 * scale,
            fontSize: 12 * scale,
            color: accentColor,
            opacity: isFocused || hasValue ? 1 : 0,
          }}
        >
          {label ?? " "}
        </Text>
        <View
          className={`flex-row items-center border-b ${variantStyles[variant]}`}
          style={{ minHeight: 44 * scale, borderColor: accentColor }}
        >
          <TextInput
            ref={ref}
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
          style={{
            height: 16 * scale,
            marginTop: 4 * scale,
            fontSize: 12 * scale,
            color: messageColor,
            opacity: isError || isSuccess ? 1 : 0,
          }}
        >
          {message || " "}
        </Text>
      </View>
    );
  },
);

CustomInput.displayName = "CustomInput";

export default CustomInput;
