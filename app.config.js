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
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/badaLogo.png",
    scheme: "bada",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.bada.app",
      icon: "./assets/badaAppIcon.png",
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
        "expo-media-library",
        {
          photosPermission:
            "프로필 사진을 선택할 수 있도록 사진 보관함 접근을 허용해 주세요.",
          savePhotosPermission: false,
          granularPermissions: ["photo"],
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
      [
        // 실시간 AI 음성을 끊김 없이 재생하기 위한 오디오 그래프.
        // 기본값이 백그라운드 재생·포그라운드 서비스를 켜는데, 훈련 통화는 화면이 떠 있는
        // 동안만 소리를 내므로 모두 끈다. 특히 FOREGROUND_SERVICE_MEDIA_PLAYBACK 권한은
        // 플레이스토어에서 별도 선언이 필요해 켜두면 심사 부담만 생긴다.
        // FFmpeg은 인코딩된 오디오 디코딩용이라 raw PCM만 다루는 지금은 필요 없다.
        "react-native-audio-api",
        {
          iosBackgroundMode: false,
          androidForegroundService: false,
          androidPermissions: [],
          disableFFmpeg: true,
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
