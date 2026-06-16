import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { RegisterFormValues } from "@/types/auth";
import { Controller, useFormContext } from "react-hook-form";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

type UsernameProps = {
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function UsernameStep({
  inputTranslateY,
  onPrev,
  onNext,
}: UsernameProps) {
  const { width } = useWindowDimensions();
  const codeButtonWidth = Math.min(Math.max(width * 0.27, 96), 112);
  const {
    control,
    trigger,
    formState: { errors },
  } = useFormContext<RegisterFormValues>();

  const handleNext = async () => {
    const isValid = await trigger(["username", "userId"]);
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
          name="username"
          rules={{
            required: "이름을 입력해주세요.",
            minLength: { value: 2, message: "이름은 2자 이상이어야 합니다." },
          }}
          render={({ field: { value, onChange } }) => (
            <CustomInput
              value={value}
              onChangeText={onChange}
              label="이름"
              returnKeyType="next"
              onSubmitEditing={handleNext}
              error={errors.userId?.message}
            />
          )}
        />
        <View className="flex-row items-start gap-x-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="userId"
              rules={{
                required: "아이디를 입력해주세요.",
                minLength: {
                  value: 2,
                  message: "아이디를 2자 이상이어야 합니다.",
                },
              }}
              render={({ field: { value, onChange } }) => (
                <CustomInput
                  value={value}
                  onChangeText={onChange}
                  label="아이디"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                  error={errors.username?.message}
                />
              )}
            />
          </View>
          <View style={{ marginTop: 18, width: codeButtonWidth }}>
            <CustomButton
              label="중복 확인"
              variant="lg"
              backgroundColor="#0AE365"
              onPress={() => {}}
            />
          </View>
        </View>
      </Animated.View>

      <View style={{ height: 24 }} className="mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="회원가입"
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
