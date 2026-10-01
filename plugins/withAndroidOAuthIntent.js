const { withMainActivity } = require("@expo/config-plugins");

const INTENT_IMPORT = "import android.content.Intent";
const MAIN_COMPONENT_COMMENT = `
  /**
   * Returns the name of the main component registered from JavaScript.`;
const OAUTH_INTENT_HANDLER = `
  /** React 초기화 중 받은 OAuth 딥 링크를 초기 URL 조회에서도 복구할 수 있게 보존한다. */
  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }
`;

/** 생성된 Kotlin MainActivity에 OAuth 딥 링크 Intent 보존 처리를 추가한다. */
function applyAndroidOAuthIntentHandling(contents) {
  let nextContents = contents;

  if (!nextContents.includes(INTENT_IMPORT)) {
    nextContents = nextContents.replace(
      /^(package [^\n]+\n)/,
      `$1\n${INTENT_IMPORT}\n`,
    );
  }

  if (!nextContents.includes("override fun onNewIntent(intent: Intent)")) {
    if (!nextContents.includes(MAIN_COMPONENT_COMMENT)) {
      throw new Error("MainActivity에 OAuth Intent 처리 코드를 삽입하지 못했습니다.");
    }

    nextContents = nextContents.replace(
      MAIN_COMPONENT_COMMENT,
      `${OAUTH_INTENT_HANDLER}${MAIN_COMPONENT_COMMENT}`,
    );
  }

  return nextContents;
}

/** Android 네이티브 프로젝트 생성 시 OAuth Intent 보존 처리를 적용한다. */
function withAndroidOAuthIntent(config) {
  return withMainActivity(config, (mainActivityConfig) => {
    if (mainActivityConfig.modResults.language !== "kt") {
      throw new Error("Android MainActivity가 Kotlin 파일이 아닙니다.");
    }

    mainActivityConfig.modResults.contents = applyAndroidOAuthIntentHandling(
      mainActivityConfig.modResults.contents,
    );
    return mainActivityConfig;
  });
}

module.exports = withAndroidOAuthIntent;
module.exports.applyAndroidOAuthIntentHandling =
  applyAndroidOAuthIntentHandling;
