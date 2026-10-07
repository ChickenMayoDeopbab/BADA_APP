const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

const SCENE_DELEGATE_CLASS_NAME = "$(PRODUCT_MODULE_NAME).SceneDelegate";
const SCENE_DELEGATE_MARKER =
  "class SceneDelegate: UIResponder, UIWindowSceneDelegate";

const REACT_NATIVE_STARTUP_PATTERN = /#if os\(iOS\) \|\| os\(tvOS\)\r?\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\r?\n([\s\S]*?)\s*factory\.startReactNative\(\r?\n\s*withModuleName: "main",\r?\n\s*in: window,\r?\n\s*launchOptions: launchOptions\)\r?\n#endif/;

const LEGACY_REACT_NATIVE_STARTUP = `    if #unavailable(iOS 13.0) {
      window = UIWindow(frame: UIScreen.main.bounds)
      factory.startReactNative(
        withModuleName: "main",
        in: window,
        launchOptions: launchOptions)
    }`;

/** 다른 config plugin이 삽입한 초기화 코드를 보존해 Scene 시작 블록을 만든다. */
function createSceneAwareStartup(preservedStartupCode) {
  const preservedCode = preservedStartupCode.trim();
  return `#if os(iOS) || os(tvOS)
${preservedCode ? `${preservedCode}\n` : ""}${LEGACY_REACT_NATIVE_STARTUP}
#endif`;
}

const SCENE_CONFIGURATION_METHOD = `  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`;

const SCENE_DELEGATE_CLASS = `class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate,
      let factory = appDelegate.reactNativeFactory else {
      return
    }

    let nextWindow = UIWindow(windowScene: windowScene)
    window = nextWindow
    appDelegate.window = nextWindow

    factory.startReactNative(
      withModuleName: "main",
      in: nextWindow,
      launchOptions: appDelegate.reactNativeLaunchOptions)

    for urlContext in connectionOptions.urlContexts {
      open(urlContext)
    }
    for userActivity in connectionOptions.userActivities {
      continueUserActivity(userActivity)
    }
  }

  func scene(_ scene: UIScene, openURLContexts urlContexts: Set<UIOpenURLContext>) {
    for urlContext in urlContexts {
      open(urlContext)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    continueUserActivity(userActivity)
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  private func open(_ urlContext: UIOpenURLContext) {
    guard let appDelegate else {
      return
    }

    var options: [UIApplication.OpenURLOptionsKey: Any] = [
      .openInPlace: urlContext.options.openInPlace,
    ]
    if let sourceApplication = urlContext.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = urlContext.options.annotation {
      options[.annotation] = annotation
    }

    _ = appDelegate.application(
      UIApplication.shared,
      open: urlContext.url,
      options: options)
  }

  private func continueUserActivity(_ userActivity: NSUserActivity) {
    guard let appDelegate else {
      return
    }

    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }
}
`;

/** iOS 27이 요구하는 단일 Scene 구성을 Info.plist에 추가한다. */
function applyIosSceneManifest(infoPlist) {
  return {
    ...infoPlist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS_NAME,
          },
        ],
      },
    },
  };
}

/** Expo AppDelegate의 React Native 시작 지점을 SceneDelegate로 이동한다. */
function applyAppDelegateSceneLifecycle(contents) {
  if (contents.includes(SCENE_DELEGATE_MARKER)) return contents;
  if (!REACT_NATIVE_STARTUP_PATTERN.test(contents)) {
    throw new Error(
      "iOS Scene 생명주기를 적용할 React Native 시작 코드를 찾지 못했습니다.",
    );
  }

  const windowProperty = "  var window: UIWindow?\n";
  if (!contents.includes(windowProperty)) {
    throw new Error("iOS Scene 생명주기에 필요한 window 속성을 찾지 못했습니다.");
  }

  const linkingMarker = "\n  // Linking API";
  if (!contents.includes(linkingMarker)) {
    throw new Error("iOS Scene 연결 메서드를 추가할 위치를 찾지 못했습니다.");
  }

  const reactNativeFactoryMarker = "    reactNativeFactory = factory\n";
  if (!contents.includes(reactNativeFactoryMarker)) {
    throw new Error("iOS Scene에서 사용할 React Native factory를 찾지 못했습니다.");
  }

  const reactNativeDelegateMarker =
    "\nclass ReactNativeDelegate: ExpoReactNativeFactoryDelegate";
  if (!contents.includes(reactNativeDelegateMarker)) {
    throw new Error("SceneDelegate를 추가할 위치를 찾지 못했습니다.");
  }

  return contents
    .replace(
      windowProperty,
      `${windowProperty}  var reactNativeLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?\n`,
    )
    .replace(
      reactNativeFactoryMarker,
      `${reactNativeFactoryMarker}    reactNativeLaunchOptions = launchOptions\n`,
    )
    .replace(
      REACT_NATIVE_STARTUP_PATTERN,
      (_startupBlock, preservedStartupCode) =>
        createSceneAwareStartup(preservedStartupCode),
    )
    .replace(
      linkingMarker,
      `\n${SCENE_CONFIGURATION_METHOD}\n  // Linking API`,
    )
    .replace(
      reactNativeDelegateMarker,
      `\n${SCENE_DELEGATE_CLASS}${reactNativeDelegateMarker}`,
    );
}

/** iOS 네이티브 프로젝트 생성 시 Scene 생명주기 구성을 적용한다. */
function withIosSceneLifecycle(config) {
  const configWithInfoPlist = withInfoPlist(config, (infoPlistConfig) => {
    infoPlistConfig.modResults = applyIosSceneManifest(
      infoPlistConfig.modResults,
    );
    return infoPlistConfig;
  });

  return withAppDelegate(configWithInfoPlist, (appDelegateConfig) => {
    if (appDelegateConfig.modResults.language !== "swift") {
      throw new Error("iOS Scene 생명주기는 Swift AppDelegate만 지원합니다.");
    }

    appDelegateConfig.modResults.contents = applyAppDelegateSceneLifecycle(
      appDelegateConfig.modResults.contents,
    );
    return appDelegateConfig;
  });
}

module.exports = withIosSceneLifecycle;
module.exports.applyAppDelegateSceneLifecycle = applyAppDelegateSceneLifecycle;
module.exports.applyIosSceneManifest = applyIosSceneManifest;
