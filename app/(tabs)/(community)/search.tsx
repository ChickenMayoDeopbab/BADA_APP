import CommunityPostCard from "@/components/community/CommunityPostCard";
import SearchBox from "@/components/common/SearchBox";
import RecentSearchChips from "@/components/train/RecentSearchChips";
import { getApiErrorMessage } from "@/api/error";
import { SEMANTIC_COLORS } from "@/design-system";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunitySearchScreen() {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentSearches({ storageKey: "recentCommunitySearches" });
  const searchQuery = useCommunityPosts({
    query: debouncedKeyword,
    enabled: Boolean(debouncedKeyword),
    preservePreviousData: true,
  });

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setDebouncedKeyword("");
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedKeyword(trimmed);
    }, 250);

    return () => clearTimeout(timer);
  }, [keyword]);

  const results = useMemo(() => {
    return searchQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  }, [searchQuery.data]);

  const submitSearch = (nextKeyword: string) => {
    const trimmed = nextKeyword.trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    addRecentSearch(trimmed);

    if (trimmed === debouncedKeyword) {
      void searchQuery.refetch();
      return;
    }

    setDebouncedKeyword(trimmed);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
      <View className="h-[60px] flex-row items-center px-2">
        <Pressable
          onPress={() => router.back()}
          className="h-16 w-16 items-center justify-center active:opacity-60"
        >
          <Ionicons
            name="chevron-back"
            size={32}
            color={SEMANTIC_COLORS.label.alternative}
          />
        </Pressable>
        <View className="mr-6 flex-1">
          <SearchBox
            autoFocus
            placeholder="제목 또는 설명으로 검색"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={() => submitSearch(keyword)}
            onSearch={() => submitSearch(keyword)}
          />
        </View>
      </View>

      {keyword.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(post) => String(post.post_id)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingHorizontal: 11,
            paddingTop: 14,
            paddingBottom: 24,
          }}
          renderItem={({ item }) => (
            <CommunityPostCard
              post={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/(community)/post/[id]",
                  params: { id: String(item.post_id) },
                })
              }
            />
          )}
          ListEmptyComponent={
            searchQuery.isPending ? (
              <ActivityIndicator className="py-16" />
            ) : searchQuery.isError ? (
              <View className="items-center px-8 py-16">
                <Text className="text-center text-body text-label-alternative">
                  {getApiErrorMessage(
                    searchQuery.error,
                    "검색 결과를 불러오지 못했어요.",
                  )}
                </Text>
                <Pressable
                  onPress={() => void searchQuery.refetch()}
                  className="mt-4 rounded-component bg-fill-normal px-4 py-2"
                >
                  <Text className="text-label font-medium text-label-normal">
                    다시 시도
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text className="py-16 text-center text-body text-label-alternative">
                검색 결과가 없어요.
              </Text>
            )
          }
          ListFooterComponent={
            searchQuery.isFetchingNextPage ? (
              <ActivityIndicator className="py-5" />
            ) : null
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
              void searchQuery.fetchNextPage();
            }
          }}
        />
      ) : (
        <RecentSearchChips
          keywords={recentSearches}
          onSelect={submitSearch}
          onRemove={removeRecentSearch}
          onClearAll={clearRecentSearches}
        />
      )}
    </SafeAreaView>
  );
}
