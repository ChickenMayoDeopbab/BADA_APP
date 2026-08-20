import { Text, TextInput, type StyleProp, type TextStyle } from "react-native";
import { FONT_FAMILY } from "./typography";

type TextComponentWithDefaults = typeof Text & {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
};

function applyDefaultFont(component: TextComponentWithDefaults) {
  const currentStyle = component.defaultProps?.style;

  component.defaultProps = {
    ...component.defaultProps,
    style: [{ fontFamily: FONT_FAMILY }, currentStyle],
  };
}

applyDefaultFont(Text as TextComponentWithDefaults);
applyDefaultFont(TextInput as unknown as TextComponentWithDefaults);
