import { postLogin } from "@/api/authApi";
import BadaLogo from "@/assets/badaLogo2.svg";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const topPadding = Math.min(Math.max(height * 0.08, 56), 80);
  const formBottomMargin = Math.min(Math.max(height * 0.17, 96), 176);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = async () => {
    try {
      const response = await postLogin({ username, password });

      if (response.status === 200) {
        await AsyncStorage.setItem("accessToken", response.data.accessToken);
        await AsyncStorage.setItem("refreshToken", response.data.refreshToken);
        await AsyncStorage.setItem('autoLogin', isChecked ? 'true' : 'false');
        router.push("/home");
      } else {
        console.log(response.error?.message);
      }
    } catch (error: any) {
      console.log("에러 내용:", error.response?.data);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View
        className="justify-between flex-1 px-8"
        style={{
          paddingTop: topPadding,
          width: "100%",
          maxWidth: isTablet ? 430 : undefined,
          alignSelf: "center",
          minHeight: height,
        }}
      >
        <View className="flex-1">
          <BadaLogo width={70} height={32} />
          <Text className=" text-3xl font-bold text-[#0D0D0E]">
            아이디로 로그인
          </Text>
        </View>

        <View className="flex-1" style={{ marginBottom: formBottomMargin }}>
          <View className="mb-5">
            <CustomInput
              value={username}
              onChangeText={setUsername}
              label="아이디"
              textContentType="oneTimeCode"
            />
            <CustomInput
              value={password}
              onChangeText={setPassword}
              label="비밀번호"
              secureTextEntry={!isPasswordVisible}
              textContentType="oneTimeCode" 
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
                name={
                  isChecked ? "checkmark-circle" : "checkmark-circle-outline"
                }
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
              onPress={handleLogin}
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
