import type { CommunityReactionKey } from "@/types/community";
import { Pressable, Text } from "react-native";

const REACTION_LABELS: Record<CommunityReactionKey, string> = {
  cheer: "힘내요",
  empathy: "공감돼요",
  like: "좋아요",
};

const REACTION_EMOJIS: Record<CommunityReactionKey, string> = {
  cheer: "👍",
  empathy: "🥺",
  like: "❤️",
};

interface ReactionPillProps {
  type: CommunityReactionKey;
  count: number;
  compact?: boolean;
  selected?: boolean;
  onPress?: () => void;
}

export default function ReactionPill({
  type,
  count,
  compact = false,
  selected = false,
  onPress,
}: ReactionPillProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${REACTION_LABELS[type]} ${count}`}
      disabled={!onPress}
      onPress={onPress}
      className={`flex-row items-center gap-1 rounded-[10px] px-1.5 py-1 ${
        selected ? "bg-primary-normal" : "bg-transparent"
      }`}
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
