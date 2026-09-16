import { SEMANTIC_COLORS } from "@/design-system";
import { postLogin } from "@/api/authApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/api/error";
import BadaLogo from "@/assets/badaLogo2.svg";
import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import {
  loginPasswordRules,
  loginUsernameRules,
} from "@/constants/authValidation";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import {
  isDiagnosisRequired,
  setAuthenticatedUsername,
} from "@/utils/diagnosisFlow";
import { setAuthTokens } from "@/utils/authTokenStorage";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginScreen() {
  useAndroidBackHandler(() => {
    router.replace("/auth");
    return true;
  });

  const { height, width } = useWindowDimensions();
  const isTablet = width >= 600;
  const topPadding = Math.min(Math.max(height * 0.08, 56), 80);
  const inputTop = Math.min(Math.max(height * 0.4, 260), 380);
  const headerHeight = 74;
  const formTopMargin = Math.max(inputTop - topPadding - headerHeight, 40);

  const {
    control,
    trigger,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { username: "", password: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const inputTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      Animated.timing(inputTranslateY, {
        toValue: -80,
        duration: Platform.OS === "ios" ? event.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(inputTranslateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? event.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [inputTranslateY]);

  const clearLoginServerError = () => {
    if (errors.username?.type === "server") {
      clearErrors("username");
    }
    if (errors.password?.type === "server") {
      clearErrors("password");
    }
  };

  const handleLogin = async () => {
    const isValid = await trigger(["username", "password"]);
    if (!isValid) return;

    setIsLoggingIn(true);

    try {
      const { username: rawUsername, password } = getValues();
      const username = rawUsername.trim();
      const response = await postLogin({ username, password });

      await AsyncStorage.setItem(
        "autoLogin",
        isChecked ? "true" : "false",
      );
      await setAuthTokens(response.data);
      await setAuthenticatedUsername(username);

      const needsDiagnosis = await isDiagnosisRequired(username);
      router.replace(needsDiagnosis ? "/diagnosis/welcome" : "/home");
    } catch (error) {
      const errorField =
        getApiErrorStatus(error) === 404 ? "username" : "password";

      setError(errorField, {
        type: "server",
        message: getApiErrorMessage(
          error,
          "아이디 또는 비밀번호가 올바르지 않습니다.",
        ),
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView className="flex-1 bg-background-normal">
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
            <Text className="text-title1 font-bold text-label-strong">
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
                rules={loginUsernameRules}
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <CustomInput
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      clearLoginServerError();
                    }}
                    label="아이디"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    error={error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                rules={loginPasswordRules}
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <CustomInput
                    ref={passwordRef}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      clearLoginServerError();
                    }}
                    label="비밀번호"
                    secureTextEntry={!isPasswordVisible}
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    error={error?.message}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() =>
                          setIsPasswordVisible((current) => !current)
                        }
                      >
                        <Ionicons
                          name={isPasswordVisible ? "eye-off-sharp" : "eye"}
                          size={20}
                          color={SEMANTIC_COLORS.line.normal}
                        />
                      </TouchableOpacity>
                    }
                  />
                )}
              />
            </Animated.View>

            <Pressable
              className="flex-row items-center mb-6 gap-x-2"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              onPress={() => setIsChecked((current) => !current)}
            >
              <View>
                <Ionicons
                  name={
                    isChecked ? "checkmark-circle" : "checkmark-circle-outline"
                  }
                  size={24}
                  style={{ width: 24, height: 24 }}
                  color={isChecked ? SEMANTIC_COLORS.primary.normal : SEMANTIC_COLORS.line.normal}
                />
              </View>
              <Text
                className={`text-body ${
                  isChecked ? "text-label-normal" : "text-line-normal"
                }`}
              >
                로그인 상태 유지
              </Text>
            </Pressable>

            <View className="gap-y-3">
              <CustomButton
                label={isLoggingIn ? "로그인 중" : "로그인"}
                tone="primary"
                disabled={isLoggingIn}
                onPress={handleLogin}
              />
              <CustomButton
                label="회원가입"
                tone="neutral"
                onPress={() => router.replace("/auth/signup")}
              />
            </View>

            <View className="flex-row mt-3 gap-x-4">
              <TouchableOpacity onPress={() => router.push("/auth/find-id")}>
                <Text className="text-label text-label-alternative">아이디 찾기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/auth/reset-password")}
              >
                <Text className="text-label text-label-alternative">비밀번호 찾기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
