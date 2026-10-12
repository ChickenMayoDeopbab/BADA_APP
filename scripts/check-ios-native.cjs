const fs = require("node:fs");
const path = require("node:path");

const IOS_APP_DIR = path.join(__dirname, "..", "ios", "app");
const FIX_GUIDE = "npm run ios:prebuild 로 ios/ 폴더를 다시 생성하세요.";

/** 아카이브 전에 ios/ 결과물에 반드시 있어야 하는 항목 */
const REQUIRED_ITEMS = [
  {
    file: "Info.plist",
    label: "UIApplicationSceneManifest (iOS 27 Scene 구성)",
    test: (contents) => contents.includes("<key>UIApplicationSceneManifest</key>"),
  },
  {
    file: "Info.plist",
    label: "UISceneDelegateClassName = $(PRODUCT_MODULE_NAME).SceneDelegate",
    test: (contents) =>
      /<key>UISceneDelegateClassName<\/key>\s*<string>\$\(PRODUCT_MODULE_NAME\)\.SceneDelegate<\/string>/.test(
        contents,
      ),
  },
  {
    file: "Info.plist",
    label: "UIApplicationSupportsMultipleScenes = false",
    test: (contents) =>
      /<key>UIApplicationSupportsMultipleScenes<\/key>\s*<false\/>/.test(contents),
  },
  {
    file: "AppDelegate.swift",
    label: "SceneDelegate 클래스",
    test: (contents) =>
      contents.includes("class SceneDelegate: UIResponder, UIWindowSceneDelegate"),
  },
  {
    file: "AppDelegate.swift",
    label: "FirebaseApp.configure() (푸시 알림)",
    test: (contents) => contents.includes("FirebaseApp.configure()"),
  },
  {
    file: "GoogleService-Info.plist",
    label: "GoogleService-Info.plist (푸시 알림)",
    test: () => true,
  },
];

/** 파일 내용 맵을 받아 누락된 항목 목록을 반환한다. 파일이 없으면 null을 넣는다. */
function findMissingIosNativeItems(files) {
  return REQUIRED_ITEMS.filter((item) => {
    const contents = files[item.file];
    return contents == null || !item.test(contents);
  }).map((item) => `${item.file}: ${item.label}`);
}

function readIosAppFiles(appDir) {
  const fileNames = [...new Set(REQUIRED_ITEMS.map((item) => item.file))];
  return Object.fromEntries(
    fileNames.map((fileName) => {
      const filePath = path.join(appDir, fileName);
      return [fileName, fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null];
    }),
  );
}

function main() {
  if (!fs.existsSync(IOS_APP_DIR)) {
    process.stderr.write(`ios/app 폴더가 없습니다.\n${FIX_GUIDE}\n`);
    process.exit(1);
  }

  const missingItems = findMissingIosNativeItems(readIosAppFiles(IOS_APP_DIR));
  if (missingItems.length > 0) {
    process.stderr.write(
      [
        "ios/ 폴더가 현재 설정과 맞지 않습니다. 이대로 아카이브하면 안 됩니다.",
        "",
        "누락된 항목:",
        ...missingItems.map((item) => `  - ${item}`),
        "",
        FIX_GUIDE,
        "(GoogleService-Info.plist가 프로젝트 루트에 있어야 Firebase 항목이 생성됩니다.)",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  process.stdout.write("ios/ 네이티브 구성 확인 완료. 아카이브를 진행해도 됩니다.\n");
}

if (require.main === module) {
  main();
}

module.exports = { findMissingIosNativeItems };
