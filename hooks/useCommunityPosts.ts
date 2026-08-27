import {
  getCommunityComments,
  getCommunityPost,
  getCommunityPosts,
  getMyCommunityPosts,
} from "@/api/communityApi";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";

const COMMUNITY_PAGE_SIZE = 20;

export type CommunityPostListMode = "all" | "mine";

interface UseCommunityPostsParams {
  mode?: CommunityPostListMode;
  query?: string;
  enabled?: boolean;
  size?: number;
  preservePreviousData?: boolean;
}

export const communityQueryKeys = {
  all: ["community"] as const,
  posts: () => ["community", "posts"] as const,
  postLists: () => ["community", "posts", "list"] as const,
  postList: (mode: CommunityPostListMode, query: string, size: number) =>
    ["community", "posts", "list", { mode, query, size }] as const,
  post: (postId: number) => ["community", "posts", "detail", postId] as const,
  comments: (postId: number) =>
    ["community", "posts", "comments", postId] as const,
};

export const useCommunityPosts = ({
  mode = "all",
  query = "",
  enabled = true,
  size = COMMUNITY_PAGE_SIZE,
  preservePreviousData = false,
}: UseCommunityPostsParams = {}) => {
  const normalizedQuery = query.trim();

  return useInfiniteQuery({
    queryKey: communityQueryKeys.postList(mode, normalizedQuery, size),
    queryFn: ({ pageParam, signal }) => {
      if (mode === "mine") {
        return getMyCommunityPosts({ page: pageParam, size }, signal);
      }

      return getCommunityPosts(
        {
          page: pageParam,
          size,
          q: normalizedQuery || undefined,
        },
        signal,
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    enabled,
    placeholderData: preservePreviousData ? keepPreviousData : undefined,
  });
};

export const useCommunityPost = (postId: number) =>
  useQuery({
    queryKey: communityQueryKeys.post(postId),
    queryFn: ({ signal }) => getCommunityPost(postId, signal),
    enabled: Number.isSafeInteger(postId) && postId > 0,
    refetchOnMount: "always",
  });

export const useCommunityComments = (postId: number) =>
  useQuery({
    queryKey: communityQueryKeys.comments(postId),
    queryFn: ({ signal }) => getCommunityComments(postId, signal),
    enabled: Number.isSafeInteger(postId) && postId > 0,
  });
