# 바다 App
콜포비아 극복을 위한 AI 기반 전화 훈련 서비스의 모바일 애플리케이션입니다.<br>
React Native(Expo)와 TypeScript를 기반으로 개발했습니다.<br>
사용자는 자가진단, 시나리오 훈련, 전화 하이라이트, 실전 워밍업 기능을 이용할 수 있습니다.

<br>

# 사용 스택

| 분야 | 기술 |
| --- | --- |
| Framework | React Native, Expo |
| Language | TypeScript |
| Routing | Expo Router, React Navigation |
| Network | Axios, WebSocket |
| 서버 데이터 관리 | TanStack Query |
| Audio | expo-audio, expo-av, react-native-audio-api, react-native-audio-record |
| Form | React Hook Form |
| Styling | NativeWind, Tailwind CSS |
| Storage | AsyncStorage, Expo SecureStore |
| Push | React Native Firebase Messaging |

<br>

# 오픈소스 패키지

| 구분 | 패키지 |
| --- | --- |
| 앱·웹 기반 | react, react-native, expo, react-dom, react-native-web |
| 라우팅·화면 전환 | expo-router, @react-navigation/native, @react-navigation/bottom-tabs, @react-navigation/elements, react-native-screens |
| 통신·서버 데이터 | axios, @tanstack/react-query |
| 음성 입력·재생 | expo-audio, expo-av, react-native-audio-api, react-native-audio-record |
| 입력 폼 | react-hook-form |
| 로컬 저장소 | @react-native-async-storage/async-storage, expo-secure-store |
| 푸시 알림 | @react-native-firebase/app, @react-native-firebase/messaging |
| 스타일 | nativewind, tailwindcss, react-native-css-interop |
| 제스처·애니메이션 | react-native-gesture-handler, react-native-reanimated, react-native-worklets |
| 이미지 | expo-image, expo-image-picker, expo-image-manipulator |
| 파일·리소스 | expo-file-system, expo-document-picker, expo-asset |
| 날짜·일정 | date-fns, react-native-calendars, @react-native-community/datetimepicker |
| 아이콘·SVG | @expo/vector-icons, expo-symbols, react-native-svg, react-native-svg-transformer |
| 링크·브라우저 | expo-linking, expo-web-browser |
| 화면·입력 보조 | react-native-safe-area-context, react-native-keyboard-aware-scroll-view |
| 앱 UI | expo-font, expo-haptics, expo-splash-screen, expo-status-bar, expo-system-ui |
| 암호화·식별자·토큰 | expo-crypto, react-native-get-random-values, uuid, jwt-decode |
| 개발·빌드 | typescript, expo-dev-client, expo-build-properties, expo-constants, @expo/ngrok, babel-preset-expo |
| 정적 검사·타입 | eslint, eslint-config-expo, @types/react, @types/uuid |
| 의존성 패치 | patch-package, postinstall-postinstall |

<br>

# 저장소 구조
**App** - 현재 저장소<br>
React Native(Expo) 기반 모바일 애플리케이션입니다.<br>
https://github.com/ChickenMayoDeopbab/BADA_APP<br>

**Fast API**<br>
바다의 AI 서버로 실시간 음성 인식(STT), LLM 기반 대화 생성, 음성 합성(TTS)과 같은 AI 전화 훈련 파이프라인을 담당합니다.<br>
https://github.com/ChickenMayoDeopbab/BADA_FASTAPI_SERVER<br>

**Spring Server**<br>
백엔드 서버로 핵심 비즈니스 로직과 API를 담당합니다.<br>
https://github.com/ChickenMayoDeopbab/BADA_SPRING_SERVER<br>

<br>
<br>
<br>
<br>
<hr>

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
