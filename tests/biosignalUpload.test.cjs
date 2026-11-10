const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

/** 외부 모듈을 대체하여 실제 업로드 처리 코드를 실행한다. */
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

const MINUTE = 60 * 1000;
const RINGING_MS = 1_762_300_120_000;
/** 휴식 2분 → 벨 → 3분 통화 → 회복 1분. 모두 폰 ms */
const CALL_TIMES = {
  phoneWsOpenMs: RINGING_MS + 30_000,
  phoneCallEndMs: RINGING_MS + 3 * MINUTE,
  ringingMs: RINGING_MS,
  restBaseline: [RINGING_MS - 2 * MINUTE, RINGING_MS],
  meditation: null,
  recoveryEndMs: RINGING_MS + 4 * MINUTE,
};
const WATCH_AHEAD_MS = 5_000; // 워치 시계가 폰보다 5초 빠름

/** 폰 ms를 워치 ms로 바꾼다. */
const watchMs = (phoneMs) => phoneMs + WATCH_AHEAD_MS;

function createWatchFile(overrides = {}) {
  return {
    id: "session-1",
    watchSentMs: watchMs(CALL_TIMES.recoveryEndMs + 1_000),
    device: { model: "SM-R960", sdk: "1.4.1" },
    hr: [],
    ibi: [],
    eda: [],
    skinTemp: [],
    acc: [],
    ppg: [],
    ...overrides,
  };
}

const build = (file, times = CALL_TIMES) =>
  uploadBody.buildBiosignalUploadBody(file, times, WATCH_AHEAD_MS);

test("clock offset uses the sample with the shortest transfer delay and rejects offsets beyond one day", () => {
  const { estimateWatchMinusPhoneMs } = uploadBody;
  assert.equal(estimateWatchMinusPhoneMs([
    { watchMs: 10_000, phoneReceivedMs: 5_300 },
    { watchMs: 20_000, phoneReceivedMs: 15_020 },
    { watchMs: Number.NaN, phoneReceivedMs: 0 },
  ]), 4_980);
  assert.equal(estimateWatchMinusPhoneMs([]), null);
  assert.equal(estimateWatchMinusPhoneMs([{ watchMs: 24 * 60 * MINUTE, phoneReceivedMs: 0 }]), 24 * 60 * MINUTE);
  assert.equal(estimateWatchMinusPhoneMs([{ watchMs: 0, phoneReceivedMs: 24 * 60 * MINUTE + 1 }]), null);
});

test("watch session file is parsed defensively", () => {
  const { parseWatchSessionFile } = uploadBody;
  assert.equal(parseWatchSessionFile("not-json"), null);
  assert.equal(parseWatchSessionFile(JSON.stringify({ id: "a" })), null);
  assert.equal(parseWatchSessionFile(JSON.stringify([1, 2])), null);

  const parsed = parseWatchSessionFile(JSON.stringify({
    id: "a",
    watch_sent_ms: 100,
    device: { model: "M".repeat(70), sdk: "S".repeat(40) },
    hr: [[1, 72, 1]],
    skin_temp: [[1, 33, 0]],
    ppg: "broken",
  }));
  assert.equal(parsed.device.model.length, 64);
  assert.equal(parsed.device.sdk.length, 32);
  assert.deepEqual(parsed.hr, [[1, 72, 1]]);
  assert.deepEqual(parsed.skinTemp, [[1, 33, 0]]);
  assert.deepEqual(parsed.ppg, []);
  assert.deepEqual(parsed.ibi, []);
  assert.equal(parseWatchSessionFile(JSON.stringify({ id: "a", watch_sent_ms: 1, device: { model: 1 } })).device, null);
});

test("upload body has only the fields the server defines", () => {
  const body = build(createWatchFile());
  assert.deepEqual(Object.keys(body).sort(),
    ["acc", "clock", "device", "eda", "hr", "ibi", "markers", "ppg", "skin_temp", "source", "v"]);
  assert.deepEqual(body.clock, {
    phone_ws_open_ms: CALL_TIMES.phoneWsOpenMs,
    phone_call_end_ms: CALL_TIMES.phoneCallEndMs,
    watch_minus_phone_ms: WATCH_AHEAD_MS,
  });
  assert.deepEqual(body.markers, {
    ringing_ms: CALL_TIMES.ringingMs,
    rest_baseline: CALL_TIMES.restBaseline,
    meditation: null,
    recovery_end_ms: CALL_TIMES.recoveryEndMs,
  });
  assert.equal(body.v, 1);
  assert.equal(body.source, "samsung_sensor_sdk");
  assert.deepEqual(body.device, { model: "SM-R960", sdk: "1.4.1" });
});

test("rows outside rest start to recovery end are trimmed using the watch clock", () => {
  const restStart = watchMs(CALL_TIMES.restBaseline[0]);
  const recoveryEnd = watchMs(CALL_TIMES.recoveryEndMs);
  const body = build(createWatchFile({
    hr: [[restStart - 1, 70, 1], [restStart, 71, 1], [recoveryEnd, 72, 1], [recoveryEnd + 1, 73, 1]],
  }));
  assert.deepEqual(body.hr, [[restStart, 71, 1], [recoveryEnd, 72, 1]]);
});

test("a rest shorter than two minutes is sent as no rest and the window starts at ringing", () => {
  const shortRest = [RINGING_MS - 2 * MINUTE + 1, RINGING_MS];
  const ringing = watchMs(RINGING_MS);
  const body = build(createWatchFile({
    hr: [[ringing - 1_000, 70, 1], [ringing, 71, 1]],
  }), { ...CALL_TIMES, restBaseline: shortRest });
  assert.equal(body.markers.rest_baseline, null);
  assert.deepEqual(body.hr, [[ringing, 71, 1]]);
});

test("rows that break the server value rules are dropped", () => {
  const t = watchMs(RINGING_MS);
  const body = build(createWatchFile({
    hr: [[t, 30, 1], [t, 220, 1], [t, 29, 1], [t, 221, 1], [t, 80, 0], [t, "80", 1], [t, 80], null],
    ibi: [[t, 250, 0], [t, 2000, 0], [t, 249, 0], [t, 2001, 0], [t, 800, -1]],
    eda: [[t, 0.1, 0], [t, 100, 2], [t, 0, 0], [t, 100.1, 0], [t, 5, -1]],
    skinTemp: [[t, 20, 0], [t, 45, 1], [t, 19.9, 0], [t, 45.1, 0]],
    acc: [[t, 1.01, 0.03], [t, Number.NaN, 0.03], [t, 1.01]],
  }));
  assert.deepEqual(body.hr, [[t, 30, 1], [t, 220, 1]]);
  assert.deepEqual(body.ibi, [[t, 250, 0], [t, 2000, 0]]);
  assert.deepEqual(body.eda, [[t, 0.1, 0], [t, 100, 2]]);
  assert.deepEqual(body.skin_temp, [[t, 20, 0], [t, 45, 1]]);
  assert.deepEqual(body.acc, [[t, 1.01, 0.03]]);
});

test("row counts are capped from the start", () => {
  const t = watchMs(RINGING_MS);
  const body = build(createWatchFile({
    hr: Array.from({ length: 7_201 }, (_, index) => [t, index === 7_200 ? 99 : 72, 1]),
    ibi: Array.from({ length: 15_001 }, () => [t, 800, 0]),
  }));
  assert.equal(body.hr.length, 7_200);
  assert.ok(body.hr.every(([, bpm]) => bpm === 72));
  assert.equal(body.ibi.length, 15_000);
});

test("ppg batches are cut to the window and dropped when shorter than four seconds", () => {
  const restStart = watchMs(CALL_TIMES.restBaseline[0]);
  const recoveryEnd = watchMs(CALL_TIMES.recoveryEndMs);
  const samples = (count) => Array.from({ length: count }, (_, index) => index);
  const body = build(createWatchFile({
    ppg: [
      // 휴식 시작 2초 전부터 10초: 앞 2초(50개)를 잘라 낸다.
      { t0: restStart - 2_000, hz: 25, green: samples(250) },
      // 회복 종료 3초 전부터 10초: 남는 3초는 4초보다 짧아 버린다.
      { t0: recoveryEnd - 3_000, hz: 25, green: samples(250) },
      { t0: restStart + 20_000, hz: 9, green: samples(90) },
      { t0: restStart + 30_000, hz: 25, green: [1, "2"] },
    ],
  }));
  assert.deepEqual(body.ppg, [{ t0: restStart, hz: 25, green: samples(250).slice(50) }]);
});

test("ppg keeps whole batches until the batch and sample limits", () => {
  const t = watchMs(RINGING_MS);
  const batch = (offsetMs, count) => ({ t0: t + offsetMs, hz: 100, green: new Array(count).fill(1) });
  const bySamples = build(createWatchFile({ ppg: [batch(0, 20_000), batch(0, 10_001), batch(0, 10_000)] }));
  assert.deepEqual(bySamples.ppg.map(({ green }) => green.length), [20_000]);

  // 4초짜리 묶음 201개(표본 20,100개)는 묶음 수 한도에 먼저 걸린다.
  const fourSeconds = { t0: t, hz: 25, green: new Array(100).fill(1) };
  const byBatches = build(createWatchFile({ ppg: Array.from({ length: 201 }, () => fourSeconds) }));
  assert.equal(byBatches.ppg.length, 200);
});

test("an oversized body drops ppg first", () => {
  const t = watchMs(RINGING_MS);
  const small = build(createWatchFile({ ppg: [{ t0: t, hz: 25, green: new Array(100).fill(1) }] }));
  assert.equal(small.ppg.length, 1);

  const large = build(createWatchFile({
    acc: Array.from({ length: 7_200 }, () => [t, 1.0123456789012345, 0.0312345678901234]),
    ibi: Array.from({ length: 15_000 }, () => [t, 833, 0]),
    ppg: Array.from({ length: 200 }, () => ({ t0: t, hz: 25, green: new Array(150).fill(123_456) })),
  }));
  assert.ok(JSON.stringify({ ...large, ppg: [] }).length <= uploadBody.MAX_UPLOAD_BODY_LENGTH);
  assert.deepEqual(large.ppg, []);
  assert.equal(large.acc.length, 7_200);
});

test("upload failures are kept, retried without ppg, or discarded by status", () => {
  const { resolveUploadFailure } = createQueue().queue;
  for (const status of [undefined, 401, 408, 429, 500, 502, 503]) {
    assert.equal(resolveUploadFailure(status), "retryLater", String(status));
  }
  assert.equal(resolveUploadFailure(413), "retryWithoutPpg");
  for (const status of [400, 403, 404, 409, 422]) {
    assert.equal(resolveUploadFailure(status), "discard", String(status));
  }
});

/** 메모리 파일 시스템 */
function createFileSystem() {
  const files = new Map();
  const directories = new Set();
  const join = (parts) => parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");
  class File {
    constructor(...parts) { this.uri = join(parts); }
    get name() { return this.uri.split("/").pop(); }
    get exists() { return files.has(this.uri); }
    write(text) { files.set(this.uri, text); }
    async text() {
      if (!files.has(this.uri)) throw new Error("missing file");
      return files.get(this.uri);
    }
    delete() {
      if (!files.delete(this.uri)) throw new Error("missing file");
    }
  }
  class Directory {
    constructor(...parts) { this.uri = join(parts); }
    get exists() { return directories.has(this.uri); }
    create() { directories.add(this.uri); }
    delete() {
      directories.delete(this.uri);
      for (const key of [...files.keys()]) if (key.startsWith(`${this.uri}/`)) files.delete(key);
    }
    list() {
      return [...files.keys()].filter((key) => key.startsWith(`${this.uri}/`)).sort().map((key) => new File(key));
    }
  }
  return { module: { File, Directory, Paths: { document: { uri: "documents" } } }, files };
}

/** 서버 응답을 순서대로 돌려주는 대기열을 만든다. 응답이 Error면 실패로 던진다. */
function createQueue(responses = []) {
  const fileSystem = createFileSystem();
  const uploads = [];
  const savedSources = [];
  const queue = loadTypeScript("../services/biosignal/uploadQueue.ts", {
    "expo-file-system": fileSystem.module,
    "@/api/biosignalApi": {
      uploadBiosignals: async (sessionId, body) => {
        uploads.push({ sessionId, body });
        const response = responses.shift();
        if (typeof response === "function") return response();
        if (response instanceof Error) throw response;
        return response ?? { session_id: sessionId, status: "ANALYZED" };
      },
    },
    "@/api/error": { getApiErrorStatus: (error) => error?.response?.status },
    "@/utils/biosignalSettings": {
      saveLastBaselineSource: async (source) => { savedSources.push(source); },
    },
    "./uploadBody": uploadBody,
  });
  return { queue, uploads, savedSources, files: fileSystem.files };
}

const httpError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

function createBody(overrides = {}) {
  const t = watchMs(RINGING_MS);
  return {
    ...build(createWatchFile({
      hr: [[t, 72, 1]],
      ppg: [{ t0: t, hz: 25, green: new Array(100).fill(1) }],
    }), { ...CALL_TIMES, phoneCallEndMs: Date.now() - MINUTE }),
    ...overrides,
  };
}

test("a successful upload deletes the stored body and remembers the baseline source", async () => {
  const report = { session_id: "s1", status: "ANALYZED", metrics: { cardiac: { baseline: { value: 70, source: "none" } } } };
  const { queue, uploads, savedSources, files } = createQueue([report]);
  const body = createBody();
  queue.saveBiosignalUpload("s1", body);
  await queue.flushBiosignalUploads();
  assert.deepEqual(uploads, [{ sessionId: "s1", body }]);
  assert.deepEqual(savedSources, ["none"]);
  assert.equal(files.size, 0);
});

test("a too large body is retried once without ppg", async () => {
  const { queue, uploads, files } = createQueue([httpError(413), undefined]);
  queue.saveBiosignalUpload("s1", createBody());
  await queue.flushBiosignalUploads();
  assert.equal(uploads.length, 2);
  assert.equal(uploads[0].body.ppg.length, 1);
  assert.deepEqual(uploads[1].body.ppg, []);
  assert.equal(files.size, 0);

  const withoutPpg = createQueue([httpError(413)]);
  withoutPpg.queue.saveBiosignalUpload("s2", createBody({ ppg: [] }));
  await withoutPpg.queue.flushBiosignalUploads();
  assert.equal(withoutPpg.uploads.length, 1);
  assert.equal(withoutPpg.files.size, 0);
});

test("network and server errors keep the body for the next flush", async () => {
  const { queue, uploads, files } = createQueue([new Error("Network Error"), httpError(503), undefined]);
  queue.saveBiosignalUpload("s1", createBody());
  await queue.flushBiosignalUploads();
  await queue.flushBiosignalUploads();
  assert.equal(files.size, 1);
  await queue.flushBiosignalUploads();
  assert.equal(uploads.length, 3);
  assert.equal(files.size, 0);
});

test("responses that will never succeed delete the body", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    for (const status of [403, 404, 409, 422]) {
      const { queue, files } = createQueue([httpError(status, { detail: "X" })]);
      queue.saveBiosignalUpload("s1", createBody());
      await queue.flushBiosignalUploads();
      assert.equal(files.size, 0, String(status));
    }
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
});

test("bodies older than 24 hours after the call or unreadable are deleted without uploading", async () => {
  const { queue, uploads, files } = createQueue();
  queue.saveBiosignalUpload("old", createBody({
    clock: { phone_ws_open_ms: 0, phone_call_end_ms: Date.now() - 24 * 60 * MINUTE - 1, watch_minus_phone_ms: 0 },
  }));
  files.set("documents/biosignal-upload/broken.json", "{\"sessionId\":");
  await queue.flushBiosignalUploads();
  assert.equal(uploads.length, 0);
  assert.equal(files.size, 0);
});

test("overlapping flushes upload each body once and pick up bodies saved meanwhile", async () => {
  let releaseFirst;
  const firstUpload = new Promise((resolve) => { releaseFirst = resolve; });
  const { queue, uploads, files } = createQueue([() => firstUpload.then(() => ({ status: "ANALYZED" }))]);
  queue.saveBiosignalUpload("s1", createBody());
  const first = queue.flushBiosignalUploads();
  const second = queue.flushBiosignalUploads();
  await new Promise((resolve) => setImmediate(resolve));
  queue.saveBiosignalUpload("s2", createBody());
  queue.flushBiosignalUploads();
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(uploads.map(({ sessionId }) => sessionId), ["s1", "s2"]);
  assert.equal(files.size, 0);
});

test("session ids that are not safe file names are refused and clearing removes every body", () => {
  const { queue, files } = createQueue();
  assert.throws(() => queue.saveBiosignalUpload("../s1", createBody()), /INVALID_SESSION_ID/);
  queue.saveBiosignalUpload("s1", createBody());
  queue.saveBiosignalUpload("s2", createBody());
  queue.clearBiosignalUploads();
  assert.equal(files.size, 0);
});

test("rest is needed before the first measured call and after a result without a baseline", async () => {
  const load = (stored, shouldFail = false) => loadTypeScript("../utils/biosignalSettings.ts", {
    "@react-native-async-storage/async-storage": {
      getItem: async () => {
        if (shouldFail) throw new Error("storage");
        return stored;
      },
      setItem: async () => undefined,
    },
    "react-native": { Platform: { OS: "android" } },
  }).loadIsRestBaselineNeeded();
  assert.equal(await load(null), true);
  assert.equal(await load("none"), true);
  assert.equal(await load("rest"), false);
  assert.equal(await load("previous_sessions"), false);
  assert.equal(await load(null, true), true);
});
