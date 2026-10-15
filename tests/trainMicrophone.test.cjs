const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

/** Run production TypeScript without a native bridge. */
function loadSource(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.require = (id) => {
    assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
    return mocks[id];
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const { MicrophoneNoiseGate, TrainMicrophone } = loadSource('../utils/trainMicrophone.ts');

/** Generate deterministic PCM, with a non-integral speech period to exercise DC correction. */
function tone(ms, amplitude = 0.08, frequency = 233) {
  const bytes = Buffer.alloc(ms * 32);
  for (let index = 0; index < bytes.length / 2; index++) {
    bytes.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * frequency / 16000) * amplitude * 32767), index * 2);
  }
  return bytes;
}
const arrayBuffer = (bytes) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const append = (outputs, data) => { if (data) outputs.push(Buffer.from(data)); };

/** Process fixtures using the same arbitrary chunks as a recorder, then finish the local call. */
function filter(input, sizes = [2048]) {
  const gate = new MicrophoneNoiseGate();
  const output = [];
  let offset = 0, chunk = 0;
  while (offset < input.length) {
    const end = Math.min(input.length, offset + sizes[chunk++ % sizes.length]);
    append(output, gate.push(arrayBuffer(input.subarray(offset, end))));
    offset = end;
  }
  append(output, gate.flush());
  return Buffer.concat(output);
}

test('quiet noise becomes silence without shortening server endpointing or recording time', () => {
  const input = tone(2307, 0.001);
  const result = filter(input, [1, 127, 2048, 3200, 33]);
  assert.equal(result.length, input.length);
  assert.ok(result.every((value) => value === 0));
});

test('speech PCM including a partial final frame is unchanged at arbitrary and odd boundaries', () => {
  const input = tone(817);
  assert.deepEqual(filter(input, [1, 3, 2048, 7, 4096]), input);
  assert.deepEqual(filter(input, [262144]), input);
});

test('short yes-like utterance preserves 100ms onset and 400ms ending, then resumes silence', () => {
  const input = Buffer.concat([tone(500, 0.001), tone(20), tone(700, 0.001)]);
  const result = filter(input);
  assert.ok(result.subarray(0, 400 * 32).every((byte) => byte === 0));
  assert.deepEqual(result.subarray(400 * 32, 920 * 32), input.subarray(400 * 32, 920 * 32));
  assert.ok(result.subarray(920 * 32).every((byte) => byte === 0));
});

test('quiet speech after ambient calibration is retained and speech at startup needs no warmup', () => {
  const input = Buffer.concat([tone(1500, 0.002), tone(100, 0.008)]);
  assert.deepEqual(filter(input).subarray(1500 * 32), input.subarray(1500 * 32));
  assert.deepEqual(filter(tone(20, 0.008)), tone(20, 0.008));
});

test('DC bias cannot open the input gate', () => {
  const input = Buffer.alloc(32000);
  for (let i = 0; i < input.length; i += 2) input.writeInt16LE(4000, i);
  assert.ok(filter(input).every((byte) => byte === 0));
});

test('clipped positive and negative speech passes unchanged; nearby loud voices are not isolated', () => {
  const input = Buffer.alloc(640);
  for (let i = 0; i < input.length; i += 2) input.writeInt16LE(i % 4 ? -32768 : 32767, i);
  assert.deepEqual(filter(input), input);
});

test('100ms lookahead stays bounded during long silence and emits empty input only once flushed', () => {
  const gate = new MicrophoneNoiseGate();
  assert.equal(gate.push(new ArrayBuffer(0)), null);
  let emitted = 0;
  for (let i = 0; i < 10000; i++) {
    emitted += gate.push(new ArrayBuffer(640))?.byteLength ?? 0;
    assert.ok((i + 1) * 640 - emitted <= 3200);
  }
  emitted += gate.flush().byteLength;
  assert.equal(emitted, 6400000);
  assert.equal(gate.flush(), null);
});

test('flush drops only an incomplete PCM sample and resets state for the next call', () => {
  const gate = new MicrophoneNoiseGate();
  gate.push(arrayBuffer(Buffer.concat([tone(27), Buffer.from([42])])));
  assert.deepEqual(Buffer.from(gate.flush()), tone(27));
  assert.equal(gate.flush(), null);
  gate.push(arrayBuffer(tone(200, 0.001)));
  assert.ok(Buffer.from(gate.flush()).every((byte) => byte === 0));
});

for (const [name, block] of [
  ['AI playback/tail', (mic, value) => mic.setPlaybackBlocked(value)],
  ['user mute', (mic, value) => mic.setMuted(value)],
  ['background', (mic, value) => mic.setActive(!value)],
]) {
  test(`${name} immediately drops lookahead and never leaks it after unblocking`, () => {
    const sent = [];
    const mic = new TrainMicrophone();
    mic.start((data) => append(sent, data));
    mic.push(arrayBuffer(tone(80)));
    block(mic, true);
    mic.push(arrayBuffer(tone(1000)));
    block(mic, false);
    mic.push(arrayBuffer(tone(500, 0.001)));
    mic.stop(true);
    assert.equal(Buffer.concat(sent).length, 500 * 32);
    assert.ok(Buffer.concat(sent).every((byte) => byte === 0));
  });
}

test('local stop flushes speech once before end; disposal discards and repeated calls stay isolated', () => {
  const sent = [], mic = new TrainMicrophone();
  mic.start((data) => append(sent, data));
  mic.push(arrayBuffer(tone(27)));
  mic.stop(true); mic.stop(true);
  mic.push(arrayBuffer(tone(1000)));
  assert.deepEqual(Buffer.concat(sent), tone(27));
  mic.start((data) => append(sent, data));
  mic.push(arrayBuffer(tone(80))); mic.stop();
  assert.deepEqual(Buffer.concat(sent), tone(27));
});



/** Mount the real capture hook with deterministic React refs and capture drivers. */
function mountAudio(platform = 'android') {
  const effects = [], stateListeners = [], sent = [], errors = [], events = [];
  let playbackOptions, nativeListener;
  const recorder = {
    init: () => events.push('init'),
    start: () => events.push('start'),
    stop: async () => { events.push('stop'); },
    on: (_, callback) => {
      nativeListener = callback;
      return { remove: () => events.push('remove') };
    },
  };
  const appState = {
    currentState: 'active',
    addEventListener: (_, callback) => {
      stateListeners.push(callback);
      return { remove: () => {} };
    },
  };
  const { useAudio } = loadSource('../hooks/useAudio.ts', {
    '@/utils/trainMicrophone': { TrainMicrophone },
    './useTrainPlayback': { useTrainPlayback: (options) => {
      playbackOptions = options;
      return { preparePlayback() {} };
    } },
    'react': {
      useRef: (value) => ({ current: value }),
      useCallback: (callback) => callback,
      useEffect: (callback) => effects.push(callback),
    },
    'react-native': { Platform: { OS: platform }, AppState: appState },
    'expo-audio': {},
    'react-native-audio-record': { default: recorder },
  });
  const hook = useAudio({ onRecordingError: (error) => errors.push(error) });
  const cleanups = effects.map((effect) => effect());
  return {
    hook, recorder, events, errors, sent,
    send: (data) => { append(sent, data); events.push('pcm'); },
    emit: (bytes) => nativeListener(bytes.toString('base64')),
    playbackBlocked: (value) => playbackOptions.onPlaybackBlocked(value),
    setState: (state) => { appState.currentState = state; stateListeners.forEach((listener) => listener(state)); },
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

/** Yield through queued capture operations without time-based sleeps. */
const nextTick = () => new Promise((resolve) => setImmediate(resolve));

/** Control an in-progress permission/load operation. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('native hook starts once, delivers filtered PCM, then flushes synchronously before end', async () => {
  const s = mountAudio();
  const first = s.hook.startSendingAudio(s.send);
  assert.equal(first, s.hook.startSendingAudio(s.send));
  await first;
  await s.hook.startSendingAudio(s.send);
  s.emit(tone(27));
  assert.equal(s.sent.length, 0);
  const stopped = s.hook.stopSendingAudio(true);
  s.events.push('end');
  assert.deepEqual(Buffer.concat(s.sent), tone(27));
  assert.ok(s.events.indexOf('pcm') < s.events.indexOf('end'));
  await stopped;
  s.emit(tone(1000));
  assert.equal(s.events.filter((event) => event === 'start').length, 1);
  assert.equal(s.events.filter((event) => event === 'stop').length, 1);
  assert.equal(Buffer.concat(s.sent).length, 27 * 32);
  s.unmount();
});

test('native hook discards buffered input on playback, mute and background with no callbacks between', async () => {
  const s = mountAudio();
  for (const block of [s.playbackBlocked, s.hook.setMicrophoneMuted, (value) => s.setState(value ? 'background' : 'active')]) {
    await s.hook.startSendingAudio(s.send);
    s.emit(tone(80));
    block(true); block(false);
    s.emit(tone(500, 0.001));
    await s.hook.stopSendingAudio(true);
  }
  assert.ok(Buffer.concat(s.sent).every((byte) => byte === 0));
  s.unmount();
});

test('native stop and restart serialize hardware cleanup; callbacks from old sessions are ignored', async () => {
  const s = mountAudio();
  await s.hook.startSendingAudio(s.send);
  const stop = deferred();
  s.recorder.stop = () => { s.events.push('stop'); return stop.promise; };
  const stopped = s.hook.stopSendingAudio();
  const restarted = s.hook.startSendingAudio(s.send);
  await nextTick();
  s.emit(tone(200));
  assert.equal(s.sent.length, 0);
  assert.equal(s.events.filter((event) => event === 'start').length, 1);
  stop.resolve(); await stopped; await restarted;
  assert.equal(s.events.filter((event) => event === 'start').length, 2);
  s.emit(tone(27));
  await s.hook.stopSendingAudio(true);
  assert.deepEqual(Buffer.concat(s.sent), tone(27));
  s.unmount();
});

test('native capture failure removes its listener and reports a recoverable error', async () => {
  const s = mountAudio();
  s.recorder.start = () => { throw new Error('recording failed'); };
  await assert.rejects(s.hook.startSendingAudio(s.send), /recording failed/);
  assert.equal(s.errors.length, 1);
  assert.ok(s.events.includes('remove'));
  s.emit(tone(200));
  assert.equal(s.sent.length, 0);
  s.recorder.start = () => {};
  await s.hook.startSendingAudio(s.send);
  s.emit(tone(27));
  await s.hook.stopSendingAudio(true);
  assert.deepEqual(Buffer.concat(s.sent), tone(27));
  s.unmount();
});

/** Install and restore a minimal browser audio environment for the real hook. */
function fakeWeb(t) {
  const requests = [], tracks = [], contexts = [], nodes = [];
  const environment = {
    getUserMedia: async (constraints) => {
      requests.push(constraints);
      const track = { stopped: false, stop() { this.stopped = true; } };
      tracks.push(track);
      return { getTracks: () => [track] };
    },
    loadModule: async () => {},
    sampleRate: 16000,
  };
  class Context {
    constructor() {
      contexts.push(this);
      this.sampleRate = environment.sampleRate;
      this.state = 'suspended';
      this.audioWorklet = { addModule: () => environment.loadModule() };
      this.destination = {};
    }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  }
  class Worklet {
    constructor() {
      nodes.push(this);
      this.port = { close() {}, onmessage: null };
    }
    connect() {} disconnect() {}
  }
  for (const [key, value] of Object.entries({
    navigator: { mediaDevices: { getUserMedia: (constraints) => environment.getUserMedia(constraints) } },
    window: { AudioContext: Context },
    AudioWorkletNode: Worklet,
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  return { environment, requests, tracks, contexts, nodes };
}

test('web requests built-in suppression and sends the same filtered PCM as native', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web');
  await s.hook.startSendingAudio(s.send);
  const constraints = browser.requests[0].audio;
  assert.equal(constraints.noiseSuppression, true);
  assert.equal(constraints.echoCancellation, true);
  assert.equal(constraints.autoGainControl, true);
  browser.nodes[0].port.onmessage({ data: arrayBuffer(tone(27)) });
  await s.hook.stopSendingAudio(true);
  assert.deepEqual(Buffer.concat(s.sent), tone(27));
  assert.ok(browser.tracks.every((track) => track.stopped));
  assert.ok(browser.contexts.every((ctx) => ctx.state === 'closed'));
  s.unmount();
});

test('stop during pending web permission never creates a worklet or transmits late audio', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web'), permission = deferred();
  const getUserMedia = browser.environment.getUserMedia;
  browser.environment.getUserMedia = async (constraints) => {
    await permission.promise;
    return getUserMedia(constraints);
  };
  const started = s.hook.startSendingAudio(s.send);
  await nextTick();
  const stopped = s.hook.stopSendingAudio();
  permission.resolve(); await started; await stopped;
  assert.equal(browser.nodes.length, 0);
  assert.equal(s.sent.length, 0);
  assert.ok(browser.tracks.every((track) => track.stopped));
  s.unmount();
});

test('stop during web worklet loading closes capture before the next call can start', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web'), moduleLoad = deferred();
  browser.environment.loadModule = () => moduleLoad.promise;
  const started = s.hook.startSendingAudio(s.send);
  await nextTick();
  const stopped = s.hook.stopSendingAudio();
  const restarted = s.hook.startSendingAudio(s.send);
  moduleLoad.resolve(); await started; await stopped; await restarted;
  assert.equal(browser.nodes.length, 1);
  assert.equal(browser.tracks[0].stopped, true);
  assert.equal(browser.contexts[0].state, 'closed');
  browser.nodes[0].port.onmessage({ data: arrayBuffer(tone(27)) });
  await s.hook.stopSendingAudio(true);
  assert.deepEqual(Buffer.concat(s.sent), tone(27));
  s.unmount();
});

test('web initialization failure cleans hardware, surfaces the error, and permits retry', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web');
  browser.environment.loadModule = async () => { throw new Error('worklet unavailable'); };
  await assert.rejects(s.hook.startSendingAudio(s.send), /worklet unavailable/);
  assert.equal(s.errors.length, 1);
  assert.ok(browser.tracks[0].stopped);
  assert.equal(browser.contexts[0].state, 'closed');
  browser.environment.loadModule = async () => {};
  await s.hook.startSendingAudio(s.send);
  await s.hook.stopSendingAudio();
  s.unmount();
});

test('web rejects unexpected sample rate rather than mislabelling PCM as 16 kHz', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web');
  browser.environment.sampleRate = 48000;
  await assert.rejects(s.hook.startSendingAudio(s.send), /sample rate/);
  assert.ok(browser.tracks[0].stopped);
  assert.equal(browser.contexts[0].state, 'closed');
  s.unmount();
});

test('unmount during web permission loading discards resources without an error alert', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web'), permission = deferred();
  const getUserMedia = browser.environment.getUserMedia;
  browser.environment.getUserMedia = async (constraints) => {
    await permission.promise;
    return getUserMedia(constraints);
  };
  const started = s.hook.startSendingAudio(s.send);
  await nextTick(); s.unmount(); permission.resolve(); await started; await nextTick();
  assert.ok(browser.tracks.every((track) => track.stopped));
  assert.equal(browser.nodes.length, 0);
  assert.equal(s.errors.length, 0);
});

test('worklet emits 20ms PCM16 frames across render quanta, clips safely, and produces no speaker audio', () => {
  const vm = require('node:vm');
  let Processor;
  const posted = [];
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../public/pcm-processor.js'), 'utf8'), {
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (data) => posted.push(data) }; } },
    registerProcessor: (_, implementation) => { Processor = implementation; },
  });
  const worklet = new Processor();
  const output = new Float32Array(128);
  for (let i = 0; i < 5; i++) {
    const input = new Float32Array(128);
    for (let j = 0; j < input.length; j++) input[j] = j % 2 ? -2 : 2;
    assert.equal(worklet.process([[input]], [[output]]), true);
  }
  assert.equal(posted.length, 2);
  for (const data of posted) {
    assert.equal(data.byteLength, 640);
    const view = new DataView(data);
    for (let i = 0; i < 320; i++) assert.equal(view.getInt16(i * 2, true), i % 2 ? -32768 : 32767);
  }
  assert.ok(output.every((value) => value === 0));
  assert.equal(worklet.process([]), true);
});

test('a transport failure during final flush still closes capture hardware', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web');
  await s.hook.startSendingAudio(() => { throw new Error('socket closed'); });
  browser.nodes[0].port.onmessage({ data: arrayBuffer(tone(27)) });
  await assert.rejects(s.hook.stopSendingAudio(true), /socket closed/);
  assert.ok(browser.tracks[0].stopped);
  assert.equal(browser.contexts[0].state, 'closed');
  s.unmount();
});

test('web reuses the capture context prepared during the permission gesture', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web');
  assert.equal(await s.hook.requestPermission(), true);
  assert.equal(browser.contexts.length, 1);
  await s.hook.startSendingAudio(s.send);
  assert.equal(browser.contexts.length, 1);
  assert.equal(browser.tracks[0].stopped, true);
  await s.hook.stopSendingAudio();
  assert.ok(browser.tracks.every((track) => track.stopped));
  s.unmount();
});

test('end during the initial permission request never prepares capture after the call', async (t) => {
  const browser = fakeWeb(t), s = mountAudio('web'), permission = deferred();
  const getUserMedia = browser.environment.getUserMedia;
  browser.environment.getUserMedia = async (constraints) => {
    await permission.promise;
    return getUserMedia(constraints);
  };
  const requested = s.hook.requestPermission();
  await s.hook.stopSendingAudio();
  permission.resolve();
  assert.equal(await requested, false);
  assert.ok(browser.tracks.every((track) => track.stopped));
  assert.equal(browser.contexts.length, 0);
  s.unmount();
});
