const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const axios = require('axios');

/** Execute app authentication code with network and device storage replaced. */
function loadSource(relativePath, mocks) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.require = (id) => {
    assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
    return mocks[id];
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}

/** Produce an actual Axios error without opening a network connection. */
function httpError(status, config = {}) {
  return new axios.AxiosError('request failed', 'ERR_BAD_RESPONSE', config, {}, { status, data: {}, headers: {}, config });
}

const authErrors = loadSource('../utils/authSessionError.ts', {});

for (const filename of ['client', 'aiClient']) {
  test(`${filename}: transient refresh failure preserves tokens and remember-login preference`, async () => {
    const saved = new Map([['autoLogin', 'true'], ['accessToken', 'access'], ['refreshToken', 'refresh']]);
    const routes = [];
    const client = loadSource(`../api/${filename}.ts`, {
      axios,
      '@react-native-async-storage/async-storage': { removeItem: async (key) => saved.delete(key) },
      'expo-router': { router: { replace: (route) => routes.push(route) } },
      '@/utils/authTokenStorage': {
        getAccessToken: async () => saved.get('accessToken'),
        clearAuthTokens: async () => { saved.delete('accessToken'); saved.delete('refreshToken'); },
      },
      './tokenApi': { refreshAuthTokens: async () => { throw new axios.AxiosError('offline', 'ERR_NETWORK'); } },
      '@/utils/authSessionError': authErrors,
      '@/services/pushNotifications': { deleteLocalPushToken: async () => {} },
    }).default;
    client.defaults.adapter = async (config) => { throw httpError(401, config); };
    await assert.rejects(client.get('/api/v1/legal-consents/status'));
    assert.equal(saved.get('autoLogin'), 'true');
    assert.equal(saved.get('refreshToken'), 'refresh');
    assert.equal(saved.get('accessToken'), 'access');
    assert.deepEqual(routes, []);
  });
}

/** Construct a token refresh using an isolated module and the production JWT parser. */
function refreshSetup(post) {
  const payload = Buffer.from(JSON.stringify({ sub: '101', exp: 1 })).toString('base64url');
  const tokens = { accessToken: `eyJhbGciOiJub25lIn0.${payload}.test`, refreshToken: 'refresh-token' };
  const writes = [];
  const api = loadSource('../api/tokenApi.ts', {
    axios: { ...axios, post },
    'jwt-decode': require('jwt-decode'),
    '@/utils/authTokenStorage': {
      getAuthTokens: async () => tokens,
      setAuthTokens: async (next) => { writes.push(next); },
    },
    '@/utils/authSessionError': authErrors,
  });
  return { api, tokens, writes };
}

for (const status of [401, 403]) {
  test(`refresh ${status} is a definitive expiry and still requires login`, async () => {
    const s = refreshSetup(async () => { throw httpError(status); });
    await assert.rejects(s.api.refreshAuthTokens(), authErrors.AuthSessionExpiredError);
    assert.equal(s.writes.length, 0);
  });
}

for (const failure of [
  new axios.AxiosError('timeout', 'ECONNABORTED'),
  httpError(500), httpError(503), httpError(429),
]) {
  test(`temporary refresh failure ${failure.response?.status ?? failure.code} can retry without losing tokens`, async () => {
    let attempts = 0;
    const s = refreshSetup(async () => {
      attempts++;
      if (attempts === 1) throw failure;
      return { data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } } };
    });
    await assert.rejects(s.api.refreshAuthTokens(), (error) => error === failure);
    assert.equal(s.writes.length, 0);
    await s.api.refreshAuthTokens();
    assert.equal(attempts, 2);
    assert.deepEqual(s.writes, [{ accessToken: 'new-access', refreshToken: 'new-refresh' }]);
  });
}

test('parallel 401s share one refresh and the refresh request has a finite timeout', async () => {
  let posts = 0;
  const s = refreshSetup(async (url, body, config) => {
    posts++;
    assert.ok(url.endsWith('/api/v1/auth/refresh'));
    assert.deepEqual(body, { refreshToken: 'refresh-token', userId: 101 });
    assert.equal(config.timeout, 10000);
    return { data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } } };
  });
  const first = s.api.refreshAuthTokens();
  assert.equal(first, s.api.refreshAuthTokens());
  await first;
  assert.equal(posts, 1);
  assert.equal(s.writes.length, 1);
});

test('a malformed refresh response does not overwrite saved credentials', async () => {
  const s = refreshSetup(async () => ({ data: { data: { accessToken: 'incomplete' } } }));
  await assert.rejects(s.api.refreshAuthTokens(), /갱신 응답/);
  assert.equal(s.writes.length, 0);
});

for (const filename of ['client', 'aiClient']) {
  test(`${filename}: definitive expiry removes credentials and preference and redirects to login`, async () => {
    const saved = new Map([['autoLogin', 'true'], ['accessToken', 'access'], ['refreshToken', 'refresh']]);
    const routes = [];
    const client = loadSource(`../api/${filename}.ts`, {
      axios,
      '@react-native-async-storage/async-storage': { removeItem: async (key) => saved.delete(key) },
      'expo-router': { router: { replace: (route) => routes.push(route) } },
      '@/utils/authTokenStorage': {
        getAccessToken: async () => saved.get('accessToken'),
        clearAuthTokens: async () => { saved.delete('accessToken'); saved.delete('refreshToken'); },
      },
      './tokenApi': { refreshAuthTokens: async () => { throw new authErrors.AuthSessionExpiredError(); } },
      '@/utils/authSessionError': authErrors,
      '@/services/pushNotifications': { deleteLocalPushToken: async () => {} },
    }).default;
    client.defaults.adapter = async (config) => { throw httpError(401, config); };
    await assert.rejects(client.get('/api/v1/legal-consents/status'), authErrors.AuthSessionExpiredError);
    assert.equal(saved.size, 0);
    assert.deepEqual(routes, ['/auth/login']);
  });
}

test('startup consent check propagates temporary errors for retry while normal login keeps its consent guard', async () => {
  const failure = new Error('service unavailable');
  const { getAuthenticatedPath } = loadSource('../utils/legalConsentFlow.ts', {
    '@/api/legalConsentApi': { getLegalConsentStatus: async () => { throw failure; } },
    '@/utils/diagnosisFlow': {},
  });
  assert.equal(await getAuthenticatedPath(), '/auth/terms');
  await assert.rejects(getAuthenticatedPath({ throwOnError: true }), (error) => error === failure);
});

test('strict startup never skips required consent and propagates diagnosis-storage errors', async () => {
  let needsConsent = true;
  const failure = new Error('temporary local storage error');
  const { getAuthenticatedPath } = loadSource('../utils/legalConsentFlow.ts', {
    '@/api/legalConsentApi': { getLegalConsentStatus: async () => ({ legalActionRequired: needsConsent }) },
    '@/utils/diagnosisFlow': { isDiagnosisRequiredForAuthenticatedUser: async () => { throw failure; } },
  });
  assert.equal(await getAuthenticatedPath({ throwOnError: true }), '/auth/terms');
  needsConsent = false;
  await assert.rejects(getAuthenticatedPath({ throwOnError: true }), (error) => error === failure);
  assert.equal(await getAuthenticatedPath(), '/auth/terms');
});

/** Traverse JSX without rendering native views. */
function findNode(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) return tree.map((node) => findNode(node, predicate)).find(Boolean);
  return predicate(tree) ? tree : findNode(tree.props?.children, predicate);
}

for (const shouldRemember of [true, false]) {
  test(`login screen persists remember-login=${shouldRemember} from the actual checkbox before restart`, async () => {
    const saved = new Map(), states = [], refs = [], routes = [];
    let stateIndex = 0, refIndex = 0;
    const jsx = (type, props) => ({ type, props });
    const { default: Screen } = loadSource('../app/auth/login.tsx', {
      '@/design-system': { SEMANTIC_COLORS: { primary: { normal: 'green' }, line: { normal: 'gray' } } },
      '@/api/authApi': { postLogin: async () => ({ data: { accessToken: 'access', refreshToken: 'refresh' } }) },
      '@/api/legalConsentApi': {},
      '@/api/error': {},
      '@/assets/badaLogo2.svg': {},
      '@/components/common/CustomButton': {},
      '@/components/common/CustomInput': {},
      '@/constants/authValidation': {},
      '@/hooks/useAndroidBackHandler': { useAndroidBackHandler() {} },
      '@/utils/diagnosisFlow': { setAuthenticatedUsername: async () => {} },
      '@/utils/authTokenStorage': { setAuthTokens: async (tokens) => { saved.set('tokens', tokens); } },
      '@/utils/legalConsentFlow': { getAuthenticatedPath: async () => '/home' },
      '@/utils/pendingLegalConsent': { getPendingLegalConsent: async () => null },
      '@expo/vector-icons/Ionicons': {},
      '@react-native-async-storage/async-storage': { setItem: async (key, value) => saved.set(key, value) },
      'expo-router': { router: { replace: (route) => routes.push(route) } },
      'react': {
        useEffect() {},
        useRef: (initial) => { const index = refIndex++; return refs[index] ??= { current: initial }; },
        useState: (initial) => {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
        },
      },
      'react-hook-form': { useForm: () => ({ trigger: async () => true, getValues: () => ({ username: 'user', password: 'password' }), formState: { errors: {} } }) },
      'react-native': { useWindowDimensions: () => ({ width: 390, height: 844 }), Platform: { OS: 'ios' }, Keyboard: {}, Animated: { Value: class {}, View: 'AnimatedView' } },
      'react-native-safe-area-context': {},
      'react/jsx-runtime': { jsx, jsxs: jsx },
    });
    const render = () => { stateIndex = 0; refIndex = 0; return Screen(); };
    let tree = render();
    if (shouldRemember) {
      findNode(tree, (node) => node.props?.accessibilityRole === 'checkbox').props.onPress();
      tree = render();
    }
    assert.equal(findNode(tree, (node) => node.props?.accessibilityRole === 'checkbox').props.accessibilityState.checked, shouldRemember);
    await findNode(tree, (node) => node.props?.label === '로그인').props.onPress();
    assert.equal(saved.get('autoLogin'), String(shouldRemember));
    assert.deepEqual(saved.get('tokens'), { accessToken: 'access', refreshToken: 'refresh' });
    assert.deepEqual(routes, ['/home']);
  });
}
