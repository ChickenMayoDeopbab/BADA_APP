const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const axios = require('axios');

/** Execute the production API and screen with controlled native dependencies. */
function loadSource(relativePath, mocks) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.require = (id) => {
    assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
    const dependency = mocks[id];
    return Object.hasOwn(dependency, 'default') ? { __esModule: true, ...dependency } : dependency;
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const jsx = (type, props) => ({ type, props });
const result = {
  sessionType: 'SCENARIO', scenarioName: '피자 주문하기', trainingTime: '00:01:00',
  goodSegments: [], recordingUrl: '',
};

/** Match the Spring server's error envelope rather than retrying every 404. */
function apiError(status = 404, code = 'TRAINING_RECORD_001') {
  return { isAxiosError: true, response: { status, data: { error: { code } } } };
}

/** Replace HTTP only; retain the actual polling, deadlines and cancellation behavior. */
function feedbackApi(get) {
  const requests = [];
  const api = loadSource('../api/recordApi.ts', {
    './client': { default: { get: async (url, options) => {
      requests.push({ url, ...options });
      return get(requests.length, options);
    } } },
    '@/utils/completedCallDuration': {},
    axios,
  });
  return { api, requests };
}

/** Find visible JSX by props without requiring a native view renderer. */
function findNode(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) return tree.map((node) => findNode(node, predicate)).find(Boolean);
  return predicate(tree) ? tree : findNode(tree.props?.children, predicate);
}

/** Render the actual report effect and its public retry action. */
function reportScreen(api) {
  const states = [], refs = [];
  let stateIndex = 0, refIndex = 0, effects = [];
  const Screen = loadSource('../app/report.tsx', {
    '@/api/AttendanceApi': { checkAttendance: () => new Promise(() => {}) },
    '@/api/recordApi': api,
    '@/assets/clap.svg': { default: 'Clap' },
    '@/assets/magnifyingGlass.svg': { default: 'Glass' },
    '@/components/audio/AudioSegmentButton': { default: 'Audio' },
    '@/components/audio/AudioPlaybackGroup': { AudioPlaybackGroupProvider: 'AudioGroup' },
    '@/components/common/CustomButton': { default: 'Button' },
    '@/components/common/Top': { default: 'Top' },
    '@/design-system': require('../design-system'),
    '@/design-system/effects': {},
    '@/hooks/useAndroidBackHandler': { useAndroidBackHandler() {} },
    '@/utils/completedCallDuration': { getCompletedCallDuration: async () => null },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-router': {
      router: {},
      useLocalSearchParams: () => ({ scenarioId: '17', sessionId: 'session-1', callDurationSeconds: '60' }),
    },
    axios,
    react: {
      useState: (initial) => {
        const i = stateIndex++;
        if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
        return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
      },
      useRef: (initial) => refs[refIndex++] ??= { current: initial },
      useCallback: (callback) => callback,
      useEffect: (effect) => effects.push(effect),
    },
    'react-native': {
      View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable',
      StyleSheet: { create: (styles) => styles },
      useWindowDimensions: () => ({ width: 360, fontScale: 1 }),
    },
    'react-native-reanimated': {},
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    'react-native-svg': {},
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  }).default;
  return {
    render: () => { stateIndex = 0; refIndex = 0; effects = []; return Screen(); },
    start: () => effects[0](),
  };
}

test('the report stays loading across pending responses and shows results without waiting for attendance', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const s = feedbackApi(async (attempt) => {
    if (attempt < 3) throw apiError();
    return { status: 200, data: result };
  });
  const report = reportScreen(s.api);
  let tree = report.render();
  const cleanup = report.start();
  t.after(cleanup);
  await flush();
  assert.ok(findNode(report.render(), (node) => node.type?.name === 'ReportLoading'));
  t.mock.timers.tick(2000);
  await flush();
  tree = report.render();
  assert.ok(findNode(tree, (node) => node.type?.name === 'ReportLoading'));
  assert.equal(findNode(tree, (node) => node.props?.label === '재시도'), undefined);
  t.mock.timers.tick(2000);
  await flush();
  tree = report.render();
  assert.equal(findNode(tree, (node) => node.type?.name === 'ReportLoading'), undefined);
  assert.ok(findNode(tree, (node) => node.props?.children === result.scenarioName));
  assert.equal(s.requests.length, 3);
  assert.deepEqual(s.requests[0].params, { scenarioId: 17 });
});

test('HTTP processing responses and transient request timeouts can recover', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const s = feedbackApi(async (attempt) => {
    if (attempt === 1) return { status: 202, data: null };
    if (attempt === 2) return { status: 204, data: '' };
    if (attempt === 3) throw { isAxiosError: true, code: 'ECONNABORTED' };
    return { status: 200, data: result };
  });
  const pending = s.api.waitForFeedback({ scenarioId: 17 });
  await flush();
  for (let i = 0; i < 3; i++) { t.mock.timers.tick(2000); await flush(); }
  assert.equal(await pending, result);
  assert.equal(s.requests.length, 4);
});

test('authentication, permission, server and unrelated not-found errors fail immediately', async () => {
  for (const error of [apiError(401), apiError(403), apiError(500), apiError(404, 'TRAINING_RECORD_006')]) {
    const s = feedbackApi(async () => { throw error; });
    await assert.rejects(s.api.waitForFeedback({ scenarioId: 17 }), (caught) => caught === error);
    assert.equal(s.requests.length, 1);
  }
});

test('a prolonged analysis offers retry and retry starts a new bounded wait', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let isReady = false;
  const s = feedbackApi(async () => {
    if (!isReady) throw apiError();
    return { status: 200, data: result };
  });
  const report = reportScreen(s.api);
  report.render();
  t.after(report.start());
  await flush();
  t.mock.timers.tick(120000);
  await flush();
  let tree = report.render();
  assert.ok(findNode(tree, (node) => typeof node.props?.children === 'string' && node.props.children.includes('예상보다 오래')));
  isReady = true;
  findNode(tree, (node) => node.props?.label === '재시도').props.onPress();
  await flush();
  tree = report.render();
  assert.ok(findNode(tree, (node) => node.props?.children === result.scenarioName));
  assert.equal(findNode(tree, (node) => node.props?.label === '재시도'), undefined);
});

test('leaving the report cancels the poll timer without another request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const s = feedbackApi(async () => { throw apiError(); });
  const report = reportScreen(s.api);
  report.render();
  const cleanup = report.start();
  await flush();
  cleanup();
  await flush();
  assert.equal(s.requests[0].signal.aborted, true);
  t.mock.timers.tick(10000);
  await flush();
  assert.equal(s.requests.length, 1);
});

test('pending requests never overlap and cancellation propagates to the active HTTP request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const controller = new AbortController();
  const s = feedbackApi((_attempt, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new axios.CanceledError()), { once: true });
  }));
  const pending = s.api.waitForFeedback({ scenarioId: 17 }, { signal: controller.signal });
  const canceled = assert.rejects(pending, (error) => axios.isCancel(error));
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(s.requests.length, 1);
  assert.equal(s.requests[0].timeout, 10000);
  controller.abort();
  await canceled;
});
