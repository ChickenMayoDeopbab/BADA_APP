import { ScenarioCategory, ScenarioInfo } from "@/api/types";
import { HEADER_CONTENT_HEIGHT } from "@/components/common/Top";
import CustomButton from "@/components/common/CustomButton";
import CategoryChips from "@/components/train/CategoryChips";
import GradientOverlay from "@/components/train/GradientOverlay";
import CustomScenarioBanner from "@/components/train/CustomScenarioBanner";
import RecommendScenarioCard from "@/components/train/RecommendScenarioCard";
import ScenarioGridCard from "@/components/train/ScenarioGridCard";
import ScenarioTabs from "@/components/train/ScenarioTabs";
import SearchIconButton from "@/components/common/SearchIconButton";
import { ScenarioTabValue } from "@/constants/train";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { useScenarios } from "@/hooks/useScenarios";
import { openScenarioDetail } from "@/utils/scenarioNavigation";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
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

  // 시나리오 목록은 페이지네이션이 없어 한 번에 받고 탭·카테고리는 클라이언트에서 거른다
  const { data: scenarios, isPending, isError, isFetching, refetch } =
    useScenarios();

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

  const visibleScenarios = useMemo(() => {
    if (selectedTab === "custom") return customScenarios;
    if (selectedTab === "shared") return sharedScenarios;
    if (!selectedCategory) return basicScenarios;
    // 서버 값의 대소문자·공백 차이로 카테고리가 통째로 비어 보이지 않도록 정규화해서 비교한다
    return basicScenarios.filter(
      (scenario) => scenario.category?.trim().toLowerCase() === selectedCategory,
    );
  }, [
    basicScenarios,
    customScenarios,
    selectedCategory,
    selectedTab,
    sharedScenarios,
  ]);

  const recommendedScenario = basicScenarios[0];

  return (
    <View className="flex-1 bg-background-alternative">
      {/*
        헤더 높이는 공용 Top 컴포넌트와 동일하게 맞춘다.
        총 높이를 고정하면 상단 인셋만큼 콘텐츠 영역이 깎여, 인셋이 큰 iOS에서만
        타이틀이 아래 카테고리 탭에 바짝 붙는다. 인셋에 콘텐츠 높이를 더한다.
      */}
      <View
        className="flex-row items-center justify-between px-8"
        style={{
          paddingTop: insets.top,
          height: insets.top + HEADER_CONTENT_HEIGHT,
        }}
      >
        <Text className="text-title2 font-bold text-label-normal">
          시나리오 훈련
        </Text>
        <SearchIconButton
          onPress={() => router.push("/(tabs)/(train)/search")}
        />
      </View>

      {/* 탭과 아래 콘텐츠 사이 간격은 디자인 기준 20px */}
      <View className="px-8 pb-5">
        <ScenarioTabs value={selectedTab} onChange={setSelectedTab} />
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
          {/* flexGrow로 내용이 짧아도 시나리오 패널이 화면 아래까지 이어지게 한다 */}
          <Animated.ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            scrollEventThrottle={16}
            // 웹에서는 네이티브 드라이버가 스크롤 이벤트를 구동하지 못해 페이드가 죽는다.
            // 값 하나(opacity)만 따라가므로 JS 드라이버로도 충분하다.
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false },
            )}
          >
            {/* 배너와 추천 카드는 디자인상 좌우 여백이 다르다 (배너 16px, 추천 카드 32px) */}
            {selectedTab === "custom" ? (
              <View className="px-4 pb-5">
                <CustomScenarioBanner
                  onPress={() => router.push("/(tabs)/(train)/create")}
                />
              </View>
            ) : selectedTab === "basic" ? (
              recommendedScenario && (
                <View className="px-8 pb-5">
                  <RecommendScenarioCard
                    scenario={recommendedScenario}
                    onPress={openScenarioDetail}
                  />
                </View>
              )
            ) : null}

            {/* 아래로 끊기지 않고 이어지도록 남은 높이를 채우고 위쪽만 둥글린다 */}
            <View className="flex-1 gap-y-3 rounded-t-component bg-background-normal px-8 py-6">
              <Text className="text-headline2 font-bold text-label-normal">
                시나리오
              </Text>

              {/* 카테고리 필터는 기본 제공 탭에만 노출 */}
              {selectedTab === "basic" && (
                <CategoryChips
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                />
              )}

              {visibleScenarios.length === 0 ? (
                <Text className="py-10 text-center text-label text-label-alternative">
                  {selectedTab === "custom"
                    ? "아직 만든 커스텀 시나리오가 없습니다."
                    : selectedTab === "shared"
                      ? "아직 공유받은 시나리오가 없습니다."
                      : selectedCategory
                      ? "해당 카테고리의 시나리오가 없습니다."
                      : "표시할 시나리오가 없습니다."}
                </Text>
              ) : (
                <View className="gap-y-3">
                  {toGridRows(visibleScenarios).map((row) => (
                    <View
                      key={row[0].scenario_id}
                      className="flex-row gap-x-3"
                    >
                      {row.map((scenario) => (
                        <ScenarioGridCard
                          key={scenario.scenario_id}
                          scenario={scenario}
                          onPress={openScenarioDetail}
                        />
                      ))}
                      {/* 마지막 줄이 한 칸이면 자리 맞춤 */}
                      {row.length === 1 && <View className="flex-1" />}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.ScrollView>

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
    </View>
  );
}
