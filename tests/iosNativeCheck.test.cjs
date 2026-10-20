const assert = require("node:assert/strict");
const { test } = require("node:test");

const { findMissingIosNativeItems } = require("../scripts/check-ios-native.cjs");

const infoPlist = `<dict>
  <key>NSMicrophoneUsageDescription</key>
  <string>통화 훈련에서 마이크를 사용합니다.</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>사진을 선택합니다.</string>
  <key>UIApplicationSceneManifest</key>
  <dict>
    <key>UIApplicationSupportsMultipleScenes</key>
    <false/>
    <key>UISceneConfigurations</key>
    <dict>
      <key>UIWindowSceneSessionRoleApplication</key>
      <array>
        <dict>
          <key>UISceneConfigurationName</key>
          <string>Default Configuration</string>
          <key>UISceneDelegateClassName</key>
          <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
        </dict>
      </array>
    </dict>
  </dict>
</dict>`;

const appDelegate = `FirebaseApp.configure()
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
}`;

const validFiles = {
  "Info.plist": infoPlist,
  "AppDelegate.swift": appDelegate,
  "GoogleService-Info.plist": "<plist/>",
};

test("필수 항목이 모두 있으면 누락 항목이 없다", () => {
  assert.deepEqual(findMissingIosNativeItems(validFiles), []);
});

test("통화 크래시를 유발하는 누락·빈 마이크 권한 설명을 감지한다", () => {
  for (const value of ["", "<key>NSMicrophoneUsageDescription</key><string> </string>"]) {
    const missing = findMissingIosNativeItems({
      ...validFiles,
      "Info.plist": infoPlist.replace(/<key>NSMicrophoneUsageDescription<\/key>\s*<string>[^<]*<\/string>/, value),
    });
    assert.ok(missing.some((item) => item.includes("NSMicrophoneUsageDescription")));
  }
});

test("Scene 구성이 없는 낡은 ios/ 결과물을 감지한다", () => {
  const missingItems = findMissingIosNativeItems({
    ...validFiles,
    "Info.plist": "<dict></dict>",
    "AppDelegate.swift": "FirebaseApp.configure()",
  });

  assert.ok(missingItems.some((item) => item.includes("UIApplicationSceneManifest")));
  assert.ok(missingItems.some((item) => item.includes("SceneDelegate 클래스")));
});

test("Firebase 설정 없이 생성된 결과물을 감지한다", () => {
  const missingItems = findMissingIosNativeItems({
    ...validFiles,
    "AppDelegate.swift": appDelegate.replace("FirebaseApp.configure()", ""),
    "GoogleService-Info.plist": null,
  });

  assert.equal(missingItems.length, 2);
});
