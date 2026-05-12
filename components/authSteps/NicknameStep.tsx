import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type StepProps = {
  onNext: () => void;
  onPrev?: () => void;
};

export default function NicknameStep({ onPrev, onNext }: StepProps) {
  const [userId, setUserId] = useState("");
  return (
    <View>
      <View className="mb-[102px]">
        <CustomInput value={userId} onChangeText={setUserId} label="닉네임" />
      </View>

      <View className="h-6 mb-6" />

      <View className="gap-y-3">
        <CustomButton
          label="회원가입"
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
