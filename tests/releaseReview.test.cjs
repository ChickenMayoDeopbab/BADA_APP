const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');

/** Execute the actual hooks and screens with deterministic platform dependencies. */
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
    return Object.hasOwn(dependency, 'default')
      ? { __esModule: true, ...dependency }
      : dependency;
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
const jsx = (type, props) => ({ type, props });

/** Traverse JSX without rendering native views. */
function findNode(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) return tree.map((node) => findNode(node, predicate)).find(Boolean);
  return predicate(tree) ? tree : findNode(tree.props?.children, predicate);
}

test('profile and password share one in-flight request, cached response and invalidation', async () => {
  let requests = 0;
  const { useMyPage, myPageQueryKeys } = loadSource('../hooks/useMyPage.ts', {
    '@/api/userInfoApi': { getMyPage: async () => { requests++; return { data: { email: 'user@example.test', version: requests } }; } },
    '@tanstack/react-query': { useQuery: (options) => options },
  });
  const client = new QueryClient();
  try {
    const [profile, password] = await Promise.all([
      client.fetchQuery(useMyPage()), client.fetchQuery(useMyPage(true)),
    ]);
    assert.equal(requests, 1);
    assert.equal(profile, password);
    assert.equal(await client.fetchQuery(useMyPage()), profile);
    assert.equal(requests, 1);
    await client.invalidateQueries({ queryKey: myPageQueryKeys.all });
    assert.equal((await client.fetchQuery(useMyPage())).data.version, 2);
    assert.equal(useMyPage(false).enabled, false);
  } finally { client.clear(); }
});

/** Render the password screen with a populated shared profile cache and a given login method. */
function passwordScreen(method, isMethodPending = false) {
  const mocks = {
    '@/api/authApi': {},
    '@/api/error': {},
    '@/hooks/useMyPage': {
      useMyPage: () => ({ data: { data: { email: 'cached@example.test' } }, isPending: false }),
    },
    '@/utils/authTokenStorage': {},
    '@/components/common/CustomButton': { default: 'Button' },
    '@/components/common/CustomInput': { default: 'Input' },
    '@/components/common/LoadingIndicator': { default: 'Loading' },
    '@/components/common/Top': { default: 'Top' },
    '@/constants/authValidation': {},
    '@/context/AppAlertContext': { useAppAlert: () => ({ showAlert() {} }) },
    '@/design-system': {},
    '@expo/vector-icons/Ionicons': {},
    '@tanstack/react-query': {
      useQueryClient: () => ({}),
      useQuery: () => ({ data: method, isPending: isMethodPending }),
    },
    'expo-router': { router: { back() {} } },
    'react': { useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
    'react-hook-form': { useForm: () => ({ formState: { errors: {} } }), Controller: 'Controller' },
    'react-native': { Platform: { OS: 'ios' }, View: 'View', Text: 'Text', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', Pressable: 'Pressable' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  };
  return loadSource('../app/(tabs)/(profile)/profile/settings/password.tsx', mocks).default();
}

test('a cached profile never exposes password fields before login method confirmation or to OAuth users', () => {
  const pending = passwordScreen(undefined, true);
  assert.ok(findNode(pending, (node) => node.type === 'Loading'));
  assert.equal(findNode(pending, (node) => node.type === 'Controller'), undefined);
  const oauth = passwordScreen('oauth');
  assert.ok(findNode(oauth, (node) => node.props?.label === '돌아가기'));
  assert.equal(findNode(oauth, (node) => node.type === 'Controller'), undefined);
});

/** Render the actual schedule form and invoke its public button callbacks. */
function scheduleScreen({ failedCancellations = 1 } = {}) {
  const alerts = [], routes = [], cancellations = [], removals = [];
  const states = ['time', 0, 0, 1, 2, false];
  const refs = [];
  let stateIndex = 0, refIndex = 0, creates = 0;
  const mocks = {
    '@/api/trainApi': {},
    '@/components/common/CustomButton': { default: 'Button' },
    '@/components/common/Top': { default: 'Top' },
    '@/components/train/MinuteRangePicker': { default: 'Picker' },
    '@/components/train/StepProgress': { default: 'Progress' },
    '@/components/train/StepSlider': { default: 'Slider' },
    '@/components/train/TrainingSettingTitle': { default: 'SettingTitle' },
    '@/constants/train': { DIFFICULTY_MAP: ['low'], SPRING_PERSONALITY_MAP: ['KIND'] },
    '@/api/trainingCallApi': {
      createTrainingCallSchedule: async () => { creates++; return { scheduleId: 7, scheduledAt: '2026-10-16T10:00:00Z' }; },
      cancelTrainingCallSchedule: async (id) => {
        cancellations.push(id);
        if (cancellations.length <= failedCancellations) throw new Error('offline');
      },
    },
    '@/utils/trainingCallScenario': {
      saveTrainingCallScenario: async () => { throw new Error('storage full'); },
      removeTrainingCallScenario: async (id) => { removals.push(id); },
    },
    '@/api/error': { getApiErrorMessage: (error) => error.message },
    '@/context/AppAlertContext': { useAppAlert: () => ({ showAlert: (alert) => alerts.push(alert) }) },
    '@/design-system/colors': {},
    '@/hooks/useAndroidBackHandler': { useAndroidBackHandler() {} },
    '@/hooks/useSensitiveConsentGuard': { useSensitiveConsentGuard: () => async () => true },
    '@expo/vector-icons/Ionicons': {},
    'expo-router': {
      router: { replace: (route) => routes.push(route) },
      useFocusEffect() {},
      useLocalSearchParams: () => ({ id: '17' }),
    },
    'react': {
      useCallback: (callback) => callback,
      useRef: (initial) => { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useState: () => { const index = stateIndex++; return [states[index], (value) => { states[index] = value; }]; },
    },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({}) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  };
  const Screen = loadSource('../app/start.tsx', mocks).default;
  const render = () => { stateIndex = 0; refIndex = 0; return Screen(); };
  return {
    alerts, routes, cancellations, removals,
    get creates() { return creates; },
    complete: () => findNode(render(), (node) => node.type === 'Button' && node.props?.label === '설정 완료하기').props.onPress(),
  };
}

test('double failure exposes same-reservation cancellation retry and prevents duplicate creation', async () => {
  const s = scheduleScreen();
  await s.complete();
  assert.equal(s.creates, 1);
  assert.deepEqual(s.cancellations, [7]);
  assert.equal(s.alerts.at(-1).confirmLabel, '취소 다시 시도');
  assert.match(s.alerts.at(-1).description, /수신 화면에서 거절/);
  await s.complete();
  assert.equal(s.creates, 1);
  const retry = s.alerts.at(-1).onConfirm;
  retry(); retry(); await flush();
  assert.deepEqual(s.cancellations, [7, 7]);
  assert.equal(s.creates, 1);
  assert.deepEqual(s.removals, [7]);
  assert.equal(s.alerts.at(-1).title, '예약을 취소했어요');
});

test('each training setting help button opens the explanation for that setting', () => {
  const alerts = [];
  const SettingTitle = loadSource('../components/train/TrainingSettingTitle.tsx', {
    '@/context/AppAlertContext': { useAppAlert: () => ({ showAlert: (alert) => alerts.push(alert) }) },
    '@/design-system/colors': { SEMANTIC_COLORS: { label: { alternative: '#888' } } },
    '@expo/vector-icons/Ionicons': { default: 'Icon' },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  }).default;

  for (const [setting, title, explanation] of [
    ['difficulty', '난이도', /하·중·상/],
    ['attitude', '상대의 태도', /친절·보통·까다로움·진상/],
  ]) {
    const button = findNode(SettingTitle({ setting }), (node) => node.props?.accessibilityLabel === `${title} 도움말`);
    assert.equal(button.props.accessibilityRole, 'button');
    button.props.onPress();
    assert.equal(alerts.at(-1).title, title);
    assert.match(alerts.at(-1).description, explanation);
    assert.equal(alerts.at(-1).confirmLabel, '확인');
  }
});

test('failed retry keeps recovery actions and lets the user return home to reject a ringing call', async () => {
  const s = scheduleScreen({ failedCancellations: 3 });
  await s.complete();
  s.alerts.at(-1).onConfirm(); await flush();
  assert.equal(s.alerts.at(-1).confirmLabel, '취소 다시 시도');
  assert.equal(s.alerts.at(-1).cancelLabel, '홈으로');
  assert.equal(s.removals.length, 0);
  s.alerts.at(-1).onCancel();
  assert.deepEqual(s.routes, ['/(tabs)/(home)/home']);
  assert.equal(s.creates, 1);
});
