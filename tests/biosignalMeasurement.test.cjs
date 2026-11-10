const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

/** 외부 모듈을 대체하여 실제 측정 세션 코드를 실행한다. */
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

const uploadBody = loadTypeScript("../services/biosignal/uploadBody.ts", {});
const flush = () => new Promise(setImmediate);
const START_MS = 1_762_300_000_000;
const WATCH_AHEAD_MS = 5_000;

/** 회복·재요청 타이머와 시각을 테스트가 움직인다. */
const useClock = (t) => t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: START_MS });

/** 워치 명령·이벤트와 파일·대기열을 기록용으로 바꾼 측정 세션을 만든다. */
function createSession({ startResult = async () => true } = {}) {
  const commands = [], saved = [], files = new Map();
  let statusListener, dataListener, nextId = 0, flushes = 0, clears = 0;
  class File {
    constructor(uri) { this.uri = uri; }
    get exists() { return files.has(this.uri); }
    async text() { return files.get(this.uri); }
    delete() { files.delete(this.uri); }
  }
  const session = loadTypeScript("../services/biosignal/measurementSession.ts", {
    "expo-crypto": { randomUUID: () => `m-${++nextId}` },
    "expo-file-system": { File },
    "@/utils/wearBiosignal": {
      startWatchMeasurement: (id) => { commands.push(["start", id]); return startResult(id); },
      stopWatchMeasurement: async (id) => { commands.push(["stop", id]); return true; },
      cancelWatchMeasurement: async (id) => { commands.push(["cancel", id]); return true; },
      ackWatchMeasurement: async (id) => { commands.push(["ack", id]); return true; },
      addWatchStatusListener: (listener) => { statusListener = listener; },
      addWatchDataListener: (listener) => { dataListener = listener; },
    },
    "./uploadBody": uploadBody,
    "./uploadQueue": {
      saveBiosignalUpload: (sessionId, body) => saved.push({ sessionId, body }),
      flushBiosignalUploads: async () => { flushes++; },
      clearBiosignalUploads: () => { clears++; },
    },
  });

  /** 워치가 보내는 5초 상태. 전송 지연은 delayMs */
  const sendStatus = (id, state = "measuring", delayMs = 30) => statusListener({
    id, state, watchMs: Date.now() + WATCH_AHEAD_MS - delayMs, trackers: [], error: null, phoneReceivedMs: Date.now(),
  });
  /** 워치가 세션 파일을 보낸다. 신호는 휴식 시작부터 1초 간격 심박 */
  const sendFile = async (id, { fromMs = START_MS, toMs = Date.now() } = {}) => {
    const uri = `file:///data/biosignal/${id}.watch.json`;
    const hr = [];
    for (let t = fromMs - 10_000; t <= toMs + 10_000; t += 1_000) hr.push([t + WATCH_AHEAD_MS, 72, 1]);
    files.set(uri, JSON.stringify({
      id, watch_sent_ms: Date.now() + WATCH_AHEAD_MS - 2_000, device: { model: "SM-R960", sdk: "1.4.1" },
      hr, ibi: [], eda: [], skin_temp: [], acc: [], ppg: [],
    }));
    dataListener({ id, uri, phoneReceivedMs: Date.now() });
    await flush();
    return uri;
  };
  return {
    session, commands, saved, files, sendStatus, sendFile,
    get flushes() { return flushes; },
    get clears() { return clears; },
  };
}

test("a measured call records markers and clock and saves the upload when the watch file arrives", async (t) => {
  useClock(t);
  const s = createSession();
  const { session } = s;
  assert.equal(await session.startBiosignalMeasurement("session-1"), true);
  session.markBiosignalRestStart();
  s.sendStatus("m-1", "measuring", 400);
  t.mock.timers.tick(120_000);
  session.markBiosignalRestEnd();
  session.markBiosignalRinging();
  t.mock.timers.tick(15_000);
  session.markBiosignalMeditationStart();
  t.mock.timers.tick(30_000);
  session.markBiosignalMeditationEnd();
  session.markBiosignalWsAuthSent(Date.now());
  s.sendStatus("m-1", "measuring", 20);
  assert.equal(session.isBiosignalMeasuring(), true);
  t.mock.timers.tick(90_000);
  session.markBiosignalCallEnd();
  assert.equal(session.isBiosignalMeasuring(), false);

  t.mock.timers.tick(59_999);
  assert.deepEqual(s.commands, [["start", "m-1"]]);
  t.mock.timers.tick(1);
  assert.deepEqual(s.commands.at(-1), ["stop", "m-1"]);

  const uri = await s.sendFile("m-1");
  assert.equal(s.saved.length, 1);
  const { sessionId, body } = s.saved[0];
  assert.equal(sessionId, "session-1");
  assert.deepEqual(body.markers, {
    ringing_ms: START_MS + 120_000,
    rest_baseline: [START_MS, START_MS + 120_000],
    meditation: [START_MS + 135_000, START_MS + 165_000],
    recovery_end_ms: START_MS + 315_000,
  });
  assert.deepEqual(body.clock, {
    phone_ws_open_ms: START_MS + 165_000,
    phone_call_end_ms: START_MS + 255_000,
    watch_minus_phone_ms: WATCH_AHEAD_MS - 20,
  });
  // 휴식 시작부터 회복 끝까지(워치 시계로 +4,980ms)의 행만 남는다.
  assert.equal(body.hr[0][0], START_MS + 5_000);
  assert.equal(body.hr.at(-1)[0], START_MS + 319_000);
  assert.deepEqual(s.commands.at(-1), ["ack", "m-1"]);
  assert.equal(s.files.has(uri), false);
  assert.equal(s.flushes, 1);
});

test("leaving the call screen before the call ends cancels the measurement but keeps an ended call", async (t) => {
  useClock(t);
  const s = createSession();
  const { session } = s;
  await session.startBiosignalMeasurement(null);
  session.cancelBiosignalMeasurementBeforeCallEnd();
  assert.deepEqual(s.commands, [["start", "m-1"], ["cancel", "m-1"]]);
  assert.equal(session.isBiosignalMeasuring(), false);

  await session.startBiosignalMeasurement("session-2");
  session.markBiosignalCallEnd();
  session.cancelBiosignalMeasurementBeforeCallEnd();
  assert.deepEqual(s.commands.at(-1), ["start", "m-2"]);
  session.finishBiosignalRecovery();
  assert.deepEqual(s.commands.at(-1), ["stop", "m-2"]);
});

test("a measurement that could not start or was cancelled while starting reports false", async (t) => {
  useClock(t);
  const failed = createSession({ startResult: async () => false });
  assert.equal(await failed.session.startBiosignalMeasurement("s"), false);
  assert.equal(failed.session.isBiosignalMeasuring(), false);

  let release;
  const pending = createSession({ startResult: () => new Promise((resolve) => { release = resolve; }) });
  const started = pending.session.startBiosignalMeasurement("s");
  pending.session.cancelBiosignalMeasurement();
  release(true);
  assert.equal(await started, false);
  assert.deepEqual(pending.commands, [["start", "m-1"], ["cancel", "m-1"]]);
});

test("a watch error while measuring drops the measurement so the call goes on without biosignal frames", async (t) => {
  useClock(t);
  const s = createSession();
  await s.session.startBiosignalMeasurement("s");
  s.sendStatus("other", "error");
  assert.equal(s.session.isBiosignalMeasuring(), true);
  s.sendStatus("m-1", "error");
  assert.equal(s.session.isBiosignalMeasuring(), false);
  assert.deepEqual(s.commands.at(-1), ["cancel", "m-1"]);
});

test("files of cancelled or unknown measurements are acknowledged and deleted without uploading", async (t) => {
  useClock(t);
  const s = createSession();
  await s.session.startBiosignalMeasurement("s");
  s.session.cancelBiosignalMeasurement();
  const uri = await s.sendFile("m-1");
  assert.equal(s.saved.length, 0);
  assert.equal(s.files.has(uri), false);
  assert.deepEqual(s.commands.at(-1), ["ack", "m-1"]);
  assert.equal(s.flushes, 0);
});

test("a call whose socket never authenticated is not uploaded", async (t) => {
  useClock(t);
  const s = createSession();
  const { session } = s;
  await session.startBiosignalMeasurement("s");
  session.markBiosignalRinging();
  session.markBiosignalCallEnd();
  session.finishBiosignalRecovery();
  await s.sendFile("m-1");
  assert.equal(s.saved.length, 0);
  assert.deepEqual(s.commands.at(-1), ["ack", "m-1"]);
});

test("a missing watch file is requested again and given up after three requests", async (t) => {
  useClock(t);
  const s = createSession();
  const { session } = s;
  await session.startBiosignalMeasurement("s");
  session.markBiosignalRinging();
  session.markBiosignalWsAuthSent(Date.now());
  session.markBiosignalCallEnd();
  t.mock.timers.tick(10_000);
  session.finishBiosignalRecovery();
  const stops = () => s.commands.filter(([command]) => command === "stop").length;
  assert.equal(stops(), 1);
  t.mock.timers.tick(29_999);
  assert.equal(stops(), 1);
  t.mock.timers.tick(1);
  assert.equal(stops(), 2);
  t.mock.timers.tick(30_000);
  assert.equal(stops(), 3);
  t.mock.timers.tick(60_000);
  assert.equal(stops(), 3);
  await s.sendFile("m-1");
  assert.equal(s.saved.length, 0);
});

test("signing out discards the active measurement, pending files and stored uploads", async (t) => {
  useClock(t);
  const s = createSession();
  const { session } = s;
  await session.startBiosignalMeasurement("s1");
  session.markBiosignalCallEnd();
  session.finishBiosignalRecovery();
  await session.startBiosignalMeasurement("s2");
  session.discardBiosignalData();
  assert.deepEqual(s.commands.filter(([command]) => command === "cancel"), [["cancel", "m-2"], ["cancel", "m-1"]]);
  assert.equal(s.clears, 1);
  await s.sendFile("m-1");
  assert.equal(s.saved.length, 0);
});

/** 통화 화면의 측정 준비 훅을 기록용 의존성으로 실행한다. */
function createCallPrepare({
  isEnabled = true,
  isSupported = true,
  isConnected = true,
  consent = { biosignalAgreed: true },
  isAsked = false,
  consentAnswer = true,
  isRestNeeded = false,
  isStarted = true,
} = {}) {
  const calls = [], states = [];
  let stateIndex = 0, focus;
  const { useBiosignalMeasurement } = loadTypeScript("../hooks/useBiosignalMeasurement.ts", {
    "@/api/legalConsentApi": {
      getLegalConsentStatus: async () => {
        calls.push("consentStatus");
        if (consent instanceof Error) throw consent;
        return consent;
      },
    },
    "@/context/AppAlertContext": { useAppAlert: () => ({ showAlert: () => {} }) },
    "@/hooks/useBiosignalConsentGuard": {
      askBiosignalConsent: async () => { calls.push("ask"); return consentAnswer; },
    },
    "@/services/biosignal/measurementSession": {
      attachBiosignalSession: (id) => calls.push(`attach:${id}`),
      cancelBiosignalMeasurement: () => calls.push("cancel"),
      cancelBiosignalMeasurementBeforeCallEnd: () => calls.push("cancelBeforeCallEnd"),
      markBiosignalRestEnd: () => calls.push("restEnd"),
      markBiosignalRestStart: () => calls.push("restStart"),
      markBiosignalRinging: () => calls.push("ringing"),
      startBiosignalMeasurement: async (sessionId) => { calls.push(`start:${sessionId}`); return isStarted; },
    },
    "@/utils/biosignalSettings": {
      isBiosignalSupported: isSupported,
      loadIsCallConsentAsked: async () => isAsked,
      loadIsRestBaselineNeeded: async () => isRestNeeded,
      saveCallConsentAsked: async () => { calls.push("saveAsked"); },
    },
    "@/utils/wearBiosignal": {
      getWatchConnection: async () => ({ isConnected, nodeId: null, displayName: null }),
    },
    "expo-router": { useFocusEffect: (callback) => { focus = callback; } },
    react: {
      useCallback: (callback) => callback,
      useEffect: () => {},
      useRef: (initial) => ({ current: initial }),
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (next) => { states[index] = next; }];
      },
    },
  });
  const render = () => { stateIndex = 0; return useBiosignalMeasurement({ isEnabled, sessionId: "session-1" }); };
  render();
  return {
    calls,
    render,
    /** 화면에 들어와 준비가 끝날 때까지 기다린다. 화면을 떠날 때 부를 정리 함수를 돌려준다. */
    enter: async () => { const leave = focus(); await flush(); await flush(); return leave; },
  };
}

test("calls that cannot be measured go straight to the incoming screen without asking anything", async () => {
  for (const options of [{ isEnabled: false }, { isSupported: false }, { isConnected: false }]) {
    const s = createCallPrepare(options);
    await s.enter();
    assert.equal(s.render().phase, "ready");
    assert.deepEqual(s.calls, [], JSON.stringify(options));
  }
});

test("an agreed account measures from ringing, or from the rest screen when a baseline is needed", async () => {
  const ringing = createCallPrepare();
  assert.equal(ringing.render().phase, "checking");
  await ringing.enter();
  assert.equal(ringing.render().phase, "ready");
  assert.deepEqual(ringing.calls, ["consentStatus", "start:session-1", "ringing"]);

  const rest = createCallPrepare({ isRestNeeded: true });
  await rest.enter();
  assert.equal(rest.render().phase, "rest");
  assert.deepEqual(rest.calls, ["consentStatus", "start:session-1", "restStart"]);
  rest.render().finishRest();
  assert.equal(rest.render().phase, "ready");
  assert.deepEqual(rest.calls.slice(-2), ["restEnd", "ringing"]);
});

test("the consent popup appears once per device before the first measured call", async () => {
  const agreed = createCallPrepare({ consent: { biosignalAgreed: false } });
  await agreed.enter();
  assert.deepEqual(agreed.calls, ["consentStatus", "saveAsked", "ask", "start:session-1", "ringing"]);

  const declined = createCallPrepare({ consent: { biosignalAgreed: false }, consentAnswer: false });
  await declined.enter();
  assert.equal(declined.render().phase, "ready");
  assert.deepEqual(declined.calls, ["consentStatus", "saveAsked", "ask"]);

  const asked = createCallPrepare({ consent: { biosignalAgreed: false }, isAsked: true });
  await asked.enter();
  assert.equal(asked.render().phase, "ready");
  assert.deepEqual(asked.calls, ["consentStatus"]);
});

test("a consent check failure or a watch that does not start leaves the call unmeasured", async () => {
  const offline = createCallPrepare({ consent: new Error("offline") });
  await offline.enter();
  assert.equal(offline.render().phase, "ready");
  assert.deepEqual(offline.calls, ["consentStatus"]);

  const notStarted = createCallPrepare({ isRestNeeded: true, isStarted: false });
  await notStarted.enter();
  assert.equal(notStarted.render().phase, "ready");
  assert.deepEqual(notStarted.calls, ["consentStatus", "start:session-1"]);
});

test("leaving the call screen drops a measurement that has not reached the end of the call", async () => {
  const s = createCallPrepare();
  const leave = await s.enter();
  leave();
  assert.equal(s.calls.at(-1), "cancelBeforeCallEnd");
});
