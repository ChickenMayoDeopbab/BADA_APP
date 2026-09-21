import SearchBox from "@/components/common/SearchBox";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import Top from "@/components/common/Top";
import RecentSearchChips from "@/components/train/RecentSearchChips";
import ScenarioRowCard from "@/components/train/ScenarioRowCard";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useScenarios } from "@/hooks/useScenarios";
import { openScenarioDetail } from "@/utils/scenarioNavigation";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Search() {
  const [keyword, setKeyword] = useState(""); // 입력 중인 검색어
  const [submittedKeyword, setSubmittedKeyword] = useState(""); // 실제로 검색한 검색어

  const { data: scenarios, isPending, isError } = useScenarios();
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentSearches();

  const results = useMemo(() => {
    const query = submittedKeyword.trim();
    if (!query || !scenarios) return [];
    return scenarios.filter(
      (scenario) =>
        scenario.title.includes(query) || scenario.content.includes(query),
    );
  }, [scenarios, submittedKeyword]);

  /** 검색 실행 후 최근 검색어에 기록 */
  const handleSubmit = (nextKeyword: string) => {
    const trimmed = nextKeyword.trim();
    if (!trimmed) return;

    setKeyword(trimmed);
    setSubmittedKeyword(trimmed);
    addRecentSearch(trimmed);
  };

  /** 입력값이 비면 최근 검색어 화면으로 되돌린다 */
  const handleChangeText = (text: string) => {
    setKeyword(text);
    if (!text.trim()) setSubmittedKeyword("");
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
      <Top title="훈련 검색" back onBack={() => router.back()} safeArea={false} />
      <View className="h-[60px] flex-row items-center px-8">
        <View className="flex-1 flex-row">
          <SearchBox
            placeholder="제목 또는 설명으로 검색"
            value={keyword}
            onChangeText={handleChangeText}
            onSubmitEditing={() => handleSubmit(keyword)}
            onSearch={() => handleSubmit(keyword)}
            autoFocus
          />
        </View>
      </View>

      {/* 시나리오 목록 로딩 중 */}
      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <LoadingIndicator />
        </View>
      ) : submittedKeyword ? (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, paddingHorizontal: 21, paddingVertical: 12 }}
        >
          {results.length === 0 ? (
            <Text className="py-10 text-center text-label text-label-alternative">
              {isError
                ? "시나리오 목록을 불러오지 못했습니다."
                : `「${submittedKeyword}」 검색 결과가 없습니다.`}
            </Text>
          ) : (
            results.map((scenario) => (
              <ScenarioRowCard
                key={scenario.scenario_id}
                scenario={scenario}
                onPress={openScenarioDetail}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <RecentSearchChips
          keywords={recentSearches}
          onSelect={handleSubmit}
          onRemove={removeRecentSearch}
          onClearAll={clearRecentSearches}
        />
      )}
    </SafeAreaView>
  );
}
