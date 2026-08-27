import aiApiClient from "./aiClient";
import {
  CommunityCommentCreateRequest,
  CommunityCommentListResponse,
  CommunityCommentResponse,
  CommunityCommentUpdateRequest,
  CommunityPostCreateRequest,
  CommunityPostDetailResponse,
  CommunityPostListResponse,
  CommunityPostUpdateRequest,
  CommunityReactionRequest,
  CommunityReactionStateResponse,
  GetCommunityPostsParams,
  GetMyCommunityPostsParams,
} from "./types";

const COMMUNITY_POSTS_PATH = "/api/v1/community/posts";

/** 커뮤니티 게시글 작성 */
export const postCommunityPost = async (
  data: CommunityPostCreateRequest,
): Promise<CommunityPostDetailResponse> => {
  const response = await aiApiClient.post<CommunityPostDetailResponse>(
    COMMUNITY_POSTS_PATH,
    data,
  );
  return response.data;
};

/** 커뮤니티 게시글 목록 조회 및 검색 */
export const getCommunityPosts = async (
  params: GetCommunityPostsParams = {},
  signal?: AbortSignal,
): Promise<CommunityPostListResponse> => {
  const response = await aiApiClient.get<CommunityPostListResponse>(
    COMMUNITY_POSTS_PATH,
    { params, signal },
  );
  return response.data;
};

/** 커뮤니티 게시글 단건 조회 */
export const getCommunityPost = async (
  postId: number,
  signal?: AbortSignal,
): Promise<CommunityPostDetailResponse> => {
  const response = await aiApiClient.get<CommunityPostDetailResponse>(
    `${COMMUNITY_POSTS_PATH}/${postId}`,
    { signal },
  );
  return response.data;
};

/** 커뮤니티 게시글 수정 */
export const patchCommunityPost = async (
  postId: number,
  data: CommunityPostUpdateRequest,
): Promise<CommunityPostDetailResponse> => {
  const response = await aiApiClient.patch<CommunityPostDetailResponse>(
    `${COMMUNITY_POSTS_PATH}/${postId}`,
    data,
  );
  return response.data;
};

/** 커뮤니티 게시글 삭제 */
export const deleteCommunityPost = async (postId: number): Promise<void> => {
  await aiApiClient.delete(`${COMMUNITY_POSTS_PATH}/${postId}`);
};

/** 게시글 공감 등록 또는 종류 변경 */
export const putCommunityReaction = async (
  postId: number,
  data: CommunityReactionRequest,
): Promise<CommunityReactionStateResponse> => {
  const response = await aiApiClient.put<CommunityReactionStateResponse>(
    `${COMMUNITY_POSTS_PATH}/${postId}/reaction`,
    data,
  );
  return response.data;
};

/** 게시글 공감 취소 */
export const deleteCommunityReaction = async (
  postId: number,
): Promise<void> => {
  await aiApiClient.delete(`${COMMUNITY_POSTS_PATH}/${postId}/reaction`);
};

/** 게시글 댓글 또는 답글 작성 */
export const postCommunityComment = async (
  postId: number,
  data: CommunityCommentCreateRequest,
): Promise<CommunityCommentResponse> => {
  const response = await aiApiClient.post<CommunityCommentResponse>(
    `${COMMUNITY_POSTS_PATH}/${postId}/comments`,
    data,
  );
  return response.data;
};

/** 게시글 댓글과 답글 조회 */
export const getCommunityComments = async (
  postId: number,
  signal?: AbortSignal,
): Promise<CommunityCommentListResponse> => {
  const response = await aiApiClient.get<CommunityCommentListResponse>(
    `${COMMUNITY_POSTS_PATH}/${postId}/comments`,
    { signal },
  );
  return response.data;
};

/** 댓글 또는 답글 수정 */
export const patchCommunityComment = async (
  commentId: number,
  data: CommunityCommentUpdateRequest,
): Promise<CommunityCommentResponse> => {
  const response = await aiApiClient.patch<CommunityCommentResponse>(
    `/api/v1/community/comments/${commentId}`,
    data,
  );
  return response.data;
};

/** 댓글 또는 답글 삭제 */
export const deleteCommunityComment = async (
  commentId: number,
): Promise<void> => {
  await aiApiClient.delete(`/api/v1/community/comments/${commentId}`);
};

/** 로그인 사용자가 작성한 커뮤니티 게시글 조회 */
export const getMyCommunityPosts = async (
  params: GetMyCommunityPostsParams = {},
  signal?: AbortSignal,
): Promise<CommunityPostListResponse> => {
  const response = await aiApiClient.get<CommunityPostListResponse>(
    "/api/v1/community/me/posts",
    { params, signal },
  );
  return response.data;
};
