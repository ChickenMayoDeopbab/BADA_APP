import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

type StepProps = {
  onNext: () => void;
  onPrev?: () => void;
};

export default function PasswordStep({ onPrev, onNext }: StepProps) {
  const { width } = useWindowDimensions();
  const inputScale = Math.min(Math.max(width / 393, 0.94), width >= 600 ? 1.06 : 1);
  const fieldAreaHeight = 82 * inputScale * 2 + 20 + 24 + 24;
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  return (
    <View>
      <View style={{ minHeight: fieldAreaHeight }}>
        <CustomInput
          value={password}
          onChangeText={setPassword}
          label="비밀번호"
          secureTextEntry={!isPasswordVisible}
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

        <CustomInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="비밀번호를 다시 입력하세요."
          label="비밀번호 확인"
          secureTextEntry={!isConfirmPasswordVisible}
          rightIcon={
            <TouchableOpacity
              onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off-sharp" : "eye"}
                size={20}
                color="#BDBEBE"
              />
            </TouchableOpacity>
          }
        />
      </View>

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
