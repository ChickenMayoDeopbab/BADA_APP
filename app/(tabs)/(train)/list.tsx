import SearchBox from "@/components/common/SearchBox";
import CustomButton from "@/components/common/CustomButton";
import DropdownArrow from "@/assets/dropdownArrow.svg";
import { getScenarios } from "@/api/trainApi";
import { ScenarioInfo } from "@/api/types";
import { router } from "expo-router";
import { ElementRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

const sortOptions = ["제목 순", "난이도 순"]; // 정렬 옵션 목록

// 카테고리별 썸네일 (scenario_image 없을 때 폴백)
const categoryImageMap: Record<string, ImageSourcePropType> = {
  restaurant: require("@/assets/Q1_s.png"),
  hospital: require("@/assets/Q2_s.png"),
  complaint: require("@/assets/Q3_s.png"),
  delivery: require("@/assets/Q4_s.png"),
  bank: require("@/assets/Q5_s.png"),
  custom: require("@/assets/Q6_s.png"),
};
const fallbackImage: ImageSourcePropType = require("@/assets/Q1_s.png");

/** 시나리오 카테고리에 맞는 로컬 이미지 반환 */
function getLocalImage(category: string): ImageSourcePropType {
  return categoryImageMap[category] ?? fallbackImage;
}

export default function List() {
  const [search, setSearch] = useState(""); // 검색어
  const [isSortVisible, setIsSortVisible] = useState(false); // 정렬 드롭다운 표시 여부
  const [selectedSort, setSelectedSort] = useState("제목 순"); // 선택된 정렬 옵션
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 }); // 드롭다운 절대 위치
  const [isScrollTopVisible, setIsScrollTopVisible] = useState(false); // 상단 이동 버튼 표시 여부
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<ElementRef<typeof TouchableOpacity>>(null);
  const flatListRef = useRef<FlatList<ScenarioInfo | null>>(null);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getScenarios();
      setScenarios(result.scenarios);
    } catch {
      setError("시나리오 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  /** 드롭다운 버튼 레이아웃 측정 후 위치 저장 */
  const handleDropdownLayout = () => {
    dropdownRef.current?.measure((_, __, ___, height, px, py) => {
      setDropdownPos({ top: py + height + 8, left: px });
    });
  };

  const filtered = scenarios.filter((s) => s.title.includes(search));
  const sorted =
    selectedSort === "제목 순"
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title))
      : filtered;
  const paddedData: (ScenarioInfo | null)[] =
    sorted.length % 2 !== 0 ? [...sorted, null] : sorted;

  /** 시나리오 카드 클릭 시 상세 페이지로 이동 */
  const handleScenarioPress = (scenario: ScenarioInfo) => {
    router.push({
      pathname: `/(tabs)/(train)/detail/${scenario.scenario_id}` as any,
      params: {
        title: scenario.title,
        content: scenario.content,
        isCustom: String(scenario.is_custom),
        scenarioImage: scenario.scenario_image ?? "",
        category: scenario.category,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE] px-8">
      <Text className="text-xl font-bold text-[#3B3D3E] mt-10 mb-7 text-center">훈련하기</Text>
      <View className="flex-1">
        <SearchBox
          placeholder="제목, 설명으로 검색"
          value={search}
          onChangeText={setSearch}
        />

        <View className="flex-row items-center mt-3 mb-4 gap-x-3">
          <TouchableOpacity
            ref={dropdownRef}
            onLayout={handleDropdownLayout}
            onPress={() => setIsSortVisible(true)}
            activeOpacity={0.8}
            className="flex-row items-center justify-between bg-[#EBEBEC] rounded-lg px-3"
            style={{ height: 38, width: 120 }}
          >
            <Text className="text-[#5C5E5E] text-sm">{selectedSort}</Text>
            <DropdownArrow width={14} height={12} />
          </TouchableOpacity>

          <View className="flex-1">
            <CustomButton
              label="커스텀 시나리오 만들기"
              backgroundColor="#0AE365"
              color="white"
              variant="md"
              onPress={() => router.push("/(tabs)/(train)/create")}
            />
          </View>
        </View>

        <View className="border-b border-[#EBEBEC]" />

        {isLoading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0AE365" />
          </View>
        )}

        {error && !isLoading && (
          <View className="flex-1 items-center justify-center gap-y-4">
            <Text className="text-base text-[#5C5E5E] text-center">{error}</Text>
            <CustomButton
              label="다시 시도"
              backgroundColor="#0AE365"
              color="white"
              variant="md"
              onPress={fetchScenarios}
            />
          </View>
        )}

        {!isLoading && !error && (
          <FlatList
            ref={flatListRef}
            data={paddedData}
            keyExtractor={(item, index) =>
              item ? String(item.scenario_id) : `placeholder-${index}`
            }
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent }) =>
              setIsScrollTopVisible(nativeEvent.contentOffset.y > 200)
            }
            scrollEventThrottle={16}
            renderItem={({ item }) => {
              if (!item) return <View className="flex-1" />;
              const imageSource: ImageSourcePropType = item.scenario_image
                ? { uri: item.scenario_image }
                : getLocalImage(item.category);
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-1 rounded-2xl overflow-hidden bg-[#F5F5F5]"
                  onPress={() => handleScenarioPress(item)}
                >
                  <Image
                    source={imageSource}
                    className="w-full"
                    style={{ height: 140 }}
                    resizeMode="cover"
                  />
                  <View className="justify-center" style={{ height: 50 }}>
                    <Text
                      className="text-base px-3 text-[#3B3D3E]"
                      style={{ fontWeight: "bold" }}
                    >
                      {item.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* 스크롤이 200px 이상일 때 표시 */}
      {isScrollTopVisible && (
        <TouchableOpacity
          onPress={() =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
          }
          activeOpacity={0.8}
          style={styles.scrollTopButton}
        >
          <Ionicons name="arrow-up" size={22} color="white" />
        </TouchableOpacity>
      )}

      {/* 정렬 드롭다운이 열린 상태일 때 표시 */}
      {isSortVisible && (
        <>
          <TouchableOpacity
            style={styles.dropdownOverlay}
            onPress={() => setIsSortVisible(false)}
            activeOpacity={1}
          />
          <View
            style={[
              styles.dropdownMenu,
              { top: dropdownPos.top, left: dropdownPos.left },
            ]}
          >
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option}
                className="px-4 py-4"
                onPress={() => {
                  setSelectedSort(option);
                  setIsSortVisible(false);
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
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollTopButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0AE365",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownMenu: {
    position: "absolute",
    width: 120,
    backgroundColor: "#FEFEFE",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
