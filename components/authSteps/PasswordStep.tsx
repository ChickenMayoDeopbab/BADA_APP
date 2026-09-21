import { SEMANTIC_COLORS } from "@/design-system";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import {
  createConfirmPasswordRules,
  passwordRules,
} from "@/constants/authValidation";
import { RegisterFormValues } from "@/types/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PasswordProps = {
  onPrev: () => void;
  onNext: () => void;
};

export default function PasswordStep({
  onPrev,
  onNext,
}: PasswordProps) {
  const {
    control,
    getValues,
    clearErrors,
    trigger,
    formState: { errors },
  } = useFormContext<RegisterFormValues>();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const confirmRef = useRef<TextInput>(null);

  const handleNext = async () => {
    const isValid = await trigger(["password", "confirmPassword"]);
    if (isValid) onNext();
  };

  return (
    <View>
      <View className="mb-5">
        <Controller
          control={control}
          name="password"
          rules={passwordRules}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              value={value}
              onChangeText={(text) => {
                onChange(text);
                clearErrors("password");
              }}
              label="비밀번호"
              secureTextEntry={!isPasswordVisible}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={errors.password?.message}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  <Ionicons
                    name={isPasswordVisible ? "eye-off-sharp" : "eye"}
                    size={20}
                    color={SEMANTIC_COLORS.line.normal}
                  />
                </TouchableOpacity>
              }
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          rules={createConfirmPasswordRules(() => getValues("password"))}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              ref={confirmRef}
              value={value}
              onChangeText={(text) => {
                onChange(text);
                clearErrors("confirmPassword");
              }}
              placeholder="비밀번호를 다시 입력하세요."
              label="비밀번호 확인"
              secureTextEntry={!isConfirmPasswordVisible}
              returnKeyType="done"
              onSubmitEditing={handleNext}
              error={errors.confirmPassword?.message}
              rightIcon={
                <TouchableOpacity
                  onPress={() =>
                    setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                  }
                >
                  <Ionicons
                    name={isConfirmPasswordVisible ? "eye-off-sharp" : "eye"}
                    size={20}
                    color={SEMANTIC_COLORS.line.normal}
                  />
                </TouchableOpacity>
              }
            />
          )}
        />
      </View>

      <View style={{ height: 24 }} className="mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="다음으로"
          tone="primary"
          onPress={handleNext}
        />
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity onPress={onPrev}>
          <Text className="text-label text-label-alternative">이전으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
