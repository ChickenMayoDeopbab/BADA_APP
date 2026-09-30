# Bada design-system foundation

이 폴더는 Figma 디자인 시스템의 색상, 타이포그래피, radius와 화면에서 확인한 효과를 코드에서 공유하기 위한 기반입니다. 화면에는 역할이 드러나는 토큰을 우선 적용합니다.

## Color

화면에서는 색상의 숫자 이름보다 역할이 드러나는 semantic color를 우선 사용합니다.

```tsx
import { SEMANTIC_COLORS } from "@/design-system";

<Ionicons color={SEMANTIC_COLORS.label.alternative} />;
```

NativeWind에서는 같은 이름을 다음처럼 사용합니다.

```tsx
<Text className="text-label-normal">기본 텍스트</Text>
<View className="bg-primary-normal" />
<View className="border-line-normal" />
```

피그마 TextField의 채움색은 `fill.field` (`bg-fill-field`)를 사용합니다.

Primitive palette도 `neutral-5`, `green-50` 등의 이름으로 등록되어 있지만, 새로운 UI에는 semantic color를 우선합니다.

## Typography

앱의 기본 글꼴은 Pretendard입니다. 기존 `font-medium`, `font-bold`는 그대로 굵기 역할을 합니다.

```tsx
<Text className="text-body font-medium">본문</Text>
<Text className="text-headline1 font-bold">제목</Text>
```

사용 가능한 hierarchy는 다음과 같습니다.

- `text-display1`, `text-display2`
- `text-title1`, `text-title2`
- `text-headline1`, `text-headline2`
- `text-body`, `text-label`, `text-caption`

각 hierarchy에는 Figma 기준 130% line height와 -2% letter spacing이 포함됩니다.

## Radius

- `rounded-control`: 8
- `rounded-component`: 12
- `rounded-card`: 20
- `rounded-dialog`: 24
- `rounded-pill`: 999

## Effect

카드 그림자는 피그마에 반복되는 강도에 따라 `ELEVATED_CARD_SHADOW`(홈·추천 훈련), `SURFACE_CARD_SHADOW`(목록·커뮤니티·프로필), `SUBTLE_CARD_SHADOW`(기록 상세·리포트)를 사용합니다. iOS, Android, Web에 같은 디자인 값을 적용합니다.

폰트는 네이티브 빌드에 포함되므로 설정을 처음 적용한 뒤에는 development build를 다시 생성해야 합니다.
