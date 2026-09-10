import { CALL_DELAY_MINUTES } from "@/constants/train";
import { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from "react-native";

const ITEM_HEIGHT = 44; // 휠 한 칸 높이
const VISIBLE_COUNT = 5; // 화면에 보이는 칸 수 (가운데가 선택 값)
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PADDING_COUNT = Math.floor(VISIBLE_COUNT / 2);
/** 칸마다 정확히 멈출 오프셋 — snapToInterval은 딱 떨어지지 않고 멈추는 경우가 있다 */
const SNAP_OFFSETS = CALL_DELAY_MINUTES.map((minute) => minute * ITEM_HEIGHT);

interface MinuteWheelProps {
  label: string;
  value: number;
  onChange: (minute: number) => void;
}

/** 분 단위 값을 고르는 세로 휠 (스크롤 스냅) */
function MinuteWheel({ label, value, onChange }: MinuteWheelProps) {
  const [focusedMinute, setFocusedMinute] = useState(value);
  const scrollRef = useRef<ScrollView>(null);
  // 초기 스크롤 위치를 한 번만 맞추기 위한 플래그
  const isInitializedRef = useRef(false);

  /** 스크롤 위치 → 가장 가까운 칸의 분 값 */
  const getMinuteAt = (offsetY: number): number => {
    const index = Math.round(offsetY / ITEM_HEIGHT);
    return Math.max(0, Math.min(CALL_DELAY_MINUTES.length - 1, index));
  };

  /** 스크롤 중 강조 표시용 — 칸이 실제로 바뀔 때만 리렌더한다 */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const minute = getMinuteAt(event.nativeEvent.contentOffset.y);
    setFocusedMinute((prev) => (prev === minute ? prev : minute));
  };

  /**
   * 멈춘 자리의 값을 확정한다.
   * 스냅은 snapToOffsets에 맡기고 여기서 스크롤 위치를 건드리지 않는다.
   * 예전에는 scrollTo로 직접 보정했는데, 그 보정 스크롤이 다시
   * onMomentumScrollEnd를 불러 보정이 재귀하면서 휠이 멈춰버렸다.
   */
  const commitMinute = (offsetY: number) => {
    const minute = getMinuteAt(offsetY);
    setFocusedMinute(minute);
    onChange(minute);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => commitMinute(event.nativeEvent.contentOffset.y);

  /**
   * 손을 뗐을 때 남은 속도가 없으면 관성 스크롤이 뒤따르지 않아
   * onMomentumScrollEnd가 오지 않는다. 그 경우에만 여기서 확정한다.
   */
  const handleScrollEndDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const velocityY = event.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(velocityY) > 0.01) return;
    commitMinute(event.nativeEvent.contentOffset.y);
  };

  return (
    <View className="flex-1 items-center">
      <Text className="text-label font-medium text-label-alternative mb-3">
        {label}
      </Text>
      <ScrollView
        ref={scrollRef}
        style={{ height: WHEEL_HEIGHT }}
        showsVerticalScrollIndicator={false}
        snapToOffsets={SNAP_OFFSETS}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PADDING_COUNT }}
        onContentSizeChange={() => {
          if (isInitializedRef.current) return;
          isInitializedRef.current = true;
          scrollRef.current?.scrollTo({ y: value * ITEM_HEIGHT, animated: false });
        }}
      >
        {CALL_DELAY_MINUTES.map((minute) => {
          const distance = Math.abs(minute - focusedMinute);
          const isFocused = distance === 0;
          return (
            <View
              key={minute}
              style={{ height: ITEM_HEIGHT, opacity: isFocused ? 1 : distance === 1 ? 0.6 : 0.3 }}
              className="items-center justify-center"
            >
              <Text
                className={
                  isFocused
                    ? "text-title2 font-bold text-primary-normal"
                    : "text-headline1 font-medium text-label-alternative"
                }
              >
                {minute}분
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface MinuteRangePickerProps {
  from: number;
  to: number;
  onChangeFrom: (minute: number) => void;
  onChangeTo: (minute: number) => void;
}

/** 발신 대기 시간을 최소~최대 분 범위로 고르는 휠 피커 */
export default function MinuteRangePicker({
  from,
  to,
  onChangeFrom,
  onChangeTo,
}: MinuteRangePickerProps) {
  return (
    <View className="relative">
      {/* 가운데 선택 영역 강조 — 두 휠에 걸쳐 있어 오버레이로 그린다 */}
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 rounded-component bg-fill-normal"
        style={{ height: ITEM_HEIGHT, top: SELECTION_TOP }}
      />
      <View className="flex-row items-end">
        <MinuteWheel label="최소" value={from} onChange={onChangeFrom} />
        <View style={{ height: WHEEL_HEIGHT }} className="justify-center px-2">
          <Text className="text-headline1 font-medium text-label-alternative">~</Text>
        </View>
        <MinuteWheel label="최대" value={to} onChange={onChangeTo} />
      </View>
    </View>
  );
}

// 최소/최대 라벨(캡션 + 여백) 아래로 휠이 시작되므로 그만큼 내려서 강조 영역을 그린다
const LABEL_BLOCK_HEIGHT = 15.6 + 12;
const SELECTION_TOP = LABEL_BLOCK_HEIGHT + ITEM_HEIGHT * PADDING_COUNT;
