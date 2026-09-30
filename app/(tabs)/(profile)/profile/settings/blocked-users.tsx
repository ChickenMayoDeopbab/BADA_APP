import {
  deleteCommunityUserBlock,
  getBlockedCommunityUsers,
} from "@/api/communityApi";
import { CommunityBlockedUserResponse } from "@/api/types";
import CustomButton from "@/components/common/CustomButton";
import LoadingIndicator from "@/components/common/LoadingIndicator";
import Top from "@/components/common/Top";
import CommunityAvatar from "@/components/community/CommunityAvatar";
import { useAppAlert } from "@/context/AppAlertContext";
import { SEMANTIC_COLORS } from "@/design-system";
import { communityQueryKeys } from "@/hooks/useCommunityPosts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLOCKED_USERS_QUERY_KEY = ["community", "blocked-users"] as const;

const getBlockedUserName = (name?: string | null) =>
  name?.trim() || "알 수 없는 사용자";

function BlockedUserRow({
  user,
  isUnblocking,
  onUnblock,
}: {
  user: CommunityBlockedUserResponse;
  isUnblocking: boolean;
  onUnblock: () => void;
}) {
  const name = getBlockedUserName(user.name);

  return (
    <View className="flex-row items-center gap-3 rounded-component bg-background-normal px-4 py-4">
      <CommunityAvatar
        author={{
          user_id: user.user_id,
          name: user.name,
          profile_image_url: user.profile_image_url,
        }}
        size={48}
      />

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-body font-bold text-label-normal"
        >
          {name}
        </Text>
        <Text className="mt-0.5 text-caption text-label-alternative">
          차단된 사용자
        </Text>
      </View>

      <View className="w-[88px]">
        <CustomButton
          label={isUnblocking ? "해제 중" : "차단 해제"}
          variant="sm"
          tone="neutral"
          disabled={isUnblocking}
          onPress={onUnblock}
        />
      </View>
    </View>
  );
}

export default function BlockedUsersSettingsScreen() {
  const { showAlert } = useAppAlert();
  const queryClient = useQueryClient();
  const blockedUsersQuery = useQuery({
    queryKey: BLOCKED_USERS_QUERY_KEY,
    queryFn: ({ signal }) => getBlockedCommunityUsers(signal),
  });
  const unblockMutation = useMutation({
    mutationFn: (user: CommunityBlockedUserResponse) =>
      deleteCommunityUserBlock(user.user_id),
    onSuccess: (_, user) => {
      queryClient.setQueryData(
        BLOCKED_USERS_QUERY_KEY,
        (current: { blocked_users: CommunityBlockedUserResponse[] } | undefined) =>
          current
            ? {
                blocked_users: current.blocked_users.filter(
                  (item) => item.user_id !== user.user_id,
                ),
              }
            : current,
      );
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.postLists(),
      });
    },
    onError: () => {
      showAlert({
        title: "차단을 해제하지 못했어요",
        description: "네트워크 상태를 확인하고 다시 시도해 주세요.",
      });
    },
  });

  const confirmUnblock = (user: CommunityBlockedUserResponse) => {
    showAlert({
      title: `${getBlockedUserName(user.name)}님의 차단을 해제할까요?`,
      description: "차단을 해제하면 해당 사용자의 게시글과 댓글이 다시 표시됩니다.",
      cancelLabel: "취소",
      confirmLabel: "해제하기",
      onConfirm: () => unblockMutation.mutate(user),
    });
  };

  const blockedUsers = blockedUsersQuery.data?.blocked_users ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <Top title="차단 사용자 관리" back safeArea={false} />

      {blockedUsersQuery.isPending ? (
        <View className="flex-1 items-center justify-center bg-background-alternative">
          <LoadingIndicator />
        </View>
      ) : blockedUsersQuery.isError ? (
        <View className="flex-1 items-center justify-center gap-4 bg-background-alternative px-8">
          <Text className="text-center text-body text-label-alternative">
            차단 사용자 목록을 불러오지 못했어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-control bg-primary-normal px-5 py-3"
            onPress={() => void blockedUsersQuery.refetch()}
          >
            <Text className="text-label font-bold text-label-buttonText">
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          className="flex-1 bg-background-alternative"
          data={blockedUsers}
          keyExtractor={(item) => String(item.user_id)}
          contentContainerClassName="grow gap-3 px-8 py-6"
          renderItem={({ item }) => (
            <BlockedUserRow
              user={item}
              isUnblocking={
                unblockMutation.isPending &&
                unblockMutation.variables?.user_id === item.user_id
              }
              onUnblock={() => confirmUnblock(item)}
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-3">
              <View className="size-16 items-center justify-center rounded-[24px] bg-fill-normal">
                <Ionicons
                  name="people-outline"
                  size={32}
                  color={SEMANTIC_COLORS.line.normal}
                />
              </View>
              <Text className="text-headline2 font-bold text-label-normal">
                차단한 사용자가 없어요
              </Text>
              <Text className="text-center text-label leading-6 text-label-alternative">
                차단한 사용자가 생기면 이곳에서 관리할 수 있어요.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
