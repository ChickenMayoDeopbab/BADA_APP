const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

/** Exercise the real hint selection with a query response that can arrive between socket events. */
function setup() {
  let queryOptions;
  let query = { data: undefined, isPending: true, isError: false, refetch: () => {} };
  const requests = [];
  const filename = path.resolve(__dirname, '../hooks/useInitialScriptHint.ts');
  const loaded = new Module(filename, module);
  const mocks = {
    '@/api/trainApi': { getScenarioExample: (id, signal) => { requests.push({ id, signal }); } },
    '@tanstack/react-query': { useQuery: (options) => { queryOptions = options; return query; } },
  };
  loaded.require = (id) => { assert.ok(Object.hasOwn(mocks, id), id); return mocks[id]; };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  const props = { scenarioId: '115', isEnabled: true, scriptLevel: 1, transcript: [], scriptHint: null };
  return {
    props, requests,
    render: () => loaded.exports.useInitialScriptHint(props),
    get options() { return queryOptions; },
    resolve: () => { query = { ...query, isPending: false, data: { dialogue: [
      { speaker: 'ai', text: '안녕하세요, 예약 도와드리겠습니다.' },
      { speaker: 'user', text: '  내일 두 명 예약하고 싶어요.  ' },
      { speaker: 'user', text: '오후 두 시요.' },
    ] } }; },
    fail: () => { query = { ...query, isPending: false, isError: true }; },
  };
}

test('the first reply is available after the AI greeting without a user transcript or script_hint', () => {
  const s = setup();
  assert.equal(s.render().hint, null);
  assert.equal(s.options.enabled, true);
  const signal = new AbortController().signal;
  s.options.queryFn({ signal });
  assert.deepEqual(s.requests, [{ id: '115', signal }]);
  s.resolve();
  assert.equal(s.render().hint, null, 'wait for an actual AI greeting');
  s.props.transcript = [{ role: 'ai', text: '안녕하세요, 예약 도와드리겠습니다.' }];
  assert.deepEqual(s.render().hint, { level: 1, text: '내일 두 명 예약하고 싶어요.' });
});

test('a late example response never restores the first reply after the user answers', () => {
  const s = setup();
  s.props.transcript = [{ role: 'ai', text: '안녕하세요.' }];
  assert.equal(s.render().isLoading, true);
  s.props.transcript.push({ role: 'user', text: '예약할게요.' });
  s.resolve();
  assert.equal(s.render().hint, null);
  assert.equal(s.options.enabled, false);
});

test('server hints including empty and hidden hints always replace the initial reply', () => {
  const s = setup(); s.resolve();
  s.props.transcript = [{ role: 'ai', text: '안녕하세요.' }];
  for (const hint of [{ level: 1, text: '몇 시가 좋으세요?' }, { level: 2, text: '시간을 말해보세요.' }, { level: 1, text: '' }, { level: 3, text: '' }]) {
    s.props.scriptHint = hint;
    assert.deepEqual(s.render().hint, hint);
    assert.equal(s.options.enabled, false);
  }
});

test('warmups, missing scenarios, unknown levels, advice, and hidden levels never enable example hints', () => {
  for (const overrides of [{ isEnabled: false }, { scenarioId: undefined }, { scriptLevel: null }, { scriptLevel: 2 }, { scriptLevel: 3 }]) {
    const s = setup(); s.resolve();
    s.props.transcript = [{ role: 'ai', text: '안녕하세요.' }];
    Object.assign(s.props, overrides);
    assert.equal(s.render().hint, null);
    assert.equal(s.options.enabled, false);
  }
});

test('failed initial example loading offers a retry only while the first answer is still needed', () => {
  const s = setup(); s.fail();
  s.props.transcript = [{ role: 'ai', text: '안녕하세요.' }];
  assert.equal(s.render().hasError, true);
  assert.equal(typeof s.render().retry, 'function');
  s.props.scriptHint = { level: 1, text: '새 추천' };
  assert.equal(s.render().hasError, false);
});
