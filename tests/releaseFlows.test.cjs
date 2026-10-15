const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

/** 네이티브 모듈과 서버를 대체하고 실제 앱 코드를 실행한다. */
function loadTypeScript(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
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

const callbackApi = loadTypeScript("../utils/oauthCallback.ts");

test("bulk read snapshots every unread page before mutating the list", async () => {
  const events = [];
  const { markAllNotificationsRead } = loadTypeScript(
    "../api/notificationApi.ts",
    {
      "./client": {
        get: async (url, { params }) => {
          events.push(`page-${params.page}`);
          assert.equal(params.filter, "UNREAD");
          return {
            data: {
              data: {
                notifications: {
                  content:
                    params.page === 0
                      ? [
                          { notificationId: 1, read: false },
                          { notificationId: 2, read: false },
                        ]
                      : [{ notificationId: 3, read: false }],
                  last: params.page === 1,
                },
              },
            },
          };
        },
        patch: async (url) => {
          events.push(url);
          return { data: {} };
        },
      },
    },
  );
  await markAllNotificationsRead();
  assert.deepEqual(events, [
    "page-0",
    "page-1",
    "/api/v1/notifications/1/read",
    "/api/v1/notifications/2/read",
    "/api/v1/notifications/3/read",
  ]);
});

test("bulk read deduplicates IDs and attempts remaining batches after a partial failure", async () => {
  const marked = [];
  const { markAllNotificationsRead } = loadTypeScript(
    "../api/notificationApi.ts",
    {
      "./client": {
        get: async () => ({
          data: {
            data: {
              notifications: {
                content: [1, 2, 3, 4, 5, 6, 6].map((notificationId) => ({
                  notificationId,
                  read: false,
                })),
                last: true,
              },
            },
          },
        }),
        patch: async (url) => {
          marked.push(url);
          if (url.endsWith("/2/read")) throw new Error("offline");
          return { data: {} };
        },
      },
    },
  );
  await assert.rejects(markAllNotificationsRead(), /일부 알림/);
  assert.equal(marked.length, 6);
  assert.ok(marked.includes("/api/v1/notifications/6/read"));
});

test("bulk read does not mark anything when retrieving the snapshot fails", async () => {
  let patches = 0;
  const { markAllNotificationsRead } = loadTypeScript(
    "../api/notificationApi.ts",
    {
      "./client": {
        get: async () => {
          throw new Error("offline");
        },
        patch: () => {
          patches++;
        },
      },
    },
  );
  await assert.rejects(markAllNotificationsRead(), /offline/);
  assert.equal(patches, 0);
});

test("inquiry uses the AI server and does not silently report a failed send as success", async () => {
  const requests = [];
  const { sendInquiry } = loadTypeScript("../api/supportApi.ts", {
    "./aiClient": {
      post: async (...args) => {
        requests.push(args);
        throw new Error("offline");
      },
    },
  });
  await assert.rejects(
    sendInquiry({ title: "오류 문의", content: "내용" }),
    /offline/,
  );
  assert.deepEqual(requests, [
    ["/api/v1/inquiries", { title: "오류 문의", content: "내용" }],
  ]);
});

test("server schedules support creation, empty ringing responses, acceptance and cancellation", async () => {
  const events = [];
  const request = {
    scenarioId: 17,
    type: "SCENARIO",
    aiPersonality: "KIND",
    minDelayMinutes: 1,
    maxDelayMinutes: 5,
  };
  const api = loadTypeScript("../api/trainingCallApi.ts", {
    "./client": {
      post: async (url, body) => {
        events.push(["POST", url, body]);
        return {
          data: {
            data: url.endsWith("/accept")
              ? {
                  status: "ACCEPTED",
                  sessionId: "session",
                  wsUrl: "wss://example.com/ws",
                }
              : { scheduleId: 7, status: "SCHEDULED" },
          },
        };
      },
      get: async () => ({ data: { status: 200 } }),
      delete: async (url) => {
        events.push(["DELETE", url]);
      },
    },
  });
  assert.deepEqual(await api.createTrainingCallSchedule(request), {
    scheduleId: 7,
    status: "SCHEDULED",
  });
  assert.equal(await api.getRingingTrainingCallSchedule(), null);
  assert.deepEqual(await api.acceptTrainingCallSchedule(7), {
    sessionId: "session",
    wsUrl: "wss://example.com/ws",
  });
  await api.cancelTrainingCallSchedule(7);
  assert.deepEqual(events, [
    ["POST", "/api/v1/training-call-schedules", request],
    ["POST", "/api/v1/training-call-schedules/7/accept", undefined],
    ["DELETE", "/api/v1/training-call-schedules/7"],
  ]);
});

test("acceptance never proceeds to training with an incomplete server session", async () => {
  for (const data of [
    { status: "RINGING" },
    { status: "ACCEPTED", sessionId: "id" },
  ]) {
    const api = loadTypeScript("../api/trainingCallApi.ts", {
      "./client": { post: async () => ({ data: { data } }) },
    });
    await assert.rejects(api.acceptTrainingCallSchedule(7), /통화 세션/);
  }
});

test("callback parsing accepts native URL forms and rejects unrelated or empty callbacks", () => {
  for (const url of [
    "bada://auth/callback?code=one",
    "bada:///auth/callback?code=one",
  ]) {
    assert.equal(callbackApi.parseOAuthCallback(url).code, "one");
  }
  assert.equal(
    callbackApi.parseOAuthCallback("bada://auth/callback?error=access_denied")
      .error,
    "access_denied",
  );
  for (const url of [
    "https://example.com/auth/callback?code=one",
    "bada://other?code=one",
    "bada://auth/callback",
  ]) {
    assert.throws(() => callbackApi.parseOAuthCallback(url));
  }
});

/** 플랫폼별 인증 브라우저를 대체한다. */
function authSetup(platform, openAuthSessionAsync, onListener) {
  const subscriptions = [];
  const api = loadTypeScript("../api/authApi.ts", {
    "expo-linking": {
      createURL: () => "https://app.example.com/auth/callback",
      addEventListener: (_, callback) => {
        onListener?.(callback);
        const subscription = {
          removed: false,
          remove() {
            this.removed = true;
          },
        };
        subscriptions.push(subscription);
        return subscription;
      },
    },
    "expo-web-browser": { openAuthSessionAsync },
    "react-native": { Platform: { OS: platform } },
    "@/utils/oauthCallback": callbackApi,
    "./client": {
      getUri: ({ url, params }) =>
        `https://api.example.com${url}?${new URLSearchParams(params)}`,
    },
  });
  return { api, subscriptions };
}

test("iOS uses an authentication session with the explicit app callback for all providers", async () => {
  const calls = [];
  const { api } = authSetup("ios", async (...args) => {
    calls.push(args);
    return { type: "success", url: "bada://auth/callback?code=one" };
  });
  for (const provider of ["google", "naver", "apple"]) {
    assert.equal(
      await api.openOAuthLogin(provider),
      "bada://auth/callback?code=one",
    );
    const [url, callback] = calls.at(-1);
    assert.equal(new URL(url).pathname, `/api/v1/auth/${provider}`);
    assert.equal(
      new URL(url).searchParams.get("redirectUri"),
      "bada://auth/callback",
    );
    assert.equal(callback, "bada://auth/callback");
  }
});

test("iOS cancellation returns without pretending to have a callback", async () => {
  const { api } = authSetup("ios", async () => ({ type: "cancel" }));
  assert.equal(await api.openOAuthLogin("google"), undefined);
});

test("Android recovers a callback delivered before a cancel result and cleans its listener", async () => {
  let listener;
  const { api, subscriptions } = authSetup(
    "android",
    async () => {
      listener({ url: "bada:///auth/callback?code=android" });
      return { type: "cancel" };
    },
    (callback) => {
      listener = callback;
    },
  );
  assert.equal(
    await api.openOAuthLogin("naver"),
    "bada:///auth/callback?code=android",
  );
  assert.ok(subscriptions.every((entry) => entry.removed));
});

test("Android recovers a late callback after the app resumes and rejects unrelated links", async () => {
  let listener;
  const { api, subscriptions } = authSetup(
    "android",
    async () => {
      setTimeout(() => {
        listener({ url: "bada://unrelated?code=bad" });
        listener({ url: "bada://auth/callback?code=late" });
      }, 10);
      return { type: "cancel" };
    },
    (callback) => {
      listener = callback;
    },
  );
  assert.equal(
    await api.openOAuthLogin("google"),
    "bada://auth/callback?code=late",
  );
  assert.ok(subscriptions.every((entry) => entry.removed));
});

test("Android browser errors still remove callback listeners", async () => {
  const { api, subscriptions } = authSetup("android", async () => {
    throw new Error("browser unavailable");
  });
  await assert.rejects(api.openOAuthLogin("apple"), /browser unavailable/);
  assert.ok(subscriptions.every((entry) => entry.removed));
});

test("duplicate OAuth callbacks share token exchange, persistence and profile synchronization", async () => {
  let exchanges = 0,
    saves = 0,
    profiles = 0,
    syncs = 0;
  const { completeOAuthLoginOnce } = loadTypeScript("../utils/oauthLogin.ts", {
    "@/api/authApi": {
      postOAuthToken: async () => {
        exchanges++;
        return {
          data: {
            accessToken: "access",
            refreshToken: "refresh",
            isNewUser: true,
          },
        };
      },
    },
    "@/api/userInfoApi": {
      getMyPage: async () => {
        profiles++;
        return { data: { username: "user" } };
      },
    },
    "@/utils/authTokenStorage": {
      setAuthTokens: async (tokens, method) => {
        assert.equal(method, "oauth");
        saves++;
      },
    },
    "@/utils/diagnosisFlow": {
      syncAuthenticatedDiagnosisRequirement: async () => {
        syncs++;
      },
    },
    "@/utils/legalConsentFlow": { getAuthenticatedPath: async () => "/home" },
    "@react-native-async-storage/async-storage": { setItem: async () => {} },
  });
  const first = completeOAuthLoginOnce("same-code");
  const duplicate = completeOAuthLoginOnce("same-code");
  assert.equal(first, duplicate);
  assert.deepEqual(await first, {
    pathname: "/auth/terms",
    params: { newUser: "true" },
  });
  assert.equal(await duplicate, await first);
  assert.deepEqual([exchanges, saves, profiles, syncs], [1, 1, 1, 1]);
});

test("failed OAuth persistence removes partial tokens and auto-login state", async () => {
  const cleared = [];
  const { completeOAuthLoginOnce } = loadTypeScript("../utils/oauthLogin.ts", {
    "@/api/authApi": {
      postOAuthToken: async () => ({
        data: { accessToken: "access", refreshToken: "refresh" },
      }),
    },
    "@/api/userInfoApi": {},
    "@/utils/authTokenStorage": {
      setAuthTokens: async () => {
        throw new Error("keychain unavailable");
      },
      clearAuthTokens: async () => cleared.push("tokens"),
    },
    "@/utils/diagnosisFlow": {},
    "@/utils/legalConsentFlow": {},
    "@react-native-async-storage/async-storage": {
      removeItem: async (key) => cleared.push(key),
    },
  });
  await assert.rejects(completeOAuthLoginOnce("code"), /keychain unavailable/);
  assert.deepEqual(cleared.sort(), ["autoLogin", "tokens"]);
});

/** 화면과 앱 상태를 대체해 실제 예약 감시 effect를 실행한다. */
function watcherSetup({
  initialState = "active",
  token = "access",
  getRinging,
} = {}) {
  let effect, appStateListener;
  const routes = [];
  const appState = {
    currentState: initialState,
    addEventListener: (_, listener) => {
      appStateListener = listener;
      return { remove: () => {} };
    },
  };
  const { default: Watcher } = loadTypeScript(
    "../components/train/ScheduledCallWatcher.tsx",
    {
      "@/api/trainingCallApi": { getRingingTrainingCallSchedule: getRinging },
      "@/utils/authTokenStorage": { getAccessToken: async () => token },
      "@/utils/trainingCallScenario": {
        getTrainingCallScenario: async () => "17",
      },
      "expo-router": {
        usePathname: () => "/home",
        useSegments: () => ["(tabs)", "(home)", "home"],
        router: {
          canDismiss: () => false,
          push: (route) => routes.push(route),
        },
      },
      react: {
        useEffect: (callback) => {
          effect = callback;
        },
        useRef: (initial) => ({ current: initial }),
      },
      "react-native": { AppState: appState },
    },
  );
  Watcher();
  const cleanup = effect();
  return {
    cleanup,
    routes,
    resume: () => {
      appState.currentState = "active";
      appStateListener("active");
    },
  };
}

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

test("reopening the app recovers a server reservation and opens only one receive screen", async (t) => {
  let requests = 0;
  const watcher = watcherSetup({
    initialState: "background",
    getRinging: async () => {
      requests++;
      return { scheduleId: 7, status: "RINGING" };
    },
  });
  t.after(watcher.cleanup);
  await flushAsync();
  assert.equal(requests, 0);
  watcher.resume();
  await flushAsync();
  watcher.resume();
  await flushAsync();
  assert.equal(requests, 2);
  assert.equal(watcher.routes.length, 1);
  assert.equal(watcher.routes[0].pathname, "/train");
  assert.equal(watcher.routes[0].params.scheduleId, "7");
});

test("a reservation response from an unmounted screen cannot interrupt the next screen", async () => {
  let resolve, signal;
  const watcher = watcherSetup({
    getRinging: (requestSignal) => {
      signal = requestSignal;
      return new Promise((done) => {
        resolve = done;
      });
    },
  });
  await flushAsync();
  watcher.cleanup();
  assert.equal(signal.aborted, true);
  resolve({ scheduleId: 7, status: "RINGING" });
  await flushAsync();
  assert.equal(watcher.routes.length, 0);
});

test("reservation polling never sends an anonymous request", async (t) => {
  let requests = 0;
  const watcher = watcherSetup({
    token: null,
    getRinging: async () => {
      requests++;
    },
  });
  t.after(watcher.cleanup);
  await flushAsync();
  assert.equal(requests, 0);
  assert.equal(watcher.routes.length, 0);
});

test("scheduled scenario IDs survive a fresh module load and are removed after use", async () => {
  const stored = new Map();
  const mocks = {
    "@react-native-async-storage/async-storage": {
      setItem: async (key, value) => stored.set(key, value),
      getItem: async (key) => stored.get(key) ?? null,
      removeItem: async (key) => stored.delete(key),
    },
  };
  const beforeRestart = loadTypeScript(
    "../utils/trainingCallScenario.ts",
    mocks,
  );
  await beforeRestart.saveTrainingCallScenario(7, 17);
  const afterRestart = loadTypeScript(
    "../utils/trainingCallScenario.ts",
    mocks,
  );
  assert.equal(await afterRestart.getTrainingCallScenario(7), "17");
  assert.equal(await afterRestart.getTrainingCallScenario(8), undefined);
  await afterRestart.removeTrainingCallScenario(7);
  assert.equal(await afterRestart.getTrainingCallScenario(7), undefined);
  stored.set("trainingCallScenario:7", "not-an-id");
  assert.equal(await afterRestart.getTrainingCallScenario(7), undefined);
});

/** 앱 시작 인증 검사의 중단과 재실행을 실제 effect로 검증한다. */
function rootSetup() {
  let pathname = "/";
  let refIndex = 0;
  const refs = [];
  let effects = [];
  const tokenResolvers = [];
  const routes = [];
  let clears = 0;
  const jsxRuntime = { jsx: () => null, jsxs: () => null };
  const mocks = {
    "@/design-system": { SEMANTIC_COLORS: { background: { normal: "white" } } },
    "@/global.css": {},
    "@/design-system/setupDefaultFont": {},
    "@react-native-async-storage/async-storage": {
      getItem: async () => "true",
    },
    "@tanstack/react-query": {
      QueryClient: class {},
      QueryClientProvider: () => null,
    },
    "@/components/train/ScheduledCallWatcher": { default: () => null },
    "@/context/AppAlertContext": {},
    "expo-audio": { setAudioModeAsync: async () => {} },
    "expo-splash-screen": {
      preventAutoHideAsync: async () => {},
      hideAsync: async () => {},
    },
    "expo-router": {
      useRootNavigationState: () => ({ key: "ready" }),
      usePathname: () => pathname,
      router: { replace: (route) => routes.push(route) },
      Stack: () => null,
    },
    react: {
      useEffect: (effect) => effects.push(effect),
      useRef: (initial) => {
        const index = refIndex++;
        return (refs[index] ??= { current: initial });
      },
      useState: (initial) => [initial, () => {}],
      createElement: () => null,
    },
    "react-native-safe-area-context": {},
    "@/utils/legalConsentFlow": { getAuthenticatedPath: async () => "/home" },
    "@/utils/authTokenStorage": {
      getAccessToken: () =>
        new Promise((resolve) => tokenResolvers.push(resolve)),
      clearAuthTokens: async () => {
        clears++;
      },
    },
    "@/hooks/usePushNotifications": {},
    "@/services/pushNotifications": {
      unregisterForPushNotifications: async () => {},
    },
    "react/jsx-runtime": jsxRuntime,
  };
  const filename = path.resolve(__dirname, "../app/_layout.tsx");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.require = (id) => {
    assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
    return mocks[id];
  };
  loaded._compile(compiled, filename);
  return {
    render: (nextPath) => {
      pathname = nextPath;
      refIndex = 0;
      effects = [];
      loaded.exports.default();
      return effects[1];
    },
    tokenResolvers,
    routes,
    get clears() {
      return clears;
    },
  };
}

test("startup checks canceled by an OAuth deep link never delete callback tokens or redirect", async (t) => {
  const previousRequestFrame = global.requestAnimationFrame;
  const previousCancelFrame = global.cancelAnimationFrame;
  global.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {};
  t.after(() => {
    global.requestAnimationFrame = previousRequestFrame;
    global.cancelAnimationFrame = previousCancelFrame;
  });
  const root = rootSetup();
  const cleanup = root.render("/")();
  cleanup();
  const callbackCleanup = root.render("/auth/callback")();
  root.tokenResolvers[0](null);
  await flushAsync();
  assert.equal(root.clears, 0);
  assert.deepEqual(root.routes, []);
  callbackCleanup();
});

test("startup authentication can restart after Strict Mode effect cleanup", async () => {
  const root = rootSetup();
  const start = root.render("/");
  start()();
  const cleanup = start();
  assert.equal(root.tokenResolvers.length, 2);
  root.tokenResolvers[1]("access");
  root.tokenResolvers[0](null);
  await flushAsync();
  assert.equal(root.clears, 0);
  assert.deepEqual(root.routes, ["/home"]);
  cleanup();
});

/** 동일한 기기 저장소를 공유하여 로그인 방식의 계정별 보존과 삭제를 검증한다. */
function authStorageSetup(platform = "web") {
  const stored = new Map();
  const secure = new Map();
  const mocks = {
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => stored.get(key) ?? null,
      setItem: async (key, value) => stored.set(key, value),
      removeItem: async (key) => stored.delete(key),
      multiRemove: async (keys) => keys.forEach((key) => stored.delete(key)),
    },
    "expo-secure-store": {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device",
      getItemAsync: async (key) => secure.get(key) ?? null,
      setItemAsync: async (key, value) => secure.set(key, value),
      deleteItemAsync: async (key) => secure.delete(key),
    },
    "react-native": { Platform: { OS: platform } },
    "jwt-decode": require("jwt-decode"),
  };
  const reload = () => loadTypeScript("../utils/authTokenStorage.ts", mocks);
  return { stored, secure, reload, api: reload() };
}

/** 테스트용 JWT에 계정 식별자를 넣는다. */
function tokensFor(subject, generation = 1) {
  const payload = Buffer.from(
    JSON.stringify({ sub: subject, generation }),
  ).toString("base64url");
  return {
    accessToken: `eyJhbGciOiJub25lIn0.${payload}.test`,
    refreshToken: `refresh-${subject}-${generation}`,
  };
}

test("password login remains identifiable after restarting the app", async () => {
  const storage = authStorageSetup();
  await storage.api.setAuthTokens(tokensFor("101"), "password");
  assert.equal(await storage.reload().getAuthLoginMethod(), "password");
});

test("OAuth login is preserved across token refresh and cleared on logout", async () => {
  const storage = authStorageSetup();
  await storage.api.setAuthTokens(tokensFor("101"), "oauth");
  await storage.api.setAuthTokens(tokensFor("101", 2));
  assert.equal(await storage.api.getAuthLoginMethod(), "oauth");
  await storage.api.clearAuthTokens();
  assert.equal(await storage.api.getAuthLoginMethod(), null);
  assert.equal(storage.stored.has("auth:loginMethod"), false);
});

test("switching accounts cannot inherit password access from the previous account", async () => {
  const storage = authStorageSetup();
  await storage.api.setAuthTokens(tokensFor("101"), "password");
  await storage.api.setAuthTokens(tokensFor("202"));
  assert.equal(await storage.api.getAuthLoginMethod(), null);
  await storage.api.setAuthTokens(tokensFor("202"), "oauth");
  assert.equal(await storage.api.getAuthLoginMethod(), "oauth");
});

test("legacy sessions and malformed login metadata do not imply password login", async () => {
  const storage = authStorageSetup();
  await storage.api.setAuthTokens(tokensFor("101"));
  assert.equal(await storage.api.getAuthLoginMethod(), null);
  for (const value of [
    "invalid-json",
    "null",
    '{"subject":"101","method":"google"}',
    '{"subject":"202","method":"password"}',
  ]) {
    storage.stored.set("auth:loginMethod", value);
    assert.equal(await storage.api.getAuthLoginMethod(), null);
  }
});

test("native login metadata contains no tokens and native logout removes secure credentials", async () => {
  const storage = authStorageSetup("ios");
  const tokens = tokensFor("101");
  await storage.api.setAuthTokens(tokens, "password");
  assert.equal(await storage.api.getAuthLoginMethod(), "password");
  assert.equal(storage.stored.has("accessToken"), false);
  assert.equal(storage.stored.has("refreshToken"), false);
  assert.deepEqual(JSON.parse(storage.stored.get("auth:loginMethod")), {
    subject: "101",
    method: "password",
  });
  await storage.api.clearAuthTokens();
  assert.equal(storage.secure.size, 0);
  assert.equal(storage.stored.size, 0);
});
