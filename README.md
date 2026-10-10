# 바다 App
React Native(Expo) 기반 모바일 애플리케이션입니다.<br>
사용자는 자가진단, 시나리오 훈련, 전화 하이라이트, 실전 워밍업 기능을 이용할 수 있습니다.<br>

<br>

# 저장소 구조
**App** - 현재 저장소<br>
React Native(Expo) 기반 모바일 애플리케이션입니다.<br>
https://github.com/ChickenMayoDeopbab/BADA_APP<br>

**Fast API**<br>
바다의 AI 서버로 실시간 음성 인식(STT), LLM 기반 대화 생성, 음성 합성(TTS)과 같은 AI 전화 훈련 파이프라인을 담당합니다.<br>
https://github.com/ChickenMayoDeopbab/BADA_FASTAPI<br>

**Spring Server**<br>
백엔드 서버로 핵심 비즈니스 로직과 API를 담당합니다.<br>
https://github.com/ChickenMayoDeopbab/BADA_SPRING_SERVER<br>

<br>

# iOS 로컬 아카이브 절차
`ios/` 폴더는 git에 포함되지 않고 `expo prebuild`로 생성됩니다.<br>
pull만 받고 예전 `ios/`로 아카이브하면 config plugin 변경(예: iOS 27 Scene 생명주기)이 빠진 채 제출되므로 아래 순서를 반드시 지켜주세요.<br>

**사전 준비**
- 프로젝트 루트에 `GoogleService-Info.plist` (Firebase 콘솔에서 받은 파일)
- `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_AI_API_URL`이 `eas.json`의 production 값과 같은지 확인

**절차**
1. 최신 코드 받기 및 의존성 설치
   ```bash
   git pull
   npm install
   ```
2. `ios/` 다시 생성 및 점검 (기존 `ios/`를 삭제하고 다시 만든 뒤 `ios:check`까지 실행)
   ```bash
   npm run ios:prebuild
   ```
   `ios:check`가 실패하면 출력된 누락 항목을 확인하고 다시 실행합니다.
3. Xcode에서 `ios/app.xcworkspace`를 열고 빌드 번호를 App Store Connect의 마지막 빌드보다 크게 설정
4. Product > Archive
5. 아카이브 결과물에 Scene 구성이 들어갔는지 확인
   ```bash
   /usr/libexec/PlistBuddy -c 'Print :UIApplicationSceneManifest' \
     "<아카이브 경로>.xcarchive/Products/Applications/app.app/Info.plist"
   ```
   `Does Not Exist`가 출력되면 업로드하지 말고 2번부터 다시 진행합니다.
6. Organizer에서 업로드

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
