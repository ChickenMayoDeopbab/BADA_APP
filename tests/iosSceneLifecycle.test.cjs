const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  applyAppDelegateSceneLifecycle,
  applyIosSceneManifest,
} = require("../plugins/withIosSceneLifecycle");

const appDelegate = `import Expo
import React

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
}
`;

test("Info.plist에 단일 iOS Scene 구성을 추가한다", () => {
  const result = applyIosSceneManifest({ CFBundleDisplayName: "바다" });
  const sceneManifest = result.UIApplicationSceneManifest;
  const sceneConfiguration =
    sceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0];

  assert.equal(result.CFBundleDisplayName, "바다");
  assert.equal(sceneManifest.UIApplicationSupportsMultipleScenes, false);
  assert.equal(
    sceneConfiguration.UISceneDelegateClassName,
    "$(PRODUCT_MODULE_NAME).SceneDelegate",
  );
});

test("React Native 시작을 SceneDelegate로 이동한다", () => {
  const result = applyAppDelegateSceneLifecycle(appDelegate);

  assert.match(
    result,
    /class SceneDelegate: UIResponder, UIWindowSceneDelegate/,
  );
  assert.match(result, /configurationForConnecting connectingSceneSession/);
  assert.match(result, /UIWindow\(windowScene: windowScene\)/);
  assert.match(result, /launchOptions: appDelegate\.reactNativeLaunchOptions/);
  assert.match(result, /reactNativeLaunchOptions = launchOptions/);
  assert.match(result, /if #unavailable\(iOS 13\.0\)/);
  assert.doesNotMatch(
    result,
    /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)/,
  );
});

test("Scene 이벤트를 기존 AppDelegate에 전달한다", () => {
  const result = applyAppDelegateSceneLifecycle(appDelegate);

  assert.match(result, /openURLContexts urlContexts/);
  assert.match(result, /continue userActivity: NSUserActivity/);
  assert.match(result, /applicationDidBecomeActive\(UIApplication\.shared\)/);
  assert.match(result, /applicationDidEnterBackground\(UIApplication\.shared\)/);
});

test("Firebase가 삽입한 앱 초기화 코드를 유지한다", () => {
  const firebaseAppDelegate = appDelegate.replace(
    "    factory.startReactNative(",
    `// @generated begin firebase
    FirebaseApp.configure()
// @generated end firebase
    factory.startReactNative(`,
  );
  const result = applyAppDelegateSceneLifecycle(firebaseAppDelegate);

  assert.match(result, /FirebaseApp\.configure\(\)/);
  assert.ok(
    result.indexOf("FirebaseApp.configure()") <
      result.indexOf("if #unavailable(iOS 13.0)"),
  );
});

test("AppDelegate 보정을 반복 적용해도 중복되지 않는다", () => {
  const firstResult = applyAppDelegateSceneLifecycle(appDelegate);
  const secondResult = applyAppDelegateSceneLifecycle(firstResult);

  assert.equal(secondResult, firstResult);
  assert.equal(
    secondResult.match(/class SceneDelegate: UIResponder/g)?.length,
    1,
  );
});

test("지원하지 않는 AppDelegate 형식은 명확한 오류를 반환한다", () => {
  assert.throws(
    () => applyAppDelegateSceneLifecycle("class AppDelegate {}"),
    /React Native 시작 코드를 찾지 못했습니다/,
  );
});
