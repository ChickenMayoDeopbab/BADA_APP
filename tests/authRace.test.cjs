const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const axios = require('axios');
const flush = () => new Promise(setImmediate);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function load(relative, mocks) {
  const filename = path.resolve(__dirname, relative), loaded = new Module(filename, module);
  loaded.require = id => { assert.ok(Object.hasOwn(mocks, id), id); return mocks[id]; };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
  return loaded.exports;
}
function tokensFor(sub, suffix = '') {
  return { accessToken: `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.sig${suffix}`, refreshToken: `refresh-${sub}${suffix}` };
}
function setup(post, platform = 'web') {
  const saved = new Map();
  const driver = { getItem: async key => saved.get(key) ?? null, setItem: async (key, value) => saved.set(key, value), removeItem: async key => saved.delete(key), multiRemove: async keys => keys.forEach(key => saved.delete(key)) };
  const secure = new Map();
  const secureDriver = { getItemAsync: async key => secure.get(key) ?? null, setItemAsync: async (key, value) => secure.set(key, value), deleteItemAsync: async key => secure.delete(key) };
  const errors = load('../utils/authSessionError.ts', {});
  const storage = load('../utils/authTokenStorage.ts', {
    '@react-native-async-storage/async-storage': driver,
    'expo-secure-store': secureDriver, 'react-native': { Platform: { OS: platform } }, 'jwt-decode': require('jwt-decode'),
    './trainingCallScenario': { clearTrainingCallScenarios: async () => {} }, './authSessionError': errors,
  });
  const api = load('../api/tokenApi.ts', { axios: { ...axios, post }, 'jwt-decode': require('jwt-decode'), '@/utils/authTokenStorage': storage, '@/utils/authSessionError': errors });
  return { storage, api, saved, driver, errors, secure, secureDriver };
}

for (const action of ['logout', 'switch account']) {
  test(`a late refresh cannot resurrect or overwrite credentials after ${action}`, async () => {
    const pending = deferred(), s = setup(() => pending.promise);
    await s.storage.setAuthTokens(tokensFor('101'), 'password');
    const refresh = s.api.refreshAuthTokens(); const rejected = assert.rejects(refresh, error => error.name === 'AuthSessionChangedError');
    await flush();
    if (action === 'logout') await s.storage.clearAuthTokens();
    else await s.storage.setAuthTokens(tokensFor('202'), 'oauth');
    pending.resolve({ data: { data: tokensFor('101', 'new') } }); await rejected;
    assert.deepEqual(await s.storage.getAuthTokens(), action === 'logout' ? { accessToken: null, refreshToken: null } : tokensFor('202'));
  });
}

test('a stale refresh rejection is not allowed to expire a newly signed-in account', async () => {
  const pending = deferred(), s = setup(() => pending.promise);
  await s.storage.setAuthTokens(tokensFor('101'));
  const rejected = assert.rejects(s.api.refreshAuthTokens(), error => error.name === 'AuthSessionChangedError');
  await flush(); await s.storage.setAuthTokens(tokensFor('202'));
  pending.reject(new axios.AxiosError('expired', 'ERR_BAD_RESPONSE', {}, {}, { status: 401 }));
  await rejected; assert.deepEqual(await s.storage.getAuthTokens(), tokensFor('202'));
});

test('logout wins even when a native/storage refresh write is already pending', async () => {
  const s = setup(async () => ({ data: { data: tokensFor('101', 'new') } }));
  await s.storage.setAuthTokens(tokensFor('101'));
  const gate = deferred(), started = deferred(), original = s.driver.setItem;
  s.driver.setItem = async (key, value) => { if (key === 'accessToken') { started.resolve(); await gate.promise; } await original(key, value); };
  const rejected = assert.rejects(s.api.refreshAuthTokens(), error => error.name === 'AuthSessionChangedError');
  await started.promise; const logout = s.storage.clearAuthTokens(); gate.resolve();
  await Promise.all([rejected, logout]);
  assert.deepEqual(await s.storage.getAuthTokens(), { accessToken: null, refreshToken: null });
});

test('a new account does not join the previous account pending refresh', async () => {
  const pending = deferred(), users = [];
  const s = setup(async (_, body) => { users.push(body.userId); if (body.userId === 101) return pending.promise; return { data: { data: tokensFor('202', 'new') } }; });
  await s.storage.setAuthTokens(tokensFor('101'));
  const old = s.api.refreshAuthTokens(); const rejected = assert.rejects(old, error => error.name === 'AuthSessionChangedError');
  await flush(); await s.storage.setAuthTokens(tokensFor('202'));
  const next = s.api.refreshAuthTokens(); assert.notEqual(next, old); await next;
  pending.resolve({ data: { data: tokensFor('101', 'new') } }); await rejected;
  assert.deepEqual(users, [101, 202]); assert.deepEqual(await s.storage.getAuthTokens(), tokensFor('202', 'new'));
});


test('logout also wins over legacy secure-storage migration already in progress', async () => {
  const s = setup(async () => {}, 'ios'), gate = deferred(), started = deferred();
  for (const [key, value] of Object.entries(tokensFor('101'))) s.saved.set(key, value);
  const original = s.secureDriver.setItemAsync;
  s.secureDriver.setItemAsync = async (...args) => { started.resolve(); await gate.promise; await original(...args); };
  const read = s.storage.getAuthTokens(); await started.promise;
  const logout = s.storage.clearAuthTokens(); await flush(); gate.resolve();
  await Promise.all([read, logout]);
  assert.deepEqual(await s.storage.getAuthTokens(), { accessToken: null, refreshToken: null });
  assert.equal(s.secure.size, 0);
});

test('one failed token write cannot let the other write overtake logout', async () => {
  const s = setup(async () => {}), gate = deferred(), started = deferred();
  const original = s.driver.setItem;
  s.driver.setItem = async (key, value) => {
    if (key === 'refreshToken') throw new Error('storage full');
    started.resolve(); await gate.promise; await original(key, value);
  };
  const write = assert.rejects(s.storage.setAuthTokens(tokensFor('101')), /storage full/);
  await started.promise; const logout = s.storage.clearAuthTokens(); await flush(); gate.resolve();
  await Promise.all([write, logout]);
  assert.deepEqual(await s.storage.getAuthTokens(), { accessToken: null, refreshToken: null });
});
