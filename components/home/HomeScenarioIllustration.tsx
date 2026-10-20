import PizzaIllustration from "@/assets/home-pizza.svg";
import StyledImage from "@/components/common/StyledImage";
import { useState } from "react";
import { View } from "react-native";

interface HomeScenarioIllustrationProps {
  categoryIconUrl?: string | null;
}

/** 추천 카드에는 카테고리 일러스트를 표시하고, 없거나 실패하면 디자인 기본 이미지를 쓴다. */
export default function HomeScenarioIllustration({
  categoryIconUrl,
}: HomeScenarioIllustrationProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const canShowCategoryIcon = Boolean(
    categoryIconUrl && categoryIconUrl !== failedImageUrl,
  );

  return (
    <View
      pointerEvents="none"
      className="absolute -right-[39px] top-[42px] size-[119px]"
    >
      {canShowCategoryIcon ? (
        <StyledImage
          source={categoryIconUrl}
          className="size-full"
          contentFit="contain"
          cachePolicy="memory-disk"
          onError={() => setFailedImageUrl(categoryIconUrl ?? null)}
        />
      ) : (
        <PizzaIllustration />
      )}
    </View>
  );
}
