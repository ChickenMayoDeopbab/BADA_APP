import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

const CIRCLE_RADIUS = 45;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const CHECK_LENGTH = 48;

export default function AnimatedCheck() {
  const [circleOffset, setCircleOffset] = useState(CIRCLE_CIRCUMFERENCE);
  const [checkOffset, setCheckOffset] = useState(CHECK_LENGTH);

  const circleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    circleAnim.addListener(({ value }) => {
      setCircleOffset(CIRCLE_CIRCUMFERENCE * (1 - value));
    });
    checkAnim.addListener(({ value }) => {
      setCheckOffset(CHECK_LENGTH * (1 - value));
    });

    Animated.sequence([
      Animated.timing(circleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();

    return () => {
      circleAnim.removeAllListeners();
      checkAnim.removeAllListeners();
    };
  }, []);

  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Circle
        cx="50" cy="50" r={CIRCLE_RADIUS}
        stroke="#0AE365"
        strokeWidth="6"
        fill="none"
        strokeDasharray={CIRCLE_CIRCUMFERENCE}
        strokeDashoffset={circleOffset}
        strokeLinecap="round"
        rotation={-90}
        origin="50, 50"
      />
      {checkOffset < CHECK_LENGTH && (
        <Polyline
          points="32,52 44,64 68,40"
          stroke="#0AE365"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LENGTH}
          strokeDashoffset={checkOffset}
        />
      )}
    </Svg>
  );
}