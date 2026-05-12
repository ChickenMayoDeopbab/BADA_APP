import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type StepProps = {
  onNext: () => void;
  onPrev?: () => void;
};

export default function PasswordStep({onPrev, onNext}: StepProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  return (
    <View>
      <View className="mb-5">
        <CustomInput
          value={userId}
          onChangeText={setUserId}
          label="비밀번호"
        />

        <CustomInput
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호를 다시 입력하세요."
          label="비밀번호 확인"
        />
      </View>

      <View className="h-6 mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="다음으로"
          color="#F6F6F6"
          backgroundColor="#0AE365"
          onPress={onNext}
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
