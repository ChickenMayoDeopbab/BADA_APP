import CommunityPostCard from "@/components/community/CommunityPostCard";
import SearchBox from "@/components/common/SearchBox";
import RecentSearchChips from "@/components/train/RecentSearchChips";
import { COMMUNITY_RECENT_SEARCHES } from "@/constants/community";
import { useCommunity } from "@/context/CommunityContext";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunitySearchScreen() {
  const { posts } = useCommunity();
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [recentSearches, setRecentSearches] = useState(
    COMMUNITY_RECENT_SEARCHES,
  );

  const results = useMemo(() => {
    const query = submittedKeyword.trim().toLocaleLowerCase("ko");
    if (!query) return [];
    return posts.filter(
      (post) =>
        post.title.toLocaleLowerCase("ko").includes(query) ||
        post.body.toLocaleLowerCase("ko").includes(query),
    );
  }, [posts, submittedKeyword]);

  const submitSearch = (nextKeyword: string) => {
    const trimmed = nextKeyword.trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    setSubmittedKeyword(trimmed);
    setRecentSearches((current) => [
      trimmed,
      ...current.filter((item) => item !== trimmed),
    ]);
  };

  const changeKeyword = (value: string) => {
    setKeyword(value);
    if (!value.trim()) setSubmittedKeyword("");
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
            onChangeText={changeKeyword}
            onSubmitEditing={() => submitSearch(keyword)}
            onSearch={() => submitSearch(keyword)}
          />
        </View>
      </View>

      {submittedKeyword ? (
        <FlatList
          data={results}
          keyExtractor={(post) => post.id}
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
                  params: { id: item.id },
                })
              }
            />
          )}
          ListEmptyComponent={
            <Text className="py-16 text-center text-body text-label-alternative">
              검색 결과가 없어요.
            </Text>
          }
        />
      ) : (
        <RecentSearchChips
          keywords={recentSearches}
          onSelect={submitSearch}
          onRemove={(target) =>
            setRecentSearches((current) =>
              current.filter((item) => item !== target),
            )
          }
          onClearAll={() => setRecentSearches([])}
        />
      )}
    </SafeAreaView>
  );
}
