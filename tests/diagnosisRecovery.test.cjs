const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const flush = () => new Promise(setImmediate);
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const questions = Array.from({ length: 10 }, (_, i) => ({ questionId: i + 1, content: `문항 ${i + 1}`, orderIndex: i }));
const result = { score: 30, levelName: '보통', summary: '결과', levelDescription: '설명' };

/** Execute the real hook with controlled failures and persistent React state. */
function setup(t, overrides = {}) {
  const states = [], refs = [], effects = [], requests = [], saved = [], routes = [];
  let si = 0, ri = 0, uuid = 0;
  const filename = path.resolve(__dirname, '../hooks/useDiagnosisQuestion.ts');
  const loaded = new Module(filename, module);
  const mocks = {
    '@/api': { getQuestion: async () => ({ data: questions }), calculateLevel: async request => { requests.push(request); return { data: result }; }, ...overrides.api },
    '@/api/requestBuilders': { createDiagnosisSubmitRequest: (sessionId, type, answers) => ({ sessionId, type, answers }) },
    '@/hooks/useAndroidBackHandler': { useAndroidBackHandler: () => {} },
    '@/utils/authTokenStorage': { getAccessToken: overrides.token || (async () => 'access') },
    '@/utils/diagnosisFlow': { completeRequiredDiagnosis: async () => {} },
    '@/utils/diagnosisResult': requireCompiled('../utils/diagnosisResult.ts'),
    '@react-native-async-storage/async-storage': { default: { setItem: async (...args) => saved.push(args) } },
    'expo-router': { router: { replace: route => routes.push(route), back: () => routes.push('back') }, useLocalSearchParams: () => ({}) },
    react: {
      useCallback: callback => callback,
      useEffect: callback => effects.push(callback),
      useRef: initial => refs[ri++] ??= { current: initial },
      useState: initial => { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    },
    'react-native-get-random-values': {}, uuid: { v4: () => `request-${++uuid}` },
  };
  loaded.require = id => { assert.ok(Object.hasOwn(mocks, id), id); return mocks[id]; };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  const render = () => { si = ri = 0; effects.length = 0; return loaded.exports.useDiagnosisQuestion(); };
  render(); const cleanup = effects[0](); t.after(() => cleanup?.());
  return { render, requests, saved, routes, stop: () => cleanup?.() };
}
function requireCompiled(relative) {
  const filename = path.resolve(__dirname, relative);
  // Baseline has no normalizer; this mock allows behavior tests to run before implementation.
  if (!fs.existsSync(filename)) return {};
  const loaded = new Module(filename, module);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return loaded.exports;
}

test('failed or empty question loads block progress and can be retried', async t => {
  let tries = 0;
  const s = setup(t, { api: { getQuestion: async () => ({ data: ++tries === 1 ? [] : questions }) } });
  await flush(); let hook = s.render();
  assert.equal(hook.status, 'error'); hook.handleNext(); assert.equal(s.render().nowStep, 0);
  await hook.handleRetry(); hook = s.render();
  assert.equal(hook.status, null); assert.equal(hook.currentQuestion.content, '문항 1');
});

test('a double press cannot skip a question', async t => {
  const s = setup(t); await flush(); const hook = s.render();
  hook.handleNext(); hook.handleNext(); assert.equal(s.render().nowStep, 1);
});

test('a double submit starts only one request', async t => {
  const pending = deferred(); let count = 0;
  const s = setup(t, { api: { calculateLevel: () => { count++; return pending.promise; } } });
  await flush(); for (let i = 0; i < 9; i++) s.render().handleNext();
  const hook = s.render(); hook.handleNext(); hook.handleNext(); await flush();
  assert.equal(count, 1); pending.resolve({ data: result }); await flush();
  assert.equal(s.render().status, 'done');
});

test('secure-storage rejection becomes a recoverable error', async t => {
  const s = setup(t, { token: async () => { throw Error('locked'); } });
  await flush(); for (let i = 0; i < 10; i++) s.render().handleNext();
  await flush(); assert.equal(s.render().status, 'error');
});

test('retrying the same answers reuses their submission identifier', async t => {
  const ids = [];
  const s = setup(t, { api: { calculateLevel: async request => { ids.push(request.sessionId); if (ids.length === 1) throw Error('timeout'); return { data: result }; } } });
  await flush(); for (let i = 0; i < 10; i++) s.render().handleNext(); await flush();
  assert.equal(s.render().status, 'error'); await s.render().handleRetry();
  assert.deepEqual(ids, ['request-1', 'request-1']); assert.equal(s.render().status, 'done');
});

test('a late submission after leaving does not save results or change the next screen', async t => {
  const pending = deferred(); const s = setup(t, { api: { calculateLevel: () => pending.promise } });
  await flush(); for (let i = 0; i < 10; i++) s.render().handleNext(); await flush();
  s.stop(); pending.resolve({ data: result }); await flush();
  assert.deepEqual(s.saved, []); assert.deepEqual(s.routes, []);
});

test('malformed diagnosis data fails safely and optional text is normalized', () => {
  const { normalizeDiagnosisResult } = requireCompiled('../utils/diagnosisResult.ts');
  assert.throws(() => normalizeDiagnosisResult(null));
  assert.throws(() => normalizeDiagnosisResult({ levelName: null, score: 10 }));
  assert.deepEqual(normalizeDiagnosisResult({ levelName: '보통', score: 30, summary: null }), { levelName: '보통', score: 30, summary: '', levelDescription: '' });
});
