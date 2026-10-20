const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const flush = () => new Promise(setImmediate);
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

/** Control session creation while exercising the actual warmup start button. */
function setup({ create = async () => ({ sessionId: 's1', wsUrl: 'wss://example.test' }), id = '1' } = {}) {
  const states = [], refs = [], routes = [], alerts = [];
  let si = 0, ri = 0, focus;
  const jsx = (type, props) => ({ type, props });
  const filename = path.resolve(__dirname, '../app/(tabs)/(train)/warmup-start.tsx');
  const loaded = new Module(filename, module);
  const mocks = {
    '@/components/common/CustomButton': { default: 'Button' }, '@/components/common/Top': {}, '@/components/train/StepSlider': {}, '@/components/train/TrainingSettingTitle': {},
    '@/api/trainApi': { createSession: create }, '@/api/error': { getApiErrorMessage: (_, fallback) => fallback },
    '@/context/AppAlertContext': { useAppAlert: () => ({ showAlert: alert => alerts.push(alert) }) },
    '@/constants/train': { DIFFICULTY_MAP: ['EASY'], SPRING_PERSONALITY_MAP: ['KIND'] },
    'expo-router': { router: { push: route => routes.push(route) }, useFocusEffect: callback => { focus = callback; }, useLocalSearchParams: () => ({ id }) },
    react: { useCallback: callback => callback, useRef: initial => refs[ri++] ??= { current: initial }, useState: initial => { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; } },
    'react-native': {}, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/hooks/useSensitiveConsentGuard': { useSensitiveConsentGuard: () => async () => true },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  };
  loaded.require = id => { assert.ok(Object.hasOwn(mocks, id), id); return mocks[id]; };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  const render = () => { si = ri = 0; return loaded.exports.default(); };
  render(); const cleanup = focus();
  const findButton = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.map(findButton).find(Boolean); if (node.type === 'Button') return node; return findButton(node.props?.children); };
  return { routes, alerts, stop: () => cleanup?.(), button: () => findButton(render()).props };
}

test('double warmup start creates one session and navigates once', async () => {
  let calls = 0; const pending = deferred();
  const s = setup({ create: () => { calls++; return pending.promise; } });
  const button = s.button(); const first = button.onPress(), second = button.onPress(); await flush();
  assert.equal(calls, 1); pending.resolve({ sessionId: 's1', wsUrl: 'wss://example.test' }); await Promise.all([first, second]);
  assert.equal(s.routes.length, 1); await s.button().onPress(); assert.equal(calls, 1); s.stop();
});

test('a warmup response after leaving cannot open a call over another screen', async () => {
  const pending = deferred(), s = setup({ create: () => pending.promise });
  const first = s.button().onPress(); await flush(); s.stop(); pending.resolve({ sessionId: 's1', wsUrl: 'wss://example.test' }); await first;
  assert.deepEqual(s.routes, []);
});

for (const create of [async () => { throw Error('offline'); }, async () => ({ sessionId: null, wsUrl: null })]) {
  test('failed or malformed warmup creation gives feedback and releases the start button', async () => {
    const s = setup({ create }); await s.button().onPress();
    assert.equal(s.alerts.length, 1); assert.equal(s.routes.length, 0); assert.equal(s.button().disabled, false); s.stop();
  });
}

test('invalid scenario identifiers never reach session creation', async () => {
  let calls = 0; const s = setup({ id: '1junk', create: async () => { calls++; return {}; } });
  await s.button().onPress(); assert.equal(calls, 0); assert.equal(s.alerts.length, 1); s.stop();
});
