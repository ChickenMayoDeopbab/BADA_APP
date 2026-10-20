const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const flush = () => new Promise(setImmediate);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

/** Run the real connection hook with controlled tokens and transport events. */
function setup(t, { token = async () => 'access', refresh = async () => {} } = {}) {
  const previousSocket = global.WebSocket;
  const previousBase = process.env.EXPO_PUBLIC_AI_API_URL;
  const sockets = [], states = [], refs = [], errors = [], ends = [];
  let stateIndex = 0, refIndex = 0, effect, cleanup;
  class Socket {
    static OPEN = 1;
    readyState = 0;
    sent = [];
    constructor(url) { this.url = url; sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.({}); }
    message(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
    send(data) { this.sent.push(data); }
    close() { this.readyState = 3; this.onclose?.({ code: 1000, reason: '' }); }
    serverClose(code, reason = '') { this.readyState = 3; this.onclose?.({ code, reason }); }
  }
  global.WebSocket = Socket;
  process.env.EXPO_PUBLIC_AI_API_URL = 'https://local.example.test';
  t.after(() => {
    cleanup?.();
    global.WebSocket = previousSocket;
    if (previousBase === undefined) delete process.env.EXPO_PUBLIC_AI_API_URL;
    else process.env.EXPO_PUBLIC_AI_API_URL = previousBase;
  });
  const filename = path.resolve(__dirname, '../hooks/useTrainWebSocket.ts');
  const loaded = new Module(filename, module);
  const mocks = {
    '@/api/tokenApi': { refreshAuthTokens: refresh },
    '@/utils/authTokenStorage': { getAccessToken: token },
    react: {
      useCallback: (callback) => callback,
      useEffect: (callback) => { effect = callback; },
      useRef: (initial) => refs[refIndex++] ??= { current: initial },
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
      },
    },
  };
  loaded.require = (id) => { assert.ok(Object.hasOwn(mocks, id), id); return mocks[id]; };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  const render = (enabled = true) => {
    stateIndex = refIndex = 0;
    return loaded.exports.useTrainWebSocket({ sessionId: 'session-1', wsUrl: null, enabled, onError: (code) => errors.push(code), onEnd: (reason) => ends.push(reason) });
  };
  const start = () => { render(); cleanup = effect(); };
  const stop = () => { cleanup?.(); cleanup = undefined; };
  return { sockets, errors, ends, render, start, stop };
}

test('leaving while secure token lookup is pending cannot create a late socket', async (t) => {
  const token = deferred();
  const s = setup(t, { token: () => token.promise });
  s.start();
  s.stop();
  token.resolve('access');
  await flush();
  assert.equal(s.sockets.length, 0);
});

test('leaving during token refresh cannot reconnect an ended call', async (t) => {
  const refresh = deferred();
  const s = setup(t, { refresh: () => refresh.promise });
  s.start(); await flush();
  s.sockets[0].open();
  s.sockets[0].serverClose(1008, 'TOKEN_EXPIRED');
  s.stop(); refresh.resolve(); await flush();
  assert.equal(s.sockets.length, 1);
});

test('a connection that never opens has a deadline and reports one recoverable failure', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const s = setup(t);
  s.start(); await flush();
  t.mock.timers.tick(15000); await flush();
  assert.deepEqual(s.errors, ['WS_CONNECT_TIMEOUT']);
  assert.equal(s.sockets[0].readyState, 3);
});

test('missing credentials end the connection attempt instead of waiting forever', async (t) => {
  const s = setup(t, { token: async () => null });
  s.start(); await flush();
  assert.deepEqual(s.errors, ['WS_AUTH_REQUIRED']);
  assert.equal(s.sockets.length, 0);
});

test('transport errors without close events do not leave a frozen call', async (t) => {
  const s = setup(t);
  s.start(); await flush();
  s.sockets[0].onerror?.({});
  assert.deepEqual(s.errors, ['WS_CONNECTION_ERROR']);
});

test('a normal transport close without a protocol end still ends the call', async (t) => {
  const s = setup(t);
  s.start(); await flush();
  s.sockets[0].open(); s.sockets[0].serverClose(1000);
  assert.deepEqual(s.errors, ['WS_CLOSE_1000']);
});

test('token expiry retries once and rejects repeated expiry instead of looping', async (t) => {
  let refreshes = 0;
  const s = setup(t, { refresh: async () => { refreshes++; } });
  s.start(); await flush();
  s.sockets[0].open(); s.sockets[0].serverClose(1008, 'TOKEN_EXPIRED'); await flush();
  s.sockets[1].open(); s.sockets[1].serverClose(1008, 'TOKEN_EXPIRED'); await flush();
  assert.equal(refreshes, 1);
  assert.equal(s.sockets.length, 2);
  assert.deepEqual(s.errors, ['WS_CLOSE_TOKEN_EXPIRED']);
});

test('authentication precedes all data and the microphone gate tracks current playback state', async (t) => {
  const s = setup(t);
  s.start(); await flush();
  const socket = s.sockets[0]; socket.open();
  assert.deepEqual(JSON.parse(socket.sent[0]), { type: 'auth', token: 'access' });
  const api = s.render();
  const data = new ArrayBuffer(640);
  api.setPlaybackBlocked(true); api.sendBinary(data);
  assert.equal(socket.sent.length, 2);
  api.setPlaybackBlocked(false); api.sendBinary(data);
  assert.equal(socket.sent[2], data);
  socket.message({ type: 'end', reason: 'USER_END' }); socket.serverClose(1000);
  assert.deepEqual(s.ends, ['USER_END']);
  assert.deepEqual(s.errors, []);
});
