import { deleteSignout } from "@/api/authApi";
import { MyPageResponse } from "@/api/types";
import { getMyPage } from "@/api/userInfoApi";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MenuItemProps {
  label: string;
  onPress: () => void;
}

const MenuItem = ({ label, onPress }: MenuItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center justify-between px-4 py-4 rounded-xl bg-[#F2F2F3]"
  >
    <Text className="text-lg font-bold text-[#0D0D0E]">{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#5C5E5E" />
  </TouchableOpacity>
);

function ProfileScreen() {
  const [myPage, setMyPage] = useState<MyPageResponse | null>(null);

  useEffect(() => {
    const fetchMyPage = async () => {
      try {
        const response = await getMyPage();
        setMyPage(response.data);
      } catch (error) {}
    };
    fetchMyPage();
  }, []);

  const handleSignOut = async () => {
    await deleteSignout();
    router.replace("/auth");
  };
  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE] px-8">
      <Text className="text-xl font-bold text-[#3B3D3E] mt-10 mb-7 text-center">
        프로필
      </Text>

      <Text className="text-base font-bold text-[#0D0D0E] mb-3">내 정보</Text>
      <View className="w-full gap-1 mb-6">
        <View className="px-4 pt-4 pb-4 rounded-[12px] bg-[#F2F2F3]">
          <Text className="mb-1 font-bold text-[#0D0D0E] text-2xl">
            {myPage?.username}
          </Text>
          <Text className="text-[13px] text-[#8E8E8E]">{myPage?.email}</Text>
        </View>
        <MenuItem label="내 정보 수정" onPress={() => {}} />
        <MenuItem label="로그아웃" onPress={handleSignOut} />
        <MenuItem label="회원 탈퇴" onPress={() => {}} />
      </View>

      <Text className="text-base font-bold text-[#0D0D0E] mb-3">설정</Text>
      <View className="w-full gap-1">
        <MenuItem label="알림" onPress={() => {}} />
        <MenuItem label="언어 설정" onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

export default ProfileScreen;
