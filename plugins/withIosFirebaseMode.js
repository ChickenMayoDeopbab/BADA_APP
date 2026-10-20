const { CodeGenerator, withAppDelegate } = require("@expo/config-plugins");

/** 푸시를 끈 빌드에서 이전 prebuild가 삽입한 Firebase 초기화를 제거한다. */
function removeDisabledFirebaseInitialization(contents) {
  return CodeGenerator.removeContents({
    src: contents,
    tag: "@react-native-firebase/app-didFinishLaunchingWithOptions",
  }).contents.replace(/^import FirebaseCore\r?\n/m, "");
}

/** Firebase 설정 파일이 없는 로컬 빌드에 이전 초기화 코드가 남지 않게 한다. */
function withIosFirebaseMode(config, { enabled }) {
  if (enabled) return config;
  return withAppDelegate(config, (appDelegateConfig) => {
    appDelegateConfig.modResults.contents = removeDisabledFirebaseInitialization(
      appDelegateConfig.modResults.contents,
    );
    return appDelegateConfig;
  });
}

module.exports = withIosFirebaseMode;
module.exports.removeDisabledFirebaseInitialization = removeDisabledFirebaseInitialization;
