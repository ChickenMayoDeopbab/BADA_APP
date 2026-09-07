import Top from "@/components/common/Top";
import { Pressable, Text, View } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import AttendanceCalendar from "@/components/Calendar";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from "expo-router";
import { useDoubleBackExit } from "@/hooks/useAndroidBackHandler";

export default function Home() {
  useDoubleBackExit();
  return (
    <View className="flex-1 px-10 bg-white">
      <Top isMain/>
      <View className="flex flex-col gap-2">
        <Text className="text-xl font-bold">빠른 시작</Text>
        <Pressable className="flex-row items-center justify-between p-4 rounded-xl bg-[#0AE365]" onPress={() => router.push("/(tabs)/(train)/list")}>
          <Ionicons name="call" size={22} color="white" />
          <Text className="text-lg font-bold text-white">커스텀 훈련 바로 시작하기</Text>
        </Pressable>
        <Pressable className="flex-row items-center justify-between p-4 rounded-xl bg-[#006FCC]" onPress={() => router.push("/(tabs)/(train)/warmup")}>
          <MaterialIcons name="local-fire-department" size={24} color="white" />
          <Text className="text-lg font-bold text-white">통화 전 워밍업 시작하기</Text>
        </Pressable>
      </View>

      <View className="flex flex-col gap-2 mt-4">
        <Text className="text-xl font-bold">출석</Text>
        <AttendanceCalendar/>
      </View>
    </View>
  )
}
