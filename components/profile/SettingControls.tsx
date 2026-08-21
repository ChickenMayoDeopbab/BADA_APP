import { PALETTE } from "@/design-system/colors";
import { ReactNode, useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

const settingCardShadow = {
  boxShadow: `0px 0px 3.4px 0px ${PALETTE.common[100]}14`,
} as const;

export function SettingSectionLabel({ children }: { children: string }) {
  return (
    <Text className="px-1 text-body font-medium text-label-alternative">
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
      <Text className="text-headline2 font-medium text-label-normal">
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
    <View className="size-6 items-center justify-center rounded-pill border-2 border-line-normal">
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

export function SettingToggle({
  value,
  onValueChange,
  disabled = false,
  label,
}: SettingToggleProps) {
  const thumbPosition = useRef(new Animated.Value(value ? 18 : 0)).current;

  useEffect(() => {
    Animated.spring(thumbPosition, {
      toValue: value ? 18 : 0,
      damping: 18,
      stiffness: 220,
      mass: 0.7,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
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
      className={`relative h-6 w-[42px] overflow-hidden rounded-pill ${trackClassName}`}
    >
      <Animated.View
        className="absolute left-0.5 top-0.5 size-5 rounded-pill bg-background-normal"
        style={{ transform: [{ translateX: thumbPosition }] }}
      />
    </Pressable>
  );
}
