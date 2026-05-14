import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SORT_OPTIONS = ["최신 순", "오래된 순"];

const dummyData = [
  { id: "1", date: "2026-04-11(토) 12:32", scenarioName: "피자 주문하기" },
  { id: "2", date: "2026-04-11(토) 10:10", scenarioName: "커스텀 시나리오" },
  { id: "3", date: "2026-04-11(토) 09:03", scenarioName: "병원 예약하기" },
  { id: "4", date: "2026-04-10(금) 19:11", scenarioName: "커스텀 시나리오" },
  { id: "5", date: "2026-04-09(목) 12:09", scenarioName: "커스텀 시나리오" },
  { id: "6", date: "2026-04-09(목) 11:34", scenarioName: "주문 취소하기" },
  { id: "7", date: "2026-04-09(목) 10:42", scenarioName: "커스텀 시나리오" },
  { id: "8", date: "2026-04-07(화) 20:51", scenarioName: "커스텀 시나리오" },
  { id: "9", date: "2026-04-06(월) 11:12", scenarioName: "커스텀 시나리오" },
  { id: "10", date: "2026-04-05(일) 18:45", scenarioName: "카페 주문하기" },
  { id: "11", date: "2026-04-05(일) 14:21", scenarioName: "길 묻기" },
  { id: "12", date: "2026-04-04(토) 21:14", scenarioName: "호텔 체크인" },
  { id: "13", date: "2026-04-04(토) 16:38", scenarioName: "커스텀 시나리오" },
  { id: "14", date: "2026-04-03(금) 13:02", scenarioName: "택시 타기" },
  { id: "15", date: "2026-04-03(금) 09:17", scenarioName: "커스텀 시나리오" },
  {
    id: "16",
    date: "2026-04-02(목) 22:56",
    scenarioName: "음식 포장 요청하기",
  },
  { id: "17", date: "2026-04-02(목) 18:40", scenarioName: "커스텀 시나리오" },
  { id: "18", date: "2026-04-02(목) 08:33", scenarioName: "기차표 예매하기" },
  { id: "19", date: "2026-04-01(수) 20:19", scenarioName: "영화 예매하기" },
  { id: "20", date: "2026-04-01(수) 11:25", scenarioName: "커스텀 시나리오" },
  { id: "21", date: "2026-03-31(화) 17:50", scenarioName: "은행 업무 보기" },
  { id: "22", date: "2026-03-31(화) 14:12", scenarioName: "커스텀 시나리오" },
  { id: "23", date: "2026-03-30(월) 23:08", scenarioName: "환불 요청하기" },
  { id: "24", date: "2026-03-30(월) 19:43", scenarioName: "커스텀 시나리오" },
  { id: "25", date: "2026-03-30(월) 07:55", scenarioName: "공항 체크인" },
  { id: "26", date: "2026-03-29(일) 21:31", scenarioName: "마트에서 계산하기" },
  { id: "27", date: "2026-03-29(일) 16:27", scenarioName: "커스텀 시나리오" },
  { id: "28", date: "2026-03-28(토) 13:48", scenarioName: "약국에서 약 사기" },
  { id: "29", date: "2026-03-28(토) 09:06", scenarioName: "커스텀 시나리오" },
  { id: "30", date: "2026-03-27(금) 18:22", scenarioName: "미용실 예약하기" },
  { id: "31", date: "2026-03-27(금) 12:01", scenarioName: "커스텀 시나리오" },
  { id: "32", date: "2026-03-26(목) 20:15", scenarioName: "도서관 이용하기" },
  { id: "33", date: "2026-03-26(목) 15:37", scenarioName: "커스텀 시나리오" },
  { id: "34", date: "2026-03-25(수) 11:09", scenarioName: "세탁소 맡기기" },
  { id: "35", date: "2026-03-25(수) 08:14", scenarioName: "커스텀 시나리오" },
  { id: "36", date: "2026-03-24(화) 22:44", scenarioName: "식당 예약하기" },
  { id: "37", date: "2026-03-24(화) 17:58", scenarioName: "커스텀 시나리오" },
  { id: "38", date: "2026-03-23(월) 13:26", scenarioName: "배송 문의하기" },
  { id: "39", date: "2026-03-23(월) 10:47", scenarioName: "커스텀 시나리오" },
  { id: "40", date: "2026-03-22(일) 19:03", scenarioName: "지하철 길 찾기" },
];

export default function RecordScreen() {
  const [sortVisible, setSortVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState("최신 순");

  return (
    <SafeAreaView className="items-center flex-1 px-8 bg-[#FEFEFE]">
      <Text className="text-xl font-bold text-[#3B3D3E] mt-10 mb-7">
        훈련 기록
      </Text>

      <View className="flex-row w-full mb-5 gap-x-3">
        <View>
          <TouchableOpacity
            onPress={() => setSortVisible(true)}
            className="flex-row items-center justify-between bg-[#EBEBEC] rounded-lg px-4"
            style={{ width: 116, height: 32 }}
          >
            <Text className="text-[#5C5E5E] text-sm">{selectedSort}</Text>
            <Ionicons name="chevron-down" size={14} color="#BDBEBE" />
          </TouchableOpacity>

          <Modal visible={sortVisible} transparent animationType="fade">
            <TouchableOpacity
              className="flex-1"
              onPress={() => setSortVisible(false)}
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
                      setSortVisible(false);
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
