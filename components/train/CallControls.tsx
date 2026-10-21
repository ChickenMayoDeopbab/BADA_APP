import KeypadIcon from "@/assets/train/keypad.svg";
import MuteIcon from "@/assets/train/mute.svg";
import RecordIcon from "@/assets/train/record.svg";
import ScriptIcon from "@/assets/train/script.svg";
import SpeakerIcon from "@/assets/train/speaker.svg";
import VideoIcon from "@/assets/train/video.svg";
import { SEMANTIC_COLORS } from "@/design-system/colors";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CallControlsProps {
  isWarmup: boolean;
  isMuted: boolean;
  scale: number;
  onShowScript: () => void;
  onToggleMute: () => void;
}

/** 두 플랫폼에서 같은 SVG와 3열 간격을 사용하는 통화 제어 버튼. */
export default function CallControls({
  isWarmup, isMuted, scale, onShowScript, onToggleMute,
}: CallControlsProps) {
  const controls = [
    { label: "스크립트 보기", Icon: ScriptIcon, isDisabled: isWarmup, onPress: onShowScript },
    { label: "음소거", Icon: MuteIcon, isDisabled: false, onPress: onToggleMute },
    { label: "녹음", Icon: RecordIcon, isDisabled: true },
    { label: "스피커", Icon: SpeakerIcon, isDisabled: true },
    { label: "영상통화", Icon: VideoIcon, isDisabled: true },
    { label: "키패드", Icon: KeypadIcon, isDisabled: true },
  ];
  const buttonSize = { width: 72 * scale, height: 72 * scale, borderRadius: 24 * scale };

  return (
    <View style={[styles.grid, { width: 312 * scale, rowGap: 16 * scale }]}>
      {controls.map(({ label, Icon, isDisabled, onPress }) => (
        <View key={label} style={[styles.item, { width: 104 * scale }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={label === "음소거" && isMuted ? "음소거 해제" : label}
            accessibilityState={{ disabled: isDisabled, ...(label === "음소거" ? { selected: isMuted } : {}) }}
            disabled={isDisabled}
            onPress={onPress}
            activeOpacity={0.8}
            style={[
              styles.button,
              buttonSize,
              label === "음소거" && isMuted && styles.selectedButton,
            ]}
          >
            <Icon />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[styles.label, { marginTop: 2 * scale }, isDisabled && styles.disabledLabel]}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", alignSelf: "center" },
  item: { alignItems: "center" },
  button: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(254,254,254,0.6)" },
  selectedButton: { backgroundColor: SEMANTIC_COLORS.primary.alternative },
  label: {
    fontFamily: "Pretendard",
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 18.2,
    letterSpacing: -0.28,
    includeFontPadding: false,
    textAlign: "center",
    color: SEMANTIC_COLORS.label.neutral,
  },
  disabledLabel: { opacity: 0.4 },
});
