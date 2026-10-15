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

module.exports = { loadSource, tone, arrayBuffer };
