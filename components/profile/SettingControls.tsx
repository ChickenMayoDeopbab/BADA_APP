import { PALETTE, SEMANTIC_COLORS } from "@/design-system/colors";
import { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

const settingCardShadow = {
  boxShadow: `0px 0px 3.4px 0px ${PALETTE.common[100]}14`,
} as const;

export function SettingSectionLabel({ children }: { children: string }) {
  return (
    <Text className="px-1 font-medium text-body text-label-alternative">
      {children}
    </Text>
  );
}

export function SettingCard({ children }: { children: ReactNode }) {
  return (
    <View
      className="w-full rounded-component bg-background-normal"
      style={settingCardShadow}
    >
      <View className="w-full overflow-hidden rounded-component">
        {children}
      </View>
    </View>
  );
}

interface SettingRowProps {
  label: string;
  children: ReactNode;
  onPress?: () => void;
}

export function SettingRow({ label, children, onPress }: SettingRowProps) {
  const content = (
    <>
      <Text className="font-medium text-headline2 text-label-normal">
        {label}
      </Text>
      {children}
    </>
  );

  if (!onPress) {
    return (
      <View className="h-14 w-full flex-row items-center justify-between px-[22px]">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-14 w-full flex-row items-center justify-between px-[22px] active:bg-fill-pressed"
    >
      {content}
    </Pressable>
  );
}

export function RadioIndicator({ selected }: { selected: boolean }) {
  return (
    <View className="items-center justify-center border-2 size-6 rounded-pill border-line-normal">
      {selected && <View className="size-[15px] rounded-pill bg-primary-normal" />}
    </View>
  );
}

interface SettingToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}

const TOGGLE_TRACK_WIDTH = 42;
const TOGGLE_TRACK_HEIGHT = 24;
const TOGGLE_THUMB_SIZE = 20;
const TOGGLE_THUMB_INSET = 2;
const TOGGLE_THUMB_TRAVEL =
  TOGGLE_TRACK_WIDTH - TOGGLE_THUMB_SIZE - TOGGLE_THUMB_INSET * 2;

export function SettingToggle({
  value,
  onValueChange,
  disabled = false,
  label,
}: SettingToggleProps) {
  const thumbPosition = useRef(
    new Animated.Value(value ? TOGGLE_THUMB_TRAVEL : 0),
  ).current;

  useEffect(() => {
    thumbPosition.stopAnimation();
    const animation = Animated.timing(thumbPosition, {
      toValue: value ? TOGGLE_THUMB_TRAVEL : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        thumbPosition.setValue(value ? TOGGLE_THUMB_TRAVEL : 0);
      }
    });

    return () => animation.stop();
  }, [thumbPosition, value]);

  const trackClassName = disabled
    ? "bg-fill-alternative opacity-50"
    : value
      ? "bg-primary-normal"
      : "bg-fill-alternative";

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={`relative overflow-hidden ${trackClassName}`}
      style={{
        width: TOGGLE_TRACK_WIDTH,
        height: TOGGLE_TRACK_HEIGHT,
        borderRadius: TOGGLE_TRACK_HEIGHT / 2,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: TOGGLE_THUMB_INSET,
          top: TOGGLE_THUMB_INSET,
          width: TOGGLE_THUMB_SIZE,
          height: TOGGLE_THUMB_SIZE,
          borderRadius: TOGGLE_THUMB_SIZE / 2,
          backgroundColor: SEMANTIC_COLORS.background.normal,
          transform: [{ translateX: thumbPosition }],
        }}
      />
    </Pressable>
  );
}
