// 스토어별로 패키지명을 분기한다.
// APP_VARIANT 는 eas.json 의 빌드 프로필 env 에서 주입되며,
// 값이 없으면 기존 원스토어 패키지를 그대로 사용한다.
const IS_PLAYSTORE = process.env.APP_VARIANT === "playstore";
const FIREBASE_PUSH_ENABLED =
  process.env.EXPO_PUBLIC_FIREBASE_PUSH_ENABLED === "true";

/** 안드로이드 applicationId (스토어별로 다른 상품이 된다) */
const ANDROID_PACKAGE = IS_PLAYSTORE
  ? "com.chickenmayodeopbab.bada.play"
  : "com.bada.app";
const ANDROID_GOOGLE_SERVICES_FILE =
  process.env.GOOGLE_SERVICES_JSON ??
  (IS_PLAYSTORE
    ? "./google-services-playstore.json"
    : "./google-services.json");
const IOS_GOOGLE_SERVICES_FILE =
  process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist";

module.exports = {
  expo: {
    name: "바다",
    slug: "bada",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/badaLogo.png",
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#0AE365",
    },
    scheme: "bada",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.bada.app",
      icon: "./assets/badaAppIcon.png",
      ...(FIREBASE_PUSH_ENABLED
        ? {
            googleServicesFile: IOS_GOOGLE_SERVICES_FILE,
            entitlements: {
              "aps-environment": "production",
            },
            infoPlist: {
              UIBackgroundModes: ["remote-notification"],
            },
          }
        : {}),
    },
    android: {
      predictiveBackGestureEnabled: false,
      package: ANDROID_PACKAGE,
      ...(FIREBASE_PUSH_ENABLED
        ? {
            googleServicesFile: ANDROID_GOOGLE_SERVICES_FILE,
            permissions: ["android.permission.POST_NOTIFICATIONS"],
          }
        : {}),
    },
    web: {
      output: "static",
    },
    plugins: [
      "expo-router",
      ...(FIREBASE_PUSH_ENABLED
        ? [
            [
              "@react-native-firebase/app",
              {
                ios: {
                  disableSPM: true,
                },
              },
            ],
            "@react-native-firebase/messaging",
          ]
        : []),
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
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
      [
        "expo-font",
        {
          android: {
            fonts: [
              {
                fontFamily: "Pretendard",
                fontDefinitions: [
                  {
                    path: "./public/fonts/Pretendard-Regular.otf",
                    weight: 400,
                  },
                  {
                    path: "./public/fonts/Pretendard-Medium.otf",
                    weight: 500,
                  },
                  {
                    path: "./public/fonts/Pretendard-Bold.otf",
                    weight: 700,
                  },
                ],
              },
            ],
          },
          ios: {
            fonts: [
              "./public/fonts/Pretendard-Regular.otf",
              "./public/fonts/Pretendard-Medium.otf",
              "./public/fonts/Pretendard-Bold.otf",
            ],
          },
        },
      ],
      "expo-web-browser",
      "@react-native-community/datetimepicker",
      [
        "expo-image-picker",
        {
          photosPermission:
            "프로필 사진을 선택할 수 있도록 사진 보관함 접근을 허용해 주세요.",
          cameraPermission: false,
          microphonePermission:
            "대화 훈련 중 음성을 녹음하여 발화 내용을 분석하고 피드백을 제공하기 위해 마이크를 사용합니다.",
        },
      ],
      [
        "expo-secure-store",
        {
          faceIDPermission: false,
        },
      ],
      [
        "expo-audio",
        {
          microphonePermission:
            "대화 훈련 중 음성을 녹음하여 발화 내용을 분석하고 피드백을 제공하기 위해 마이크를 사용합니다.",
        },
      ],
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
