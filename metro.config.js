const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// RN 코어 초기화(setUpDefaultReactNativeEnvironment)보다 먼저 DOMException 전역을 정의한다.
// Hermes에는 DOMException이 없어 부팅 시 ReferenceError가 나므로, Metro 폴리필 단계에 추가.
const baseGetPolyfills = config.serializer?.getPolyfills
  ? config.serializer.getPolyfills.bind(config.serializer)
  : () => [];
config.serializer = config.serializer || {};
config.serializer.getPolyfills = (...args) => [
  // 우리 폴리필을 가장 먼저 실행해, 뒤따르는 RN 기본 폴리필이 DOMException을 참조해도 안전하게.
  require.resolve("./polyfills.js"),
  ...baseGetPolyfills(...args),
];

config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer"
);

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);

config.resolver.sourceExts.push("svg");

module.exports = withNativeWind(config, {
  input: "./global.css",
});