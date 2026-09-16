import StyledImage from "@/components/common/StyledImage";
import { SEMANTIC_COLORS } from "@/design-system";
import { View } from "react-native";

export default function RecordCategoryIcon({
  categoryIconUrl,
}: {
  categoryIconUrl?: string | null;
}) {
  const iconUrl = categoryIconUrl?.trim();

  return (
    <View
      className="size-[46px] items-center justify-center rounded-component"
      style={{ backgroundColor: SEMANTIC_COLORS.record.iconBackground }}
    >
      {iconUrl ? (
        <StyledImage
          source={{ uri: iconUrl }}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={iconUrl}
          className="size-[26px]"
        />
      ) : null}
    </View>
  );
}
