import CustomButton from "@/components/common/CustomButton";
import CustomInput from "@/components/common/CustomInput";
import { Animated, Text, TouchableOpacity, View } from "react-native";

interface UserInfo {
  username: string;
  userId: string;
}

type UsernameProps = {
  userInfo: UserInfo;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo>>;
  inputTranslateY: Animated.Value;
  inputAreaHeight: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function UsernameStep({
  userInfo,
  setUserInfo,
  inputTranslateY,
  onPrev,
  onNext,
}: UsernameProps) {
  return (
    <View>
      <Animated.View
        className="mb-5"
        style={{ transform: [{ translateY: inputTranslateY }] }}
      >
        <CustomInput
          value={userInfo.userId}
          onChangeText={(text) =>
            setUserInfo((prev) => ({
              ...prev,
              username: text,
            }))
          }
          label="아이디"
          returnKeyType="next"
          onSubmitEditing={onNext}
        />
        <CustomInput
          value={userInfo.username}
          onChangeText={(text) =>
            setUserInfo((prev) => ({
              ...prev,
              userId: text,
            }))
          }
          label="이름"
          returnKeyType="done"
          onSubmitEditing={onNext}
        />
      </Animated.View>

      <View style={{ height: 24 }} className="mb-6" />

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
