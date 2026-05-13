import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type StepProps = {
  onNext: () => void;
  onPrev?: () => void;
};

export default function UsernameStep({ onNext }: StepProps) {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  return (
    <View>
      <View className="mb-5">
        <View className="flex-row items-start gap-x-3">
          <View className="flex-1">
            <CustomInput
              value={email}
              onChangeText={setEmail}
              label="이메일"
              autoCapitalize="none"
            />
          </View>

          <View className="mt-[18px] w-[105px]">
            <CustomButton
              label="인증코드 전송"
              variant="lg"
              backgroundColor="#0AE365"
            />
          </View>
        </View>

        <CustomInput
          value={verificationCode}
          onChangeText={setVerificationCode}
          placeholder="인증코드를 입력하세요."
          label="인증코드"
        />
      </View>

      <View className="h-6 mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="인증하기"
          color="#F6F6F6"
          backgroundColor="#0AE365"
          onPress={onNext}
        />
      </View>

      <View className="flex-row mt-3 gap-x-4">
        <TouchableOpacity
          onPress={() => {
            router.replace("/auth");
          }}
        >
          <Text className="text-sm text-[#5C5E5E]">이미 계정이 있어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
