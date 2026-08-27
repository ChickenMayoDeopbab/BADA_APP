import CommunityPostCard from "@/components/community/CommunityPostCard";
import SearchIconButton from "@/components/common/SearchIconButton";
import { getApiErrorMessage } from "@/api/error";
import type { CommunityPostSummary } from "@/api/types";
import {
  CommunityPostListMode,
  useCommunityPosts,
} from "@/hooks/useCommunityPosts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CommunityTab = CommunityPostListMode | "shared";

const TABS: { key: CommunityTab; label: string }[] = [
  { key: "all", label: "전체 글" },
  { key: "mine", label: "내 글" },
  { key: "shared", label: "공유됨" },
];

export default function Community() {
  const [selectedTab, setSelectedTab] = useState<CommunityTab>("all");
  const postsQuery = useCommunityPosts({
    mode: selectedTab === "mine" ? "mine" : "all",
    enabled: selectedTab !== "shared",
  });

  const posts = useMemo(
    () =>
      selectedTab === "shared"
        ? []
        : (postsQuery.data?.pages.flatMap((page) => page.posts) ?? []),
    [postsQuery.data, selectedTab],
  );

  const openPost = (post: CommunityPostSummary) => {
    router.push({
      pathname: "/(tabs)/(community)/post/[id]",
      params: { id: String(post.post_id) },
    });
  };

  const emptyContent = () => {
    if (selectedTab === "shared") {
      return (
        <View className="items-center justify-center px-8 py-20">
          <Ionicons
            name="share-social-outline"
            size={34}
            color="#BDBEBE"
          />
          <Text className="mt-3 text-body font-medium text-label-alternative">
            공유 기능을 준비하고 있어요.
          </Text>
          <Text className="mt-1 text-center text-caption text-line-normal">
            첨부 API가 연결되면 공유된 게시물이 여기에 표시돼요.
          </Text>
        </View>
      );
    }

    if (postsQuery.isPending) {
      return (
        <View className="items-center justify-center py-20">
          <ActivityIndicator />
          <Text className="mt-3 text-body text-label-alternative">
            게시물을 불러오는 중이에요.
          </Text>
        </View>
      );
    }

    if (postsQuery.isError) {
      return (
        <View className="items-center justify-center px-8 py-20">
          <Text className="text-center text-body text-label-alternative">
            {getApiErrorMessage(
              postsQuery.error,
              "게시물을 불러오지 못했어요.",
            )}
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
      );
    }

    return (
      <View className="items-center justify-center py-20">
        <Text className="text-body text-label-alternative">
          표시할 게시물이 없어요.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-alternative">
      <View className="h-[60px] flex-row items-center justify-between px-8">
        <Text className="text-title2 font-bold text-label-normal">커뮤니티</Text>
        <SearchIconButton
          onPress={() => router.push("/(tabs)/(community)/search")}
          size={30}
        />
      </View>

      <View className="h-[53px] flex-row items-start gap-x-[15px] px-8">
        {TABS.map((tab) => {
          const selected = tab.key === selectedTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              className="items-center gap-y-1.5"
            >
              <Text
                className={`text-headline2 font-medium ${
                  selected ? "text-green-40" : "text-line-normal"
                }`}
              >
                {tab.label}
              </Text>
              <View
                className={`h-0.5 w-full ${
                  selected ? "bg-green-40" : "bg-transparent"
                }`}
              />
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.post_id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: 11,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => (
          <CommunityPostCard post={item} onPress={() => openPost(item)} />
        )}
        ListEmptyComponent={emptyContent}
        ListFooterComponent={
          selectedTab !== "shared" && postsQuery.isFetchingNextPage ? (
            <ActivityIndicator className="py-5" />
          ) : null
        }
        refreshing={
          selectedTab !== "shared" &&
          postsQuery.isRefetching &&
          !postsQuery.isFetchingNextPage
        }
        onRefresh={
          selectedTab === "shared"
            ? undefined
            : () => void postsQuery.refetch()
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (
            selectedTab !== "shared" &&
            postsQuery.hasNextPage &&
            !postsQuery.isFetchingNextPage
          ) {
            void postsQuery.fetchNextPage();
          }
        }}
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
        <Ionicons name="pencil" size={29} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
