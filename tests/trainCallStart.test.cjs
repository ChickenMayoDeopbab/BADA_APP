const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

/** Run the real call screen as plain element objects. */
function loadSource(relativePath, mocks) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
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

/** Keep hook state between renders so a test can drive the screen like taps would. */
function hookRuntime() {
  const slots = [];
  let cursor = 0;
  const react = {
    useState: (initial) => {
      const slot = slots[cursor] ??= { value: initial };
      cursor++;
      return [slot.value, (next) => { slot.value = typeof next === 'function' ? next(slot.value) : next; }];
    },
    useRef: (initial) => (slots[cursor++] ??= { current: initial }),
    useMemo: (factory) => { cursor++; return factory(); },
    useCallback: (callback) => { cursor++; return callback; },
    useEffect: () => { cursor++; },
  };
  return { react, reset: () => { cursor = 0; } };
}

const nextTick = () => new Promise((resolve) => setImmediate(resolve));

function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, predicate);
      if (hit) return hit;
    }
    return undefined;
  }
  if (node.props && predicate(node)) return node;
  return find(node.props?.children, predicate);
}

/** Mount the call screen with the socket and microphone replaced by recorders. */
function mountTrain({ biosignalPhase = 'ready' } = {}) {
  const runtime = hookRuntime(), permission = deferred(), sockets = [], alerts = [], biosignal = [];
  let socketProps;
  const jsx = (type, props) => ({ type, props });
  const color = new Proxy({}, { get: () => color });
  const component = (name) => ({ __esModule: true, default: name });
  const { default: Train } = loadSource('../app/train.tsx', {
    '@/components/train/CallControls': { __esModule: true, default: 'CallControls' },
    '@/components/train/RestBaselineScreen': component('RestBaselineScreen'),
    '@/components/train/SwipeCallButton': component('SwipeCallButton'),
    '@/components/train/ScriptPanel': component('ScriptPanel'),
    '@/hooks/useBiosignalMeasurement': {
      useBiosignalMeasurement: (props) => {
        biosignal.push(['hook', props]);
        return { phase: biosignalPhase, finishRest: () => biosignal.push(['finishRest']) };
      },
    },
    '@/services/biosignal/measurementSession': {
      cancelBiosignalMeasurement: () => biosignal.push(['cancel']),
      isBiosignalMeasuring: () => true,
      markBiosignalCallEnd: () => biosignal.push(['callEnd']),
      markBiosignalMeditationEnd: () => biosignal.push(['meditationEnd']),
      markBiosignalMeditationStart: () => biosignal.push(['meditationStart']),
      markBiosignalWsAuthSent: (phoneMs) => biosignal.push(['wsAuthSent', phoneMs]),
    },
    '@/assets/train/call.svg': { __esModule: true, default: 'CallIcon' },
    '@/assets/train/hangup.svg': { __esModule: true, default: 'HangupIcon' },
    '@/hooks/useInitialScriptHint': { useInitialScriptHint: ({ scriptHint }) => ({ hint: scriptHint }) },
    '@/components/train/CallBackground': component('CallBackground'),
    '@/api/trainingCallApi': { acceptTrainingCallSchedule: async () => {}, cancelTrainingCallSchedule: async () => {} },
    '@/api/error': { getApiErrorMessage: () => '' },
    '@/hooks/useSensitiveConsentGuard': { useSensitiveConsentGuard: () => async () => true },
    '@/utils/trainingCallScenario': { getTrainingCallScenario: async () => undefined, removeTrainingCallScenario: async () => {} },
    '@/components/train/ScriptHintBar': component('ScriptHintBar'),
    '@/context/AppAlertContext': { useAppAlert: () => ({ showAlert: (alert) => alerts.push(alert.title) }) },
    '@/design-system/colors': { PALETTE: color, SEMANTIC_COLORS: color },
    '@/hooks/useAndroidBackHandler': { useAndroidBackHandler: () => {} },
    '@/hooks/useScenarios': { useScenario: () => ({ data: undefined }) },
    '@/hooks/useIncomingCallRinging': { useIncomingCallRinging: () => {} },
    '@/hooks/useAudio': {
      useAudio: () => ({
        requestPermission: () => permission.promise,
        startSendingAudio: async () => {},
        stopSendingAudio: async () => {},
        setMicrophoneMuted: () => {},
        beginPlayback: () => {},
        streamPcmChunk: () => {},
        flushPlayback: () => {},
        resetStream: () => {},
      }),
    },
    '@/hooks/useTrainWebSocket': {
      useTrainWebSocket: (props) => {
        socketProps = props;
        sockets.push(props.enabled);
        return {
          isConnected: false, isAiSpeaking: false, displayName: null,
          sendEndCall: () => {}, sendBinary: () => {}, sendMute: () => {}, sendJson: () => {}, setPlaybackBlocked: () => {},
        };
      },
    },
    '@/utils/completedCallDuration': { saveCompletedCallDuration: async () => {} },
    '@/utils/mediaVolumeControl': { setMediaVolumeControlEnabled: () => {} },
    '@expo/vector-icons/Ionicons': component('Ionicons'),
    'expo-router': {
      router: { replace: () => {}, back: () => {}, canGoBack: () => false },
      useFocusEffect: () => {},
      useLocalSearchParams: () => ({ sessionId: 'session-1', scenarioId: '115' }),
    },
    'react': runtime.react,
    'react-native': {
      BackHandler: { exitApp: () => {} },
      Image: 'Image', Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View',
      StyleSheet: { create: (styles) => styles },
      useWindowDimensions: () => ({ width: 402, height: 800, fontScale: 1 }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  });
  const render = () => { runtime.reset(); return Train(); };
  /** Accept the call and skip meditation, leaving the permission request pending. */
  const startCall = () => {
    find(render(), (node) => node.props.accessibilityLabel === '전화 받기').props.onPress();
    find(render(), (node) => typeof node.props.onSkip === 'function').props.onSkip();
    return render();
  };
  return { render, startCall, permission, sockets, alerts, biosignal, get socketProps() { return socketProps; } };
}

test('a failed microphone setup returns to the incoming call without ever opening the session socket', async () => {
  const s = mountTrain();
  s.startCall();
  s.permission.resolve(false);
  await nextTick();
  const tree = s.render();
  assert.deepEqual(s.alerts, ['마이크를 사용할 수 없어요']);
  assert.ok(find(tree, (node) => node.props.accessibilityLabel === '전화 받기'));
  assert.ok(s.sockets.every((enabled) => enabled === false));
});

test('the session socket opens only after the microphone is ready', async () => {
  const s = mountTrain();
  s.startCall();
  assert.equal(s.sockets.at(-1), false);
  s.permission.resolve(true);
  await nextTick();
  s.render();
  assert.equal(s.sockets.at(-1), true);
  assert.deepEqual(s.alerts, []);
});

test('the bell waits while the watch check runs and the rest screen comes before the incoming call', () => {
  const checking = mountTrain({ biosignalPhase: 'checking' });
  const checkingTree = checking.render();
  assert.equal(find(checkingTree, (node) => node.props.accessibilityLabel === '전화 받기'), undefined);
  assert.ok(find(checkingTree, (node) => node.type === 'CallBackground'));

  const rest = mountTrain({ biosignalPhase: 'rest' });
  const restScreen = find(rest.render(), (node) => node.type === 'RestBaselineScreen');
  assert.ok(restScreen);
  restScreen.props.onFinish();
  assert.deepEqual(rest.biosignal.at(-1), ['finishRest']);
  assert.deepEqual(rest.biosignal[0], ['hook', { isEnabled: true, sessionId: 'session-1' }]);
});

test('the call socket reports the auth time and asks whether to announce the watch measurement', () => {
  const s = mountTrain();
  s.render();
  assert.equal(s.socketProps.shouldSendBiosignalIntent(), true);
  s.socketProps.onAuthSent(123);
  assert.deepEqual(s.biosignal.at(-1), ['wsAuthSent', 123]);
});

test('meditation is marked and hanging up before the call starts cancels the measurement', async () => {
  const s = mountTrain();
  find(s.render(), (node) => node.props.accessibilityLabel === '전화 받기').props.onPress();
  find(s.render(), (node) => typeof node.props.onMeditate === 'function').props.onMeditate();
  find(s.render(), (node) => typeof node.props.onEnd === 'function').props.onEnd();
  const events = () => s.biosignal.filter(([name]) => name !== 'hook');
  assert.deepEqual(events(), [['meditationStart'], ['meditationEnd']]);
  s.permission.resolve(true);
  await nextTick();
  find(s.render(), (node) => node.props.accessibilityLabel === '통화 종료').props.onPress();
  assert.deepEqual(events().at(-1), ['cancel']);
});
