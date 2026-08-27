import type { CommunityReactionKind } from "@/api/types";
import { Pressable, Text } from "react-native";

const REACTION_LABELS: Record<CommunityReactionKind, string> = {
  CHEER: "힘내요",
  RELATE: "공감돼요",
  LIKE: "좋아요",
};

const REACTION_EMOJIS: Record<CommunityReactionKind, string> = {
  CHEER: "👍",
  RELATE: "🥺",
  LIKE: "❤️",
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
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${REACTION_LABELS[type]} ${count}`}
      accessibilityState={{ disabled: loading, selected }}
      disabled={!onPress || loading}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-1 rounded-[10px] px-1.5 py-1 ${
        compact ? "" : "h-9 w-[94px]"
      } ${
        selected ? "bg-primary-normal" : "bg-transparent"
      } ${loading ? "opacity-60" : ""}`}
    >
      <Text style={{ fontSize: compact ? 20 : 22 }}>{REACTION_EMOJIS[type]}</Text>
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
