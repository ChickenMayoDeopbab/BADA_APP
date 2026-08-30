import CustomButton from "@/components/common/CustomButton";
import StyledImage from "@/components/common/StyledImage";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PhotoLibrarySheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (uri: string, fileName?: string) => void;
}

type LibraryState = "loading" | "ready" | "denied" | "unavailable" | "error";

export default function PhotoLibrarySheet({
  visible,
  onClose,
  onSelect,
}: PhotoLibrarySheetProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaLibrary.Asset | null>(
    null,
  );
  const [libraryState, setLibraryState] = useState<LibraryState>("loading");
  const [isApplying, setIsApplying] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const selectionRequest = useRef(0);

  const tileSize = (width - 4) / 3;

  const loadPhotos = useCallback(async () => {
    setLibraryState("loading");

    try {
      if (!(await MediaLibrary.isAvailableAsync())) {
        setLibraryState("unavailable");
        return;
      }

      let permission = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
      if (permission.status !== "granted") {
        permission = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      }

      if (permission.status !== "granted") {
        setLibraryState("denied");
        return;
      }

      const result = await MediaLibrary.getAssetsAsync({
        first: 90,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        resolveWithFullInfo: Platform.OS === "android",
      });

      setAssets(result.assets.filter((asset) => asset.mediaType === "photo"));
      setLibraryState("ready");
    } catch {
      setLibraryState("error");
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(height);
    setSelectedAsset(null);
    setIsApplying(false);
    setSelectionError("");
    void loadPhotos();

    const animationFrame = requestAnimationFrame(() => {
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 230,
        mass: 0.85,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      selectionRequest.current += 1;
    };
  }, [height, loadPhotos, translateY, visible]);

  const dismiss = () => {
    selectionRequest.current += 1;
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const confirmSelection = async () => {
    if (!selectedAsset || isApplying) return;

    setIsApplying(true);
    setSelectionError("");
    const request = ++selectionRequest.current;
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(selectedAsset, {
        shouldDownloadFromNetwork: true,
      });
      if (request !== selectionRequest.current) return;
      const uri = assetInfo.localUri ?? assetInfo.uri ?? selectedAsset.uri;
      // ph://는 갤러리 미리보기용 식별자이며 multipart 업로드할 수 없습니다.
      if (!/^(file|content):\/\//i.test(uri)) {
        throw new Error("사진의 로컬 파일을 읽지 못했습니다.");
      }
      onSelect(uri, assetInfo.filename ?? selectedAsset.filename);
      dismiss();
    } catch {
      if (request === selectionRequest.current) {
        setSelectionError("사진을 준비하지 못했어요. 다시 선택하거나 다운로드 후 시도해주세요.");
      }
    } finally {
      if (request === selectionRequest.current) setIsApplying(false);
    }
  };

  const renderAsset = ({ item }: { item: MediaLibrary.Asset }) => {
    const selected = selectedAsset?.id === item.id;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.filename} 사진 선택`}
        accessibilityState={{ selected }}
        disabled={isApplying}
        onPress={() => {
          setSelectedAsset(item);
          setSelectionError("");
        }}
        className="relative"
        style={{ width: tileSize, height: tileSize }}
      >
        <StyledImage
          source={{ uri: item.uri }}
          contentFit="cover"
          className="absolute inset-0 size-full"
          transition={100}
        />
        {selected && (
          <View className="absolute inset-0 items-end bg-label-normal/10 p-2">
            <View className="size-7 items-center justify-center rounded-pill border-2 border-background-normal bg-primary-normal">
              <Ionicons
                name="checkmark"
                size={18}
                color={SEMANTIC_COLORS.background.normal}
              />
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const emptyState = () => {
    if (libraryState === "loading") {
      return (
        <View className="flex-1 items-center justify-center gap-[10px] px-8">
          <ActivityIndicator
            size="small"
            color={SEMANTIC_COLORS.primary.normal}
          />
        </View>
      );
    }

    const message =
      libraryState === "denied"
        ? "사진을 보려면 사진 보관함 접근 권한이 필요해요."
        : libraryState === "unavailable"
          ? "이 기기에서는 사진 보관함을 사용할 수 없어요."
          : libraryState === "error"
            ? "사진을 불러오지 못했어요."
            : "사진 보관함이 비어 있어요.";

    return (
      <View className="flex-1 items-center justify-center gap-[10px] px-8">
        <Ionicons
          name="images-outline"
          size={34}
          color={SEMANTIC_COLORS.line.normal}
        />
        <Text className="text-center text-label text-label-alternative">
          {message}
        </Text>
        {(libraryState === "denied" || libraryState === "error") && (
          <View className="mt-1 w-[120px]">
            <CustomButton
              label="다시 시도"
              variant="md"
              tone="neutral"
              onPress={() => void loadPhotos()}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={dismiss}
    >
      <View className="flex-1 justify-end bg-common-100/30">
        <Pressable
          accessibilityLabel="사진 선택 닫기"
          onPress={dismiss}
          className="absolute inset-0"
        />
        <Animated.View
          style={{
            height: Math.min(height * 0.62, 560),
            transform: [{ translateY }],
          }}
        >
          <View
            className="h-full overflow-hidden rounded-t-dialog bg-background-normal"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <View className="mt-2 h-1 w-[42px] self-center rounded-pill bg-line-neutral" />
            <View className="h-[54px] flex-row items-center justify-between px-[18px]">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={dismiss}
                hitSlop={10}
                className="min-h-[42px] min-w-[42px] items-center justify-center active:opacity-70"
              >
                <Ionicons
                  name="close"
                  size={26}
                  color={SEMANTIC_COLORS.label.neutral}
                />
              </Pressable>
              <Text className="text-headline2 font-bold text-label-normal">
                사진 선택
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="선택한 사진 적용"
                accessibilityState={{ disabled: !selectedAsset || isApplying }}
                disabled={!selectedAsset || isApplying}
                onPress={() => void confirmSelection()}
                hitSlop={10}
                className="min-h-[42px] min-w-[42px] items-center justify-center"
              >
                <Text
                  className={
                    selectedAsset && !isApplying
                      ? "text-body font-bold text-primary-normal"
                      : "text-body font-bold text-line-normal"
                  }
                >
                  {isApplying ? "적용 중" : "완료"}
                </Text>
              </Pressable>
            </View>

            {selectionError ? (
              <Text accessibilityLiveRegion="polite" className="px-4 pb-3 text-caption text-status-error">
                {selectionError}
              </Text>
            ) : null}
            {libraryState === "ready" && assets.length > 0 ? (
              <FlatList
                className="flex-1"
                data={assets}
                keyExtractor={(item) => item.id}
                renderItem={renderAsset}
                numColumns={3}
                columnWrapperClassName="mb-[2px] gap-[2px]"
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={Platform.OS === "android"}
              />
            ) : (
              emptyState()
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
