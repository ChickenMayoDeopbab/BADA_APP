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

test('training help opens an anchored explanation and closes by tapping outside', () => {
  for (const setting of ['difficulty', 'attitude']) {
    const refs = [];
    let anchor = null, refIndex = 0;
    const SettingTitle = loadSource('../components/train/TrainingSettingTitle.tsx', {
      '@/design-system/colors': { SEMANTIC_COLORS: { label: { alternative: '#888' } } },
      '@expo/vector-icons/Ionicons': { default: 'Icon' },
      'react': {
        useRef: (initial) => refs[refIndex++] ??= { current: initial },
        useState: () => [anchor, (next) => { anchor = next; }],
      },
      'react-native': {
        View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView',
        useWindowDimensions: () => ({ width: 360, height: 800 }),
      },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) },
      'react/jsx-runtime': { jsx, jsxs: jsx },
    }).default;
    const render = () => { refIndex = 0; return SettingTitle({ setting }); };
    let tree = render();
    const button = findNode(tree, (node) => node.props?.accessibilityRole === 'button');
    button.props.ref.current = { measureInWindow: (callback) => callback(90, 180, 24, 24) };
    button.props.onPress();
    tree = render();
    assert.equal(findNode(tree, (node) => node.type === 'Modal').props.visible, true);
    assert.equal(findNode(tree, (node) => node.props?.style?.top === 212).props.style.left, 90);
    const explanation = findNode(tree, (node) => node.type === 'ScrollView').props.children.props.children;
    assert.match(explanation, setting === 'difficulty' ? /하·중·상/ : /친절·보통·까다로움·진상/);
    findNode(tree, (node) => node.props?.accessibilityLabel === '도움말 닫기').props.onPress();
    assert.equal(findNode(render(), (node) => node.type === 'Modal').props.visible, false);
  }
});


test('home recommendation artwork falls back after an image error and recovers for a new category icon', () => {
  let failedImageUrl = null;
  const Illustration = loadSource('../components/home/HomeScenarioIllustration.tsx', {
    '@/assets/home-pizza.svg': { default: 'Pizza' },
    '@/components/common/StyledImage': { default: 'Image' },
    'react': { useState: () => [failedImageUrl, (url) => { failedImageUrl = url; }] },
    'react-native': { View: 'View' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  }).default;
  assert.ok(findNode(Illustration({}), (node) => node.type === 'Pizza'));
  const categoryIconUrl = 'https://example.test/work-icon.svg';
  const image = findNode(Illustration({ categoryIconUrl }), (node) => node.type === 'Image');
  assert.equal(image.props.source, categoryIconUrl);
  image.props.onError();
  assert.ok(findNode(Illustration({ categoryIconUrl }), (node) => node.type === 'Pizza'));
  const nextIcon = 'https://example.test/daily-icon.svg';
  assert.equal(findNode(Illustration({ categoryIconUrl: nextIcon }), (node) => node.type === 'Image').props.source, nextIcon);
});

/** Render the call screen without native audio, timers or network side effects. */
function callScreen(initialStep, height = 568) {
  const states = [], refs = [], events = [];
  let stateIndex = 0, refIndex = 0;
  const Screen = loadSource('../app/train.tsx', {
    '@/components/train/CallBackground': { default: 'Background' },
    '@/api/trainingCallApi': {},
    '@/api/error': {},
    '@/hooks/useSensitiveConsentGuard': { useSensitiveConsentGuard: () => async () => true },
    '@/utils/trainingCallScenario': {},
    '@/components/train/ScriptHintBar': { default: 'Hint' },
    '@/context/AppAlertContext': { useAppAlert: () => ({ showAlert() {} }) },
    '@/design-system/colors': require('../design-system/colors'),
    '@/hooks/useAndroidBackHandler': { useAndroidBackHandler() {} },
    '@/hooks/useScenarios': { useScenario: () => ({ data: { title: '피자 주문하기' } }) },
    '@/hooks/useIncomingCallRinging': { useIncomingCallRinging() {} },
    '@/hooks/useAudio': { useAudio: () => ({
      stopSendingAudio: async () => { events.push('stop'); },
      resetStream: (reason) => events.push(reason),
    }) },
    '@/hooks/useTrainWebSocket': { useTrainWebSocket: () => ({
      isConnected: true, isAiSpeaking: false,
      sendEndCall: () => events.push('end'),
    }) },
    '@/utils/completedCallDuration': { saveCompletedCallDuration: async () => {} },
    '@/utils/mediaVolumeControl': {},
    '@expo/vector-icons/Ionicons': { default: 'Icon' },
    'expo-router': {
      router: {}, useFocusEffect() {},
      useLocalSearchParams: () => ({ sessionId: 'session-1', scenarioId: '1' }),
    },
    'react': {
      useEffect() {}, useMemo: (compute) => compute(), useCallback: (callback) => callback,
      useRef: (initial) => refs[refIndex++] ??= { current: initial },
      useState: (initial) => {
        const i = stateIndex++;
        if (!(i in states)) states[i] = initial === 'receive' ? initialStep : Array.isArray(initial) ? [{ role: 'user', text: '안녕하세요' }] : initial;
        return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
      },
    },
    'react-native': {
      View: 'View', Text: 'Text', TouchableOpacity: 'Button', Modal: 'Modal', ScrollView: 'ScrollView',
      StyleSheet: { create: (styles) => styles }, BackHandler: {},
      useWindowDimensions: () => ({ width: 320, height, fontScale: 1 }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  }).default;
  return { events, render: () => { stateIndex = 0; refIndex = 0; return Screen(); } };
}

test('receiving and active calls stay fixed while the script alone scrolls and ending still stops audio', () => {
  for (const height of [568, 874]) {
    const incoming = callScreen('receive', height);
    assert.equal(findNode(incoming.render(), (node) => node.type === 'ScrollView'), undefined);
    const s = callScreen('training', height);
    let tree = s.render();
    assert.equal(findNode(tree, (node) => node.type === 'ScrollView'), undefined);
    findNode(tree, (node) => node.type === 'Button' && node.props.children?.props?.name === 'document-text').props.onPress();
    tree = s.render();
    const script = findNode(tree, (node) => node.type === 'ScrollView');
    assert.ok(script, 'the conversation remains scrollable inside the script panel');
    const scrolls = [];
    script.props.ref.current = { scrollToEnd: (options) => scrolls.push(options) };
    script.props.onContentSizeChange();
    assert.deepEqual(scrolls, [{ animated: true }]);
    findNode(tree, (node) => node.props?.accessibilityLabel === '통화 종료').props.onPress();
    assert.deepEqual(s.events, ['stop', 'call_end', 'end']);
    assert.equal(findNode(s.render(), (node) => node.props?.accessibilityLabel === '통화 종료').props.disabled, true);
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
