import CommunityPostCard from "@/components/community/CommunityPostCard";
import SearchIconButton from "@/components/common/SearchIconButton";
import { useCommunity } from "@/context/CommunityContext";
import type { CommunityPost } from "@/types/community";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CommunityTab = "all" | "mine" | "shared";

const TABS: { key: CommunityTab; label: string }[] = [
  { key: "all", label: "전체 글" },
  { key: "mine", label: "내 글" },
  { key: "shared", label: "공유됨" },
];

export default function Community() {
  const { posts } = useCommunity();
  const [selectedTab, setSelectedTab] = useState<CommunityTab>("all");

  const visiblePosts = useMemo(() => {
    if (selectedTab === "mine") return posts.filter((post) => post.mine);
    if (selectedTab === "shared") {
      return posts.filter((post) => post.attachments.length > 0);
    }
    return posts;
  }, [posts, selectedTab]);

  const openPost = (post: CommunityPost) => {
    router.push({
      pathname: "/(tabs)/(community)/post/[id]",
      params: { id: post.id },
    });
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
        data={visiblePosts}
        keyExtractor={(post) => post.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: 11,
          paddingBottom: 20,
        }}
        renderItem={({ item }) => (
          <CommunityPostCard post={item} onPress={() => openPost(item)} />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-body text-label-alternative">
              표시할 게시물이 없어요.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
