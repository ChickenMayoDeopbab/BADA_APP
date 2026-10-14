const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

/** 외부 저장소와 서버를 대체하여 실제 동의 처리 코드를 실행한다. */
function loadTypeScript(relativePath, mocks) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.require = (id) => {
    assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
    return mocks[id];
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}

/** 앱 재시작 사이에 유지되는 임시 동의 저장소를 구성한다. */
function createPendingConsentStore(initialValue = null) {
  let stored = initialValue;
  return loadTypeScript("../utils/pendingLegalConsent.ts", {
    "@react-native-async-storage/async-storage": {
      getItem: async () => stored,
      setItem: async (_key, value) => { stored = value; },
      removeItem: async () => { stored = null; },
    },
  });
}

test("signup selections survive until login for every combination of optional consents", async () => {
  for (const sensitiveInformationAgreed of [false, true]) {
    for (const profileImageAgreed of [false, true]) {
      const store = createPendingConsentStore();
      const selections = { sensitiveInformationAgreed, profileImageAgreed };
      await store.savePendingLegalConsent(selections, "test-user");
      assert.deepEqual(await store.getPendingLegalConsent(), {
        username: "test-user",
        ...selections,
      });
      await store.clearPendingLegalConsent();
      assert.equal(await store.getPendingLegalConsent(), null);
    }
  }
});

test("pending consent from the previous app does not imply image consent", async () => {
  const store = createPendingConsentStore(JSON.stringify({
    username: "existing-user",
    sensitiveInformationAgreed: true,
  }));
  assert.deepEqual(await store.getPendingLegalConsent(), {
    username: "existing-user",
    sensitiveInformationAgreed: true,
    profileImageAgreed: false,
  });
});

test("malformed stored consent is rejected rather than treated as agreement", async () => {
  for (const value of ["invalid-json", '{"sensitiveInformationAgreed":"true"}',
    '{"sensitiveInformationAgreed":true,"profileImageAgreed":"false"}']) {
    assert.equal(await createPendingConsentStore(value).getPendingLegalConsent(), null);
  }
});

test("the consent API sends both selections and unwraps the server response", async () => {
  const selections = {
    termsOfServiceAgreed: true,
    privacyPolicyAcknowledged: true,
    sensitiveInformationAgreed: false,
    profileImageAgreed: true,
  };
  const status = { ...selections, legalActionRequired: false };
  const api = loadTypeScript("../api/legalConsentApi.ts", {
    "./client": {
      post: async (url, body) => {
        assert.equal(url, "/api/v1/legal-consents/accept");
        assert.deepEqual(body, selections);
        return { data: { data: status } };
      },
      get: async (url) => {
        assert.equal(url, "/api/v1/legal-consents/status");
        return { data: status };
      },
      delete: async (url) => {
        assert.equal(url, "/api/v1/legal-consents/profile-image");
        return { data: { data: { ...status, profileImageAgreed: false } } };
      },
    },
  });
  assert.deepEqual(await api.acceptLegalConsents(selections), status);
  assert.deepEqual(await api.getLegalConsentStatus(), status);
  assert.deepEqual(await api.withdrawProfileImageConsent(), {
    ...status, profileImageAgreed: false,
  });
});

/** 서버 응답과 사용자 선택을 지정하여 이미지 동의 확인을 실행한다. */
function createGuard(api, showAlert) {
  const { useProfileImageConsentGuard } = loadTypeScript("../hooks/useProfileImageConsentGuard.ts", {
    "@/api/legalConsentApi": api,
    "@/constants/legalDocuments": { PROFILE_IMAGE_SECTIONS: [{ body: "Image processing notice" }] },
    "@/context/AppAlertContext": { useAppAlert: () => ({ showAlert }) },
    react: { useCallback: (callback) => callback },
  });
  return useProfileImageConsentGuard();
}

test("an existing image consent proceeds without prompting or registering again", async () => {
  const guard = createGuard({
    getLegalConsentStatus: async () => ({ profileImageAgreed: true }),
    acceptLegalConsents: () => assert.fail("Must not register again"),
  }, () => assert.fail("Must not prompt"));
  assert.equal(await guard(), true);
});

test("canceling image consent blocks photo saving without registering consent", async () => {
  const guard = createGuard({
    getLegalConsentStatus: async () => ({ profileImageAgreed: false }),
    acceptLegalConsents: () => assert.fail("Must not register on cancel"),
  }, (alert) => alert.onCancel());
  assert.equal(await guard(), false);
});

test("agreeing to image processing preserves either sensitive information selection", async () => {
  for (const sensitiveInformationAgreed of [false, true]) {
    const guard = createGuard({
      getLegalConsentStatus: async () => ({ profileImageAgreed: false, sensitiveInformationAgreed }),
      acceptLegalConsents: async (body) => {
        assert.deepEqual(body, {
          termsOfServiceAgreed: true,
          privacyPolicyAcknowledged: true,
          sensitiveInformationAgreed,
          profileImageAgreed: true,
        });
        return { profileImageAgreed: true };
      },
    }, (alert) => alert.onConfirm());
    assert.equal(await guard(), true);
  }
});

test("photo saving stays blocked when the server does not confirm image consent", async () => {
  const guard = createGuard({
    getLegalConsentStatus: async () => ({ profileImageAgreed: false, sensitiveInformationAgreed: false }),
    acceptLegalConsents: async () => ({ profileImageAgreed: false }),
  }, (alert) => alert.onConfirm());
  assert.equal(await guard(), false);
});

test("failed status lookup or consent registration blocks photo saving and shows an error", async () => {
  for (const failure of ["lookup", "register"]) {
    const alerts = [];
    const guard = createGuard({
      getLegalConsentStatus: async () => {
        if (failure === "lookup") throw new Error("Network unavailable");
        return { profileImageAgreed: false, sensitiveInformationAgreed: true };
      },
      acceptLegalConsents: async () => { throw new Error("Network unavailable"); },
    }, (alert) => {
      alerts.push(alert.title);
      alert.onConfirm?.();
    });
    assert.equal(await guard(), false);
    assert.equal(alerts.at(-1), failure === "lookup" ? "동의 상태를 확인하지 못했어요" : "동의를 저장하지 못했어요");
  }
});
