// 스토어별로 패키지명을 분기한다.
// APP_VARIANT 는 eas.json 의 빌드 프로필 env 에서 주입되며,
// 값이 없으면 기존 원스토어 패키지를 그대로 사용한다.
const IS_PLAYSTORE = process.env.APP_VARIANT === "playstore";

/** 안드로이드 applicationId (스토어별로 다른 상품이 된다) */
const ANDROID_PACKAGE = IS_PLAYSTORE
  ? "com.chickenmayodeopbab.bada.play"
  : "com.bada.app";

module.exports = {
  expo: {
    name: "바다",
    slug: "bada",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/badaLogo.png",
    scheme: "bada",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.bada.app",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    android: {
      predictiveBackGestureEnabled: false,
      package: ANDROID_PACKAGE,
    },
    web: {
      output: "static",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/badaLogo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-font",
      "expo-web-browser",
      "@react-native-community/datetimepicker",
      "expo-secure-store",
      "expo-audio",
      "expo-asset",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "33067ca7-058a-404f-ba9f-ec559e3fc16b",
      },
    },
    owner: "bada-team",
  },
};
