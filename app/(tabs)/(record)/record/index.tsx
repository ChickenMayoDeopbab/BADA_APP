import { dummyData } from "@/constants/dummyRecords";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SORT_OPTIONS } from "@/constants/recordConsts";

export default function RecordScreen() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [selectedSort, setSelectedSort] = useState<string>("최신 순");

  return (
    <SafeAreaView className="items-center flex-1 px-8 bg-[#FEFEFE]">
      <Text className="text-xl font-bold text-[#3B3D3E] mt-10 mb-7">
        훈련 기록
      </Text>

      <View className="flex-row w-full mb-5 gap-x-3">
        <View>
          <TouchableOpacity
            onPress={() => setIsVisible(true)}
            className="flex-row items-center justify-between bg-[#EBEBEC] rounded-lg px-4"
            style={{ width: 116, height: 32 }}
          >
            <Text className="text-[#5C5E5E] text-sm">{selectedSort}</Text>
            <Ionicons name="chevron-down" size={14} color="#BDBEBE" />
          </TouchableOpacity>

          <Modal visible={isVisible} transparent animationType="fade">
            <TouchableOpacity
              className="flex-1"
              onPress={() => setIsVisible(false)}
            >
              <View
                className="absolute w-[116px] overflow-hidden shadow-lg bg-[#EBEBEC] rounded-2xl"
                style={{ top: 116, left: 28 }}
              >
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className="px-4 py-4"
                    onPress={() => {
                      setSelectedSort(option);
                      setIsVisible(false);
                    }}
                  >
                    <Text
                      className={`text-sm ${
                        selectedSort === option
                          ? "text-[#0AE365] font-semibold"
                          : "text-[#5C5E5E]"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        <TouchableOpacity className="flex-1 flex-row items-center justify-between h-[32px] bg-[#EBEBEC] rounded-lg px-4">
          <Text>YYYY-MM-DD</Text>
          <Ionicons name="calendar-outline" size={16} color="#BDBEBE" />
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-between w-full pb-2 border-b border-[#BDBEBE]">
        <Text className="text-[#5C5E5E] font-bold text-sm">일시</Text>
        <Text className="text-[#5C5E5E] font-bold text-sm">시나리오명</Text>
      </View>

      <FlatList
        data={dummyData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        className="w-full"
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center justify-between py-4"
            onPress={() =>
              router.push({
                pathname: "/record/[id]",
                params: {
                  id: item.id,
                  date: item.date,
                  scenarioName: item.scenarioName,
                },
              })
            }
          >
            <Text className="text-lg font-medium text-black">{item.date}</Text>
            <Text className="text-lg font-medium text-black">
              {item.scenarioName}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
