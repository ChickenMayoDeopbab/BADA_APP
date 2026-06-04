import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PasswordProps = {
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function PasswordStep({
  password,
  setPassword,
  inputTranslateY,
  onPrev,
  onNext,
}: PasswordProps) {
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState<boolean>(false);

  const confirmRef = useRef<TextInput>(null);

  return (
    <View>
      <Animated.View
      className="mb-5"
        style={{ transform: [{ translateY: inputTranslateY }] }}
      >
        <CustomInput
          value={password}
          onChangeText={setPassword}
          label="비밀번호"
          secureTextEntry={!isPasswordVisible}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          rightIcon={
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              <Ionicons name={isPasswordVisible ? "eye-off-sharp" : "eye"} size={20} color="#BDBEBE" />
            </TouchableOpacity>
          }
        />
        <CustomInput
          ref={confirmRef}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="비밀번호를 다시 입력하세요."
          label="비밀번호 확인"
          secureTextEntry={!isConfirmPasswordVisible}
          returnKeyType="done"
          onSubmitEditing={onNext}
          rightIcon={
            <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
              <Ionicons name={isConfirmPasswordVisible ? "eye-off-sharp" : "eye"} size={20} color="#BDBEBE" />
            </TouchableOpacity>
          }
        />
      </Animated.View>
      
      <View style={{ height: 24 }} className="mb-6" />

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