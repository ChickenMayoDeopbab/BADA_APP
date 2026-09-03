import { ScenarioCategory, ScenarioInfo } from "@/api/types";
import CustomButton from "@/components/common/CustomButton";
import CategoryChips from "@/components/train/CategoryChips";
import GradientOverlay from "@/components/train/GradientOverlay";
import CustomScenarioBanner from "@/components/train/CustomScenarioBanner";
import RecommendScenarioCard from "@/components/train/RecommendScenarioCard";
import ScenarioGridCard from "@/components/train/ScenarioGridCard";
import ScenarioTabs from "@/components/train/ScenarioTabs";
import SearchIconButton from "@/components/common/SearchIconButton";
import { SCENARIO_TABS, ScenarioTabValue } from "@/constants/train";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useScenarios } from "@/hooks/useScenarios";
import { openScenarioDetail } from "@/utils/scenarioNavigation";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// 탭 아래에서 목록이 뚝 잘려 보이지 않도록 덮는 페이드 (배경색 → 투명).
// 시작 구간을 불투명하게 붙잡아 두어야 경계가 선처럼 보이지 않는다.
const SCROLL_FADE_STOPS = [
  { color: SEMANTIC_COLORS.background.alternative, opacity: 1, offset: "0%" },
  { color: SEMANTIC_COLORS.background.alternative, opacity: 1, offset: "25%" },
  { color: SEMANTIC_COLORS.background.alternative, opacity: 0, offset: "100%" },
];

// 페이드 높이. 위로 2px 겹쳐 탭 영역과의 이음새가 벌어져 보이지 않게 한다.
const SCROLL_FADE_HEIGHT = 44;
const SCROLL_FADE_OVERLAP = 2;

/** 그리드 렌더링을 위해 목록을 2개씩 묶는다 */
const toGridRows = (scenarios: ScenarioInfo[]): ScenarioInfo[][] =>
  scenarios.reduce<ScenarioInfo[][]>((rows, scenario, index) => {
    if (index % 2 === 0) rows.push([scenario]);
    else rows[rows.length - 1].push(scenario);
    return rows;
  }, []);

export default function List() {
  const { width: pageWidth } = useWindowDimensions();
  const pagerRef = useRef<FlatList<(typeof SCENARIO_TABS)[number]>>(null);
  const pagerScrollX = useRef(new Animated.Value(0)).current;
  // 스크롤을 내렸을 때만 상단 페이드를 보여준다
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({
    inputRange: [0, 24],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const [selectedTab, setSelectedTab] = useState<ScenarioTabValue>("basic");
  const [selectedCategory, setSelectedCategory] =
    useState<ScenarioCategory | null>(null);

  // 전체 목록은 커스텀·공유 탭 분류와 추천 카드에 사용한다.
  const {
    data: scenarios,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useScenarios();
  // 카테고리를 고르면 API의 category 쿼리로 다시 조회한다.
  // 전체 목록 쿼리는 커스텀·공유 탭과 추천 카드에서 계속 사용한다.
  const categoryScenariosQuery = useScenarios(selectedCategory);

  const basicScenarios = useMemo(
    () => scenarios?.filter((scenario) => !scenario.is_custom) ?? [],
    [scenarios],
  );
  const customScenarios = useMemo(
    () =>
      scenarios?.filter(
        (scenario) => scenario.is_custom && !scenario.is_copied,
      ) ?? [],
    [scenarios],
  );
  const sharedScenarios = useMemo(
    () =>
      scenarios?.filter(
        (scenario) => scenario.is_custom && scenario.is_copied,
      ) ?? [],
    [scenarios],
  );

  const categorizedBasicScenarios = useMemo(() => {
    if (!selectedCategory) return basicScenarios;

    return (categoryScenariosQuery.data ?? []).filter(
      (scenario) =>
        !scenario.is_custom &&
        scenario.category?.trim().toLowerCase() === selectedCategory,
    );
  }, [basicScenarios, categoryScenariosQuery.data, selectedCategory]);

  const recommendedScenario = basicScenarios[0];

  const selectTab = (tab: ScenarioTabValue) => {
    const tabIndex = SCENARIO_TABS.findIndex((item) => item.value === tab);
    if (tabIndex < 0) return;

    setSelectedTab(tab);
    pagerRef.current?.scrollToOffset({
      offset: tabIndex * pageWidth,
      animated: true,
    });
  };

  const handlePageSettled = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const tabIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const nextTab = SCENARIO_TABS[tabIndex];
    if (nextTab) setSelectedTab(nextTab.value);
  };

  const getVisibleScenarios = (tab: ScenarioTabValue) => {
    if (tab === "custom") return customScenarios;
    if (tab === "shared") return sharedScenarios;
    return categorizedBasicScenarios;
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
      <View className="h-[60px] flex-row items-center justify-between px-8">
        <Text className="text-title2 font-bold text-label-normal">
          시나리오 훈련
        </Text>
        <SearchIconButton
          onPress={() => router.push("/(tabs)/(train)/search")}
          size={30}
        />
      </View>

      <View className="h-[53px] px-8">
        <ScenarioTabs
          value={selectedTab}
          onChange={selectTab}
          pageWidth={pageWidth}
          scrollX={pagerScrollX}
        />
      </View>

      {/* 목록 로딩 중 */}
      {isPending && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0AE365" />
        </View>
      )}

      {/* 목록 조회 실패 */}
      {isError && !isPending && (
        <View className="flex-1 items-center justify-center gap-y-4 px-8">
          <Text className="text-body text-label-alternative text-center">
            시나리오 목록을 불러오지 못했어요.
          </Text>
          {/* CustomButton은 w-full이라 폭을 줄이려면 감싸는 View로 제한한다 */}
          <View className="w-[140px]">
            <CustomButton
              label={isFetching ? "불러오는 중..." : "다시 불러오기"}
              backgroundColor="#0AE365"
              color="white"
              variant="md"
              disabled={isFetching}
              onPress={() => refetch()}
            />
          </View>
        </View>
      )}

      {!isPending && !isError && (
        <View className="flex-1">
          <Animated.FlatList
            ref={pagerRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            bounces={false}
            overScrollMode="never"
            directionalLockEnabled
            disableIntervalMomentum
            decelerationRate="fast"
            snapToInterval={pageWidth}
            snapToAlignment="start"
            data={SCENARIO_TABS}
            keyExtractor={(tab) => tab.value}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={SCENARIO_TABS.length}
            maxToRenderPerBatch={SCENARIO_TABS.length}
            windowSize={SCENARIO_TABS.length}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            renderItem={({ item }) => {
              const tabScenarios = getVisibleScenarios(item.value);

              return (
                <Animated.ScrollView
                  style={{ width: pageWidth }}
                  nestedScrollEnabled
                  directionalLockEnabled
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1 }}
                  scrollEventThrottle={16}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false },
                  )}
                >
                  {item.value === "custom" ? (
                    <View className="px-8 pb-5">
                      <CustomScenarioBanner
                        onPress={() => router.push("/(tabs)/(train)/create")}
                      />
                    </View>
                  ) : item.value === "basic" && recommendedScenario ? (
                    <View className="px-8 pb-5">
                      <RecommendScenarioCard
                        scenario={recommendedScenario}
                        onPress={openScenarioDetail}
                      />
                    </View>
                  ) : null}

                  <View className="flex-1 gap-y-3 rounded-t-component bg-background-normal px-8 py-6">
                    <Text className="text-headline2 font-bold text-label-normal">
                      시나리오
                    </Text>

                    {item.value === "basic" && (
                      <CategoryChips
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                      />
                    )}

                    {item.value === "basic" &&
                    selectedCategory &&
                    categoryScenariosQuery.isPending ? (
                      <ActivityIndicator className="py-10" color="#0AE365" />
                    ) : item.value === "basic" &&
                      selectedCategory &&
                      categoryScenariosQuery.isError ? (
                      <View className="items-center py-10 gap-y-3">
                        <Text className="text-center text-label text-label-alternative">
                          카테고리 시나리오를 불러오지 못했어요.
                        </Text>
                        <View className="w-[140px]">
                          <CustomButton
                            label={
                              categoryScenariosQuery.isFetching
                                ? "불러오는 중..."
                                : "다시 불러오기"
                            }
                            tone="primary"
                            variant="md"
                            disabled={categoryScenariosQuery.isFetching}
                            onPress={() => categoryScenariosQuery.refetch()}
                          />
                        </View>
                      </View>
                    ) : tabScenarios.length === 0 ? (
                      <Text className="py-10 text-center text-label text-label-alternative">
                        {item.value === "custom"
                          ? "아직 만든 커스텀 시나리오가 없습니다."
                          : item.value === "shared"
                            ? "아직 공유받은 시나리오가 없습니다."
                            : selectedCategory
                              ? "해당 카테고리의 시나리오가 없습니다."
                              : "표시할 시나리오가 없습니다."}
                      </Text>
                    ) : (
                      <View className="gap-y-3">
                        {toGridRows(tabScenarios).map((row) => (
                          <View key={row[0].scenario_id} className="flex-row gap-x-3">
                            {row.map((scenario) => (
                              <ScenarioGridCard
                                key={scenario.scenario_id}
                                scenario={scenario}
                                onPress={openScenarioDetail}
                              />
                            ))}
                            {row.length === 1 && <View className="flex-1" />}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </Animated.ScrollView>
              );
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: pagerScrollX } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handlePageSettled}
          />

          {/*
            스크롤된 내용이 탭 바로 아래에서 잘려 보이지 않도록 덮는 페이드.
            맨 위에서는 첫 콘텐츠를 가리므로 스크롤을 내려야 나타난다.
          */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: -SCROLL_FADE_OVERLAP,
              height: SCROLL_FADE_HEIGHT + SCROLL_FADE_OVERLAP,
              opacity: fadeOpacity,
            }}
          >
            <GradientOverlay stops={SCROLL_FADE_STOPS} />
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
