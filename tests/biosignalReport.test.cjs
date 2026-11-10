const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

/** 외부 모듈을 대체하여 실제 리포트 표시 코드를 실행한다. */
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

const reportUtils = loadTypeScript("../utils/biosignalReport.ts", {});
const { buildBiosignalReportView, formatCallSecond } = reportUtils;

/** 휴식 기준선이 있는 분석 결과. overrides로 cardiac·fusion 일부를 바꾼다. */
function analyzedReport({ baseline, hr, timeline, fusion } = {}) {
  return {
    session_id: "session-1",
    status: "ANALYZED",
    metrics: {
      cardiac: {
        baseline: { status: "MEASURED", value: 72.4, source: "rest", ...baseline },
        hr: {
          call_delta: { status: "MEASURED", value: 6.2 },
          peak: { status: "MEASURED", bpm: 95.3, delta: 22.9, at_sec: 83.4, phase: "speak", turn: 3 },
          recovery_pct: { status: "MEASURED", value: 61.6 },
          ...hr,
        },
        report_timeline: {
          bin_sec: 5,
          start_sec: -10,
          hr: [70, 71, null, 88, 95, 80],
          phase: ["baseline", "anticipation", "listen", "speak", "speak", "recovery"],
          ...timeline,
        },
      },
      fusion: {
        praise_turn: 3,
        turns: [
          { turn: 2, quadrant: "body_high_voice_shaky" },
          { turn: 3, quadrant: "body_high_voice_steady" },
        ],
        ...fusion,
      },
    },
  };
}

test("only analyzed results become a card", () => {
  assert.equal(buildBiosignalReportView(undefined), null);
  assert.equal(buildBiosignalReportView({ session_id: "s", status: "AWAITING_DATA" }), null);
  assert.equal(buildBiosignalReportView({ session_id: "s", status: "EXPIRED" }), null);
  assert.equal(buildBiosignalReportView({ session_id: "s", status: "ANALYZED" }), null);
});

test("a measured call with a rest baseline shows every element", () => {
  const view = buildBiosignalReportView(analyzedReport());
  assert.deepEqual(view, {
    chart: {
      binSec: 5,
      startSec: -10,
      bpm: [70, 71, null, 88, 95, 80],
      phases: ["baseline", "anticipation", "listen", "speak", "speak", "recovery"],
    },
    callChange: "통화하는 동안 심박이 평소보다 조금 빨랐어요.",
    peak: { atSec: 83.4, phase: "speak", bpm: 95.3 },
    recoveryPct: 62,
    sentence: "몸은 반응했지만 목소리는 끝까지 안정적이었어요.",
    baselineBpm: 72.4,
  });
});

test("call change is worded against the baseline without judging feelings", () => {
  const callChange = (value) =>
    buildBiosignalReportView(analyzedReport({ hr: { call_delta: { status: "MEASURED", value } } })).callChange;
  assert.equal(callChange(2.9), "통화하는 동안 심박이 평소와 비슷했어요.");
  assert.equal(callChange(-2.9), "통화하는 동안 심박이 평소와 비슷했어요.");
  assert.equal(callChange(-4), "통화하는 동안 심박이 평소보다 조금 느렸어요.");
  assert.equal(callChange(9.9), "통화하는 동안 심박이 평소보다 조금 빨랐어요.");
  assert.equal(callChange(10), "통화하는 동안 심박이 평소보다 빨랐어요.");
});

test("without a baseline nothing is compared with usual", () => {
  const view = buildBiosignalReportView(analyzedReport({
    baseline: { status: "INSUFFICIENT_DATA", value: undefined, source: "none" },
    fusion: { praise_turn: null },
  }));
  assert.equal(view.callChange, null);
  assert.equal(view.recoveryPct, null);
  assert.equal(view.baselineBpm, null);
  assert.deepEqual(view.peak, { atSec: 83.4, phase: "speak", bpm: 95.3 });
  assert.notEqual(view.chart, null);
  // 칭찬 턴이 없으면 가장 높았던 순간(턴 3)의 칸 문장을 쓴다.
  assert.equal(view.sentence, "몸은 반응했지만 목소리는 끝까지 안정적이었어요.");

  // 서버가 값을 보내더라도 출처가 none이면 '평소'로 말하지 않는다.
  const noneButMeasured = buildBiosignalReportView(analyzedReport({ baseline: { source: "none" } }));
  assert.equal(noneButMeasured.callChange, null);
  assert.equal(noneButMeasured.baselineBpm, null);
});

test("metrics that are not measured are hidden quietly", () => {
  const view = buildBiosignalReportView(analyzedReport({
    hr: {
      call_delta: { status: "INSUFFICIENT_DATA" },
      peak: { status: "UNAVAILABLE" },
      recovery_pct: { status: "INSUFFICIENT_DATA", reason: "recovery_too_short" },
    },
    fusion: { praise_turn: null },
  }));
  assert.equal(view.callChange, null);
  assert.equal(view.peak, null);
  assert.equal(view.recoveryPct, null);
  assert.equal(view.sentence, null);
  assert.notEqual(view.chart, null);

  const empty = buildBiosignalReportView(analyzedReport({
    hr: { call_delta: { status: "UNAVAILABLE" }, peak: { status: "UNAVAILABLE" }, recovery_pct: { status: "UNAVAILABLE" } },
    timeline: { hr: [null, 80, null, null, null, null] },
    fusion: { praise_turn: null },
  }));
  assert.equal(empty, null);
});

test("the chart keeps gaps and needs two points", () => {
  const chart = (timeline) => buildBiosignalReportView(analyzedReport({ timeline })).chart;
  assert.deepEqual(chart({ hr: [70, "x", -1, 75], phase: ["baseline"] }), {
    binSec: 5,
    startSec: -10,
    bpm: [70, null, null, 75],
    phases: ["baseline", null, null, null],
  });
  assert.equal(chart({ hr: [70, null, null] }), null);
  assert.equal(chart({ bin_sec: 0 }), null);
  assert.equal(chart({ start_sec: null }), null);
  assert.equal(chart({ hr: null }), null);
});

test("recovery is a whole percent up to 100 and a call that did not come back is not shown", () => {
  const recovery = (value) =>
    buildBiosignalReportView(analyzedReport({ hr: { recovery_pct: { status: "MEASURED", value } } })).recoveryPct;
  assert.equal(recovery(130.2), 100);
  assert.equal(recovery(0.6), 1);
  assert.equal(recovery(0.4), null);
  assert.equal(recovery(-25), null);
});

test("sentences come only from turns where the body reacted", () => {
  const sentence = (fusion, peak) =>
    buildBiosignalReportView(analyzedReport({ fusion, hr: peak ? { peak } : undefined })).sentence;
  assert.equal(
    sentence({ praise_turn: null }, { status: "MEASURED", bpm: 90, at_sec: 10, phase: "listen", turn: 2 }),
    "몸이 크게 반응한 순간이었어요. 이런 반응은 몸이 준비하는 자연스러운 신호예요.",
  );
  assert.equal(sentence({ praise_turn: 5, turns: [{ turn: 5, quadrant: "body_low_voice_steady" }] }), null);
  assert.equal(sentence({ praise_turn: 3, turns: [{ turn: 3, quadrant: null }] }), null);
  assert.equal(sentence({ praise_turn: 3, turns: null }), null);
});

test("a peak needs a time inside the call", () => {
  const peak = (value) => buildBiosignalReportView(analyzedReport({ hr: { peak: value } })).peak;
  assert.equal(peak({ status: "MEASURED", bpm: 90, at_sec: -1, phase: "listen" }), null);
  assert.equal(peak({ status: "MEASURED", bpm: null, at_sec: 5, phase: "listen" }), null);
  assert.deepEqual(peak({ status: "MEASURED", bpm: 90, at_sec: 5, phase: "other" }), { atSec: 5, phase: null, bpm: 90 });
});

test("call seconds are shown as M:SS", () => {
  assert.equal(formatCallSecond(83.4), "1:23");
  assert.equal(formatCallSecond(5), "0:05");
  assert.equal(formatCallSecond(-3), "0:00");
});

/** 훅을 실제 코드로 실행한다. useQuery 옵션과 상태 변화를 기록한다. */
function loadReportHook({ isSupported = true, isReportEnabled = true } = {}) {
  const records = { queryOptions: null, savedSources: [], requests: [] };
  const states = [];
  let stateIndex = 0;
  let effects = [];
  const responses = [];

  const hookModule = loadTypeScript("../hooks/useBiosignalReport.ts", {
    "@/api/biosignalApi": {
      getBiosignalReport: async (sessionId) => {
        records.requests.push(sessionId);
        return responses.shift();
      },
    },
    "@/utils/biosignalReport": reportUtils,
    "@/utils/biosignalSettings": {
      isBiosignalSupported: isSupported,
      loadBiosignalReportEnabled: async () => isReportEnabled,
      saveLastBaselineSource: async (source) => {
        records.savedSources.push(source);
      },
    },
    "@tanstack/react-query": {
      useQuery: (options) => {
        records.queryOptions = options;
        return { data: records.data };
      },
    },
    axios: { isAxiosError: (error) => error?.isAxiosError === true },
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useEffect: (effect) => { effects.push(effect); },
      useMemo: (factory) => factory(),
    },
  });

  const render = (props) => {
    stateIndex = 0;
    effects = [];
    return hookModule.useBiosignalReport(props);
  };
  const runEffects = async () => {
    effects.forEach((effect) => effect());
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { records, responses, render, runEffects };
}

test("the report is fetched only on Android with the body reaction setting on", async () => {
  const hook = loadReportHook();
  hook.render({ sessionId: "session-1", isEnabled: true });
  assert.equal(hook.records.queryOptions.enabled, false);
  await hook.runEffects();
  hook.render({ sessionId: "session-1", isEnabled: true });
  assert.equal(hook.records.queryOptions.enabled, true);
  assert.deepEqual(hook.records.queryOptions.queryKey, ["biosignalReport", "session-1"]);

  hook.render({ sessionId: undefined, isEnabled: true });
  assert.equal(hook.records.queryOptions.enabled, false);
  hook.render({ sessionId: "session-1", isEnabled: false });
  assert.equal(hook.records.queryOptions.enabled, false);

  for (const options of [{ isSupported: false }, { isReportEnabled: false }]) {
    const other = loadReportHook(options);
    other.render({ sessionId: "session-1", isEnabled: true });
    await other.runEffects();
    other.render({ sessionId: "session-1", isEnabled: true });
    assert.equal(other.records.queryOptions.enabled, false);
  }
});

test("awaiting results are polled a bounded number of times", () => {
  const hook = loadReportHook();
  hook.render({ sessionId: "session-1", isEnabled: true });
  const interval = hook.records.queryOptions.refetchInterval;
  const query = (status, dataUpdateCount) => ({ state: { data: status ? { status } : undefined, dataUpdateCount } });
  assert.equal(interval(query("AWAITING_DATA", 1)), 5_000);
  assert.equal(interval(query("AWAITING_DATA", 35)), 5_000);
  assert.equal(interval(query("AWAITING_DATA", 36)), false);
  assert.equal(interval(query("ANALYZED", 1)), false);
  assert.equal(interval(query(undefined, 0)), false);
});

test("only network errors and server errors are retried", () => {
  const hook = loadReportHook();
  hook.render({ sessionId: "session-1", isEnabled: true });
  const retry = hook.records.queryOptions.retry;
  const axiosError = (status) => ({ isAxiosError: true, response: status ? { status } : undefined });
  assert.equal(retry(0, axiosError()), true);
  assert.equal(retry(1, axiosError(503)), true);
  assert.equal(retry(2, axiosError(503)), false);
  assert.equal(retry(0, axiosError(404)), false);
  assert.equal(retry(0, axiosError(403)), false);
  assert.equal(retry(0, new Error("session expired")), false);
});

test("an analyzed result updates whether the next call needs rest", async () => {
  const hook = loadReportHook();
  hook.render({ sessionId: "session-1", isEnabled: true });
  const { queryFn } = hook.records.queryOptions;

  hook.responses.push({ session_id: "session-1", status: "AWAITING_DATA" });
  assert.equal((await queryFn()).status, "AWAITING_DATA");
  assert.deepEqual(hook.records.savedSources, []);

  const analyzed = analyzedReport({ baseline: { status: "INSUFFICIENT_DATA", source: "none" } });
  hook.responses.push(analyzed);
  assert.equal(await queryFn(), analyzed);
  assert.deepEqual(hook.records.savedSources, ["none"]);
  assert.deepEqual(hook.records.requests, ["session-1", "session-1"]);

  hook.records.data = analyzed;
  assert.equal(hook.render({ sessionId: "session-1", isEnabled: true }).baselineBpm, null);
});
