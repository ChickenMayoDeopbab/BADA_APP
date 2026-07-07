import { postLogin } from "@/api/authApi";
import BadaLogo from "@/assets/badaLogo2.svg";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Animated,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  isDiagnosisRequired,
  setAuthenticatedUsername,
} from "@/utils/diagnosisFlow";

type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginScreen() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const topPadding = Math.min(Math.max(height * 0.08, 56), 80);
  const inputTop = Math.min(Math.max(height * 0.4, 260), 380);
  const headerHeight = 74;
  const formTopMargin = Math.max(inputTop - topPadding - headerHeight, 40);

  const { control, trigger, getValues, formState: { errors } } = useForm<LoginFormValues>({
    defaultValues: { username: "", password: "" },
  });

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const inputTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(inputTranslateY, {
        toValue: -80,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(inputTranslateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [inputTranslateY]);

  const handleLogin = async () => {
    const isValid = await trigger(["username", "password"]);
    if (!isValid) return;
    try {
      const { username, password } = getValues();
      const response = await postLogin({ username, password });
      await AsyncStorage.setItem("accessToken", response.data.accessToken);
      await AsyncStorage.setItem("refreshToken", response.data.refreshToken);
      await AsyncStorage.setItem("autoLogin", isChecked ? "true" : "false");
      await setAuthenticatedUsername(username);

      const needsDiagnosis = await isDiagnosisRequired(username);
      router.replace(needsDiagnosis ? "/diagnosis/welcome" : "/home");
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
        <View
          className="flex-1 px-8"
          style={{
            paddingTop: topPadding,
            width: "100%",
            maxWidth: isTablet ? 430 : undefined,
            alignSelf: "center",
            minHeight: height,
          }}
        >
          <View>
            <BadaLogo width={70} height={32} />
            <Text className="text-3xl font-bold text-[#0D0D0E]">
              아이디로 로그인
            </Text>
          </View>

          <View style={{ marginTop: formTopMargin }}>
            <Animated.View
              className="mb-5"
              style={{ transform: [{ translateY: inputTranslateY }] }}
            >
              <Controller
                control={control}
                name="username"
                rules={{ required: "아이디를 입력해주세요." }}
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <CustomInput
                    value={value}
                    onChangeText={onChange}
                    label="아이디"
                    textContentType="oneTimeCode"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    error={error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                rules={{ required: "비밀번호를 입력해주세요." }}
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <CustomInput
                    ref={passwordRef}
                    value={value}
                    onChangeText={onChange}
                    label="비밀번호"
                    secureTextEntry={!isPasswordVisible}
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    error={error?.message}
                    rightIcon={
                      <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
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
            </Animated.View>

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
              <Text className={`text-base ${isChecked ? "text-[#0D0D0E]" : "text-[#BDBEBE]"}`}>
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
