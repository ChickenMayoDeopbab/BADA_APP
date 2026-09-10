const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../utils/trainPlayback.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(filename, module);
loaded._compile(compiled, filename);
const { TrainPlayback } = loaded.exports;

function setup() {
  const buffers = [], stats = [], gates = [], errors = [], timers = new Map();
  let time = 0, nextId = 0, clears = 0, idles = 0;
  const driver = {
    enqueue(samples, end) { buffers.push({ samples, end }); },
    clear() { clears++; }, idle() { idles++; },
  };
  const player = new TrainPlayback({
    driver, onBlocked: (b) => gates.push(b), onStats: (s) => stats.push(s), onError: (e) => errors.push(e),
    setTimer: (callback, ms) => { const id = ++nextId; timers.set(id, { at: time + ms, callback }); return id; },
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (ms) => {
    time += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= time) { timers.delete(id); timer.callback(); }
    }
  };
  return { player, driver, buffers, stats, gates, errors, advance, get clears() { return clears; }, get idles() { return idles; } };
}
const pcm = (ms) => new ArrayBuffer(ms * 32);

test('250ms prebuffer merges tiny chunks without creating a player per chunk', () => {
  const s = setup();
  for (let i = 0; i < 24; i++) s.player.push(pcm(10));
  assert.equal(s.buffers.length, 0);
  s.player.push(pcm(10));
  assert.equal(s.buffers.length, 1);
  assert.equal(s.buffers[0].samples.length, 4000);
});

test('short response flushes at speaking_end; mic waits for real completion + 300ms', () => {
  const s = setup();
  s.player.push(pcm(50)); s.player.end();
  s.advance(1000);
  assert.equal(s.gates.at(-1), true);
  assert.equal(s.stats.length, 0);
  s.buffers[0].end();
  s.advance(299); assert.equal(s.gates.at(-1), true);
  s.advance(1); assert.equal(s.gates.at(-1), false);
  assert.equal(s.stats[0].played_ms, 50);
});

test('temporary queue starvation does not open the mic while server is sending', () => {
  const s = setup();
  s.player.push(pcm(250)); s.buffers[0].end(); s.advance(1000);
  assert.equal(s.gates.at(-1), true);
  s.player.push(pcm(100)); s.player.end(); s.buffers[1].end(); s.advance(300);
  assert.equal(s.gates.at(-1), false);
  assert.equal(s.stats[0].played_ms, 350);
});

test('new emotion preserves previous turn tail and stats stay associated with each turn', () => {
  const s = setup();
  s.player.push(pcm(250)); s.player.end();
  s.player.begin(); s.player.push(pcm(100)); s.player.end();
  assert.equal(s.clears, 0);
  s.buffers[0].end(); s.advance(300);
  assert.equal(s.gates.at(-1), true);
  s.buffers[1].end(); s.advance(300);
  assert.deepEqual(s.stats.map(x => [x.turn, x.played_ms]), [[0, 250], [1, 100]]);
  assert.equal(s.gates.at(-1), false);
});

test('new turn cancels the old tail release timer', () => {
  const s = setup();
  s.player.push(pcm(250)); s.player.end(); s.buffers[0].end();
  s.advance(200); s.player.begin(); s.advance(100);
  assert.equal(s.gates.at(-1), true);
});

test('odd bytes carry within a turn and never into the next turn', () => {
  const s = setup();
  s.player.push(Uint8Array.from([0]).buffer);
  s.player.push(Uint8Array.from([128, 255]).buffer);
  s.player.push(Uint8Array.from([127, 42]).buffer);
  s.player.end();
  assert.deepEqual([...s.buffers[0].samples], [-1, 32767 / 32768]);
  s.buffers[0].end();
  assert.equal(s.stats[0].invalid_bytes, 1);
  s.player.push(Uint8Array.from([0, 0]).buffer); s.player.end();
  assert.deepEqual([...s.buffers[1].samples], [0]);
});

test('interrupt counts original chunks and ignores late or duplicate native callbacks', () => {
  const s = setup();
  s.player.push(pcm(100)); s.player.push(pcm(150)); s.player.push(pcm(100));
  s.player.reset();
  assert.equal(s.stats[0].dropped_chunks, 3);
  assert.equal(s.stats[0].played_ms, undefined);
  s.player.push(pcm(250)); s.player.end();
  s.buffers[0].end(); s.buffers[1].end(); s.advance(300);
  assert.equal(s.gates.at(-1), true);
  s.buffers[2].end(); s.buffers[2].end();
  assert.equal(s.stats.length, 2);
});

test('background reset discards pending prebuffer and reports exactly once', () => {
  const s = setup();
  s.player.push(pcm(10)); s.player.reset('background'); s.player.end(); s.player.reset();
  assert.equal(s.buffers.length, 0);
  assert.equal(s.stats.length, 1);
  assert.equal(s.stats[0].end_reason, 'background');
});

test('silent turn and repeated speaking_end finish once', () => {
  const s = setup();
  s.player.begin(); s.player.end(); s.player.end(); s.advance(300);
  assert.equal(s.stats.length, 1);
  assert.equal(s.gates.at(-1), false);
});

test('enqueue failure clears playback and surfaces error', () => {
  const s = setup();
  s.driver.enqueue = () => { throw new Error('audio focus'); };
  s.player.push(pcm(250));
  assert.equal(s.errors.length, 1);
  assert.equal(s.stats[0].end_reason, 'playback_error');
  s.advance(300); assert.equal(s.gates.at(-1), false);
});

test('disposing cancels pending unmute callbacks', () => {
  const s = setup();
  s.player.begin(); s.player.end(); s.player.dispose();
  const count = s.gates.length;
  s.advance(1000); assert.equal(s.gates.length, count);
});

test('missing completion or speaking_end fails explicitly instead of muting forever', () => {
  const s = setup();
  s.player.push(pcm(250)); s.player.end();
  s.advance(15250);
  assert.equal(s.errors.length, 1);
  assert.equal(s.stats[0].end_reason, 'playback_error');
});

test('unbounded producer is rejected before it can exhaust playback memory', () => {
  const s = setup();
  s.player.push(pcm(60001));
  assert.equal(s.buffers.length, 0);
  assert.equal(s.errors.length, 1);
});
