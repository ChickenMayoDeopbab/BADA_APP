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
./gradlew :app:installDebug                          # 가짜 센서(에뮬레이터)
./gradlew -Pbada.sensor=samsung :app:installDebug    # 실제 센서(Galaxy Watch)
```

## 실제 센서 (Samsung Health Sensor SDK)

1. https://developer.samsung.com/health/sensor/overview.html 의 SDK download에서 zip을 받아 `libs/samsung-health-sensor-api-1.4.1.aar`를 `watch/app/libs/`에 넣는다. 라이선스 확인 전까지 커밋하지 않는다(`.gitignore`).
   - aar가 없으면 가짜 센서 debug 빌드만 된다. release와 `-Pbada.sensor=samsung` 빌드는 안내 메시지와 함께 멈춘다.
2. 워치에서 Health Platform 개발자 모드를 켠다. 설정 → 애플리케이션의 앱 정보 화면이 아니라 Health Platform 자체 설정 화면에서 해야 한다.
   - `adb shell am start -a com.samsung.android.service.health.intent.action.START_SETTINGS_ACTIVITY`로 그 화면을 연다.
   - 맨 위 "헬스 플랫폼" 제목을 빠르게 10번 탭하고, 나오는 개발자 모드를 켠다(라이선스 동의).
   - 꺼져 있으면 측정이 `sdk_policy` 오류로 끝나고 폰은 측정 없이 통화를 이어간다.
3. 워치 앱을 처음 열 때 센서·신체 활동 권한을 허용한다. 신체 활동(가속도)을 거부해도 심박은 잰다.

## 구조

- 센서 구현은 `app/src/fake`(가짜)와 `app/src/samsung`(Samsung SDK)에 있다. debug는 `bada.sensor` 값(기본 fake)으로, release는 항상 samsung을 쓴다.
- Samsung 구현은 기기가 지원하는 트래커만 켠다. 심박은 필수이고 가속도·PPG·피부전도(Watch8 이상)·피부 온도(Watch5 이상)는 없으면 빠진다. 측정을 끝낼 때 트래커마다 flush()로 남은 값을 받는다.
- 폰과 주고받는 경로와 id 규칙은 폰 모듈의 `modules/wear-biosignal/android/src/protocol`을 같이 빌드한다.
