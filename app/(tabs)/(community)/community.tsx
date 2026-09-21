import { getApiErrorMessage } from "@/api/error";
import type { CommunityPostSummary } from "@/api/types";
import SearchIconButton from "@/components/common/SearchIconButton";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import Top from "@/components/common/Top";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import {
  CommunityPostListMode,
  useCommunityPosts,
} from "@/hooks/useCommunityPosts";
import FontAsweome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CommunityTab = CommunityPostListMode;
type CommunityPostsQuery = ReturnType<typeof useCommunityPosts>;

interface CommunityTabItem {
  key: CommunityTab;
  label: string;
}

interface CommunityFeedProps {
  pageWidth: number;
  postsQuery: CommunityPostsQuery;
  onOpenPost: (post: CommunityPostSummary) => void;
}

const TABS: CommunityTabItem[] = [
  { key: "all", label: "전체 글" },
  { key: "mine", label: "내 글" },
];

const TAB_WIDTH = 80;
const TAB_GAP = 15;

function CommunityFeed({
  pageWidth,
  postsQuery,
  onOpenPost,
}: CommunityFeedProps) {
  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [postsQuery.data],
  );

  const emptyContent = postsQuery.isError ? (
    <View className="items-center justify-center px-8 py-20">
      <Text className="text-center text-body text-label-alternative">
        {getApiErrorMessage(postsQuery.error, "게시물을 불러오지 못했어요.")}
      </Text>
      <Pressable
        onPress={() => void postsQuery.refetch()}
        className="mt-4 rounded-component bg-fill-normal px-4 py-2 active:opacity-70"
      >
        <Text className="text-label font-medium text-label-normal">
          다시 시도
        </Text>
      </Pressable>
    </View>
  ) : (
    <View className="items-center justify-center py-20">
      <Text className="text-body text-label-alternative">
        표시할 게시물이 없어요.
      </Text>
    </View>
  );

  if (postsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center" style={{ width: pageWidth }}>
        <LoadingIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ width: pageWidth }}>
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.post_id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          gap: 12,
          paddingHorizontal: 32,
          paddingBottom: 12,
        }}
        renderItem={({ item }) => (
          <CommunityPostCard
            post={item}
            reactionsInteractive={false}
            onPress={() => onOpenPost(item)}
          />
        )}
        ListEmptyComponent={emptyContent}
        ListFooterComponent={
          postsQuery.isFetchingNextPage ? (
            <LoadingIndicator size="small" className="py-5" />
          ) : null
        }
        refreshing={
          postsQuery.isRefetching && !postsQuery.isFetchingNextPage
        }
        onRefresh={() => void postsQuery.refetch()}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
            void postsQuery.fetchNextPage();
          }
        }}
      />
    </View>
  );
}

export default function Community() {
  const { width: pageWidth, fontScale } = useWindowDimensions();
  const tabHorizontalPadding = pageWidth < 360 ? 16 : 32;
  const tabWidth = Math.ceil(TAB_WIDTH * Math.max(1, fontScale));
  const menuRef = useRef<ScrollView>(null);
  const pagerRef = useRef<FlatList<CommunityTabItem>>(null);
  const pagerScrollX = useRef(new Animated.Value(0)).current;
  const [selectedTab, setSelectedTab] = useState<CommunityTab>("all");

  useEffect(() => {
    const index = TABS.findIndex((tab) => tab.key === selectedTab);
    const tabRight =
      tabHorizontalPadding + (index + 1) * tabWidth + index * TAB_GAP;
    menuRef.current?.scrollTo({
      x: index <= 0 ? 0 : Math.max(0, tabRight - pageWidth + tabHorizontalPadding),
      animated: true,
    });
  }, [pageWidth, selectedTab, tabHorizontalPadding, tabWidth]);

  // 두 페이지를 함께 준비해 스와이프한 뒤 데이터를 기다리는 시간을 줄인다.
  const allPostsQuery = useCommunityPosts({ mode: "all" });
  const myPostsQuery = useCommunityPosts({ mode: "mine" });

  const indicatorTranslateX = pagerScrollX.interpolate({
    inputRange: [0, pageWidth],
    outputRange: [0, tabWidth + TAB_GAP],
    extrapolate: "clamp",
  });

  const openPost = (post: CommunityPostSummary) => {
    router.push({
      pathname: "/(tabs)/(community)/post/[id]",
      params: { id: String(post.post_id) },
    });
  };

  const selectTab = (tab: CommunityTab) => {
    const tabIndex = TABS.findIndex((item) => item.key === tab);
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
    const tabIndex = Math.round(
      event.nativeEvent.contentOffset.x / pageWidth,
    );
    const nextTab = TABS[tabIndex];
    if (nextTab) setSelectedTab(nextTab.key);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
      <Top
        title="커뮤니티"
        safeArea={false}
        right={
          <SearchIconButton
            onPress={() => router.push("/(tabs)/(community)/search")}
            size={30}
          />
        }
      />

      <ScrollView
        ref={menuRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        className="h-[53px]"
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: tabHorizontalPadding }}
      >
        <View className="relative h-[53px]">
          <View className="flex-row" style={{ gap: TAB_GAP }}>
            {TABS.map((tab, index) => {
              const selected = tab.key === selectedTab;
              const activeTextOpacity = pagerScrollX.interpolate({
                inputRange: [
                  (index - 1) * pageWidth,
                  index * pageWidth,
                  (index + 1) * pageWidth,
                ],
                outputRange: [0, 1, 0],
                extrapolate: "clamp",
              });

              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => selectTab(tab.key)}
                  className="items-center"
                  style={{ width: tabWidth }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-center text-headline2 font-medium text-line-normal"
                    style={{ width: tabWidth }}
                  >
                    {tab.label}
                  </Text>
                  <Animated.Text
                    numberOfLines={1}
                    pointerEvents="none"
                    className="absolute text-center text-headline2 font-medium text-green-40"
                    style={{ width: tabWidth, opacity: activeTextOpacity }}
                  >
                    {tab.label}
                  </Animated.Text>
                </Pressable>
              );
            })}
          </View>
          <Animated.View
            pointerEvents="none"
            className="absolute h-0.5 bg-green-40"
            style={{
              top: Math.min(45, 8 + 23.4 * fontScale),
              width: tabWidth,
              transform: [{ translateX: indicatorTranslateX }],
            }}
          />
        </View>
      </ScrollView>

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
        data={TABS}
        keyExtractor={(tab) => tab.key}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={TABS.length}
        maxToRenderPerBatch={TABS.length}
        windowSize={TABS.length}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <CommunityFeed
            pageWidth={pageWidth}
            postsQuery={item.key === "all" ? allPostsQuery : myPostsQuery}
            onOpenPost={openPost}
          />
        )}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: pagerScrollX } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handlePageSettled}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="새 게시물 작성"
        onPress={() => router.push("/(tabs)/(community)/create")}
        className="absolute bottom-8 right-8 h-16 w-16 items-center justify-center rounded-pill bg-primary-normal active:opacity-80"
        style={{
          shadowColor: "#000000",
          shadowOpacity: 0.18,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }}
      >
        <FontAsweome5 name="pen" size={29} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
