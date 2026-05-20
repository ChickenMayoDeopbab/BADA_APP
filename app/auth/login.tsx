import BadaLogo from "@/assets/badaLogo2.svg";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);

  const [userId, setUserId] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="justify-between flex-1 px-8 pt-20">
        <View className="flex-1">
          <BadaLogo width={70} />
          <Text className=" text-3xl font-bold text-[#0D0D0E]">
            아이디로 로그인
          </Text>
        </View>

        <View className="flex-1 mb-44">
          <View className="mb-5">
            <CustomInput
              value={userId}
              onChangeText={setUserId}
              label="아이디"
            />
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
          </View>

          <TouchableOpacity
            className="flex-row items-center mb-6 gap-x-2"
            onPress={() => setIsChecked(!isChecked)}
          >
            <View>
              <Ionicons
                name={isChecked ? "checkmark-circle" : "checkmark-circle-outline"}
                size={24}
                style={{ width: 24, height: 24 }}
                color={isChecked ? "#0AE365" : "#BDBEBE"}
              />
            </View>
            <Text
              className={`text-base ${isChecked ? "text-[#0D0D0E]" : "text-[#BDBEBE]"}`}
            >
              로그인 상태 유지
            </Text>
          </TouchableOpacity>

          <View className="gap-y-3">
            <CustomButton
              label="로그인"
              color="#F6F6F6"
              backgroundColor="#0AE365"
              onPress={() => router.replace("/home")}
            />
            <CustomButton
              label="회원가입"
              color="#0D0D0E"
              backgroundColor="#F8F8F8"
              onPress={() => router.replace("/auth/signup")}
            />
          </View>

          <View className="flex-row mt-3 gap-x-4">
            <TouchableOpacity>
              <Text className="text-sm text-[#5C5E5E]">아이디 찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text className="text-sm text-[#5C5E5E]">비밀번호 찾기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}