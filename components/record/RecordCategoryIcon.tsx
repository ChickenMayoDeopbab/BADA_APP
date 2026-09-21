import StyledImage from "@/components/common/StyledImage";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { View } from "react-native";

export default function RecordCategoryIcon({
  categoryIconUrl,
}: {
  categoryIconUrl?: string | null;
}) {
  const iconUrl = categoryIconUrl?.trim();
  const [failedIconUrl, setFailedIconUrl] = useState<string | null>(null);
  const showRemoteIcon = Boolean(iconUrl && failedIconUrl !== iconUrl);

  return (
    <View
      className="size-[46px] items-center justify-center rounded-component"
      style={{ backgroundColor: SEMANTIC_COLORS.record.iconBackground }}
    >
      {showRemoteIcon ? (
        <StyledImage
          source={{ uri: iconUrl }}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={iconUrl}
          className="size-[26px]"
          onError={() => setFailedIconUrl(iconUrl ?? null)}
        />
      ) : (
        <Ionicons
          name="call-outline"
          size={24}
          color={SEMANTIC_COLORS.label.alternative}
        />
      )}
    </View>
  );
}
