const assert = require("node:assert/strict");
const { test } = require("node:test");
const withIosFirebaseMode = require("../plugins/withIosFirebaseMode");
const { removeDisabledFirebaseInitialization } = withIosFirebaseMode;

const appDelegate = `import Expo
import FirebaseCore
import React
// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-test
FirebaseApp.configure()
// @generated end @react-native-firebase/app-didFinishLaunchingWithOptions
factory.startReactNative()
`;

test("푸시 비활성화 시 남아 있는 Firebase 초기화만 제거한다", () => {
  const result = removeDisabledFirebaseInitialization(appDelegate);
  assert.doesNotMatch(result, /Firebase/);
  assert.match(result, /factory.startReactNative\(\)/);
  assert.equal(removeDisabledFirebaseInitialization(result), result);
});

test("푸시 활성화 빌드의 Firebase 초기화는 보존한다", () => {
  const config = { name: "바다" };
  assert.equal(withIosFirebaseMode(config, { enabled: true }), config);
});
