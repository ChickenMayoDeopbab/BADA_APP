import type { CommunityReactionKind } from "@/api/types";
import CheerReactionIcon from "@/assets/community/reaction-cheer.svg";
import LikeReactionIcon from "@/assets/community/reaction-like.svg";
import RelateReactionIcon from "@/assets/community/reaction-relate.svg";
import { Pressable, Text, View } from "react-native";

const REACTION_LABELS: Record<CommunityReactionKind, string> = {
  CHEER: "힘내요",
  RELATE: "공감돼요",
  LIKE: "좋아요",
};

const REACTION_ICONS = {
  CHEER: CheerReactionIcon,
  RELATE: RelateReactionIcon,
  LIKE: LikeReactionIcon,
};

interface ReactionPillProps {
  type: CommunityReactionKind;
  count: number;
  compact?: boolean;
  selected?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

export default function ReactionPill({
  type,
  count,
  compact = false,
  selected = false,
  loading = false,
  onPress,
}: ReactionPillProps) {
  const ReactionIcon = REACTION_ICONS[type];
  const iconContainerSize = compact ? 20 : 22;
  const iconSize =
    type === "RELATE" ? iconContainerSize * 0.875 : iconContainerSize;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${REACTION_LABELS[type]} ${count}`}
      accessibilityState={{ disabled: loading, selected }}
      disabled={!onPress || loading}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-1 rounded-[10px] px-1.5 py-1 ${
        compact ? "" : "h-9 w-[94px] border border-[#F0F0F0]"
      } ${
        selected ? "bg-primary-normal" : "bg-transparent"
      }`}
    >
      <View
        className="items-center justify-center"
        style={{ width: iconContainerSize, height: iconContainerSize }}
      >
        <ReactionIcon width={iconSize} height={iconSize} />
      </View>
      {!compact && (
        <Text
          className={`text-label font-medium ${
            selected ? "text-label-buttonText" : "text-label-alternative"
          }`}
        >
          {REACTION_LABELS[type]}
        </Text>
      )}
      <Text
        className={`text-label font-medium ${
          selected ? "text-label-buttonText" : "text-label-alternative"
        }`}
      >
        {count}
      </Text>
    </Pressable>
  );
}
