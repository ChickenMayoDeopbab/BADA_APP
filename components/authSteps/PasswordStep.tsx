import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { RegisterFormValues } from "@/constants/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PasswordProps = {
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function PasswordStep({
  inputTranslateY,
  onPrev,
  onNext,
}: PasswordProps) {
  const {
    control,
    getValues,
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
      <Animated.View
        className="mb-5"
        style={{ transform: [{ translateY: inputTranslateY }] }}
      >
        <Controller
          control={control}
          name="password"
          rules={{
            required: "비밀번호를 입력해주세요.",
            minLength: {
              value: 8,
              message: "비밀번호는 8자 이상이어야 합니다.",
            },
            pattern: {
              value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
              message: "영문, 숫자를 포함해야 합니다.",
            },
          }}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              value={value}
              onChangeText={onChange}
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
                    color="#BDBEBE"
                  />
                </TouchableOpacity>
              }
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: "비밀번호 확인을 입력해주세요.",
            validate: (value) =>
              value === getValues("password") ||
              "비밀번호가 일치하지 않습니다.",
          }}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              ref={confirmRef}
              value={value}
              onChangeText={onChange}
              placeholder="비밀번호를 다시 입력하세요."
              label="비밀번호 확인"
              secureTextEntry={!isConfirmPasswordVisible}
              returnKeyType="done"
              onSubmitEditing={onNext}
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
                    color="#BDBEBE"
                  />
                </TouchableOpacity>
              }
            />
          )}
        />
      </Animated.View>

      <View style={{ height: 24 }} className="mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="다음으로"
          color="#F6F6F6"
          backgroundColor="#0AE365"
          onPress={handleNext}
        />
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity onPress={onPrev}>
          <Text className="text-sm text-[#5C5E5E]">이전으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
