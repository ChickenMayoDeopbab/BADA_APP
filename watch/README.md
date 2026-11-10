# 바다 워치 앱

Galaxy Watch(Wear OS 3 이상)에서 통화 중 몸의 반응을 재서 폰 앱으로 보내는 앱이다. 폰 앱과 따로 빌드하고 설치한다.

## 빌드 전에

1. **폰 앱 prebuild를 먼저 한다.** `npx expo prebuild -p android`(또는 `npm run android`)로 `android/`를 만든다.
   - 워치 debug 빌드는 `android/app/debug.keystore`로 서명한다. 폰과 워치는 패키지명(`com.bada.app`)과 서명이 같아야 Data Layer로 연결된다.
   - 이 파일이 없어도 빌드는 되지만 기본 debug 키로 서명돼 폰과 연결되지 않는다. 빌드 로그에 경고가 나온다.
2. `watch/local.properties`에 Android SDK 경로를 적는다: `sdk.dir=/Users/<사용자>/Library/Android/sdk`
3. JDK 17 또는 21을 쓴다. Android Studio 내장 JDK면 `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`.

## 빌드·설치

```bash
cd watch
./gradlew :app:testDebugUnitTest
./gradlew :app:installDebug
```

## 구조

- debug 빌드는 가짜 센서(`app/src/debug`)로 측정한다. release 빌드는 Samsung Health Sensor SDK 구현 전이라 측정하지 못한다.
- Samsung Health Sensor SDK aar는 `app/libs/`에 각자 받아 넣는다. 라이선스 확인 전까지 커밋하지 않는다.
- 폰과 주고받는 경로와 id 규칙은 폰 모듈의 `modules/wear-biosignal/android/src/protocol`을 같이 빌드한다.
