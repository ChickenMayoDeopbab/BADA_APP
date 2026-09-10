/** Raw PCM playback lifecycle. No React/native dependencies so races can be tested. */
export const TRAIN_SAMPLE_RATE = 16000;
const PREBUFFER_FRAMES = TRAIN_SAMPLE_RATE / 4;
const TAIL_MS = 300;

export interface PlaybackStats {
  type: "playback_stats";
  turn: number;
  chunks: number;
  played_ms?: number;
  dropped_chunks: number;
  // These counters avoid presenting JS callback timing as acoustic output timing.
  completed_played_ms: number;
  invalid_bytes: number;
  end_reason: string;
}

export interface PlaybackDriver {
  enqueue: (samples: Float32Array, onEnded: () => void) => void;
  clear: () => void;
  idle: () => void;
}
interface Turn {
  id: number;
  chunks: number;
  chunkEnds: number[];
  receivedBytes: number;
  completedFrames: number;
  pending: Float32Array[];
  pendingFrames: number;
  outstanding: number;
  started: boolean;
  ended: boolean;
  leftover: number | null;
  invalidBytes: number;
}
interface Options {
  driver: PlaybackDriver;
  onBlocked: (blocked: boolean) => void;
  onStats: (stats: PlaybackStats) => void;
  onError: (error: unknown) => void;
  setTimer?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

export class TrainPlayback {
  private current: Turn | null = null;
  private turns = new Set<Turn>();
  private nextTurn = 0;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private tail: ReturnType<typeof setTimeout> | null = null;
  private timer: NonNullable<Options["setTimer"]>;
  private cancelTimer: NonNullable<Options["clearTimer"]>;

  constructor(private options: Options) {
    this.timer = options.setTimer ?? setTimeout;
    this.cancelTimer = options.clearTimer ?? clearTimeout;
  }

  private block() {
    if (this.tail !== null) this.cancelTimer(this.tail);
    this.tail = null;
    this.options.onBlocked(true);
  }

  begin() {
    this.block();
    // Multiple emotion messages within an unfinished turn are metadata updates.
    if (this.current && !this.current.ended) return;
    this.current = {
      id: this.nextTurn++, chunks: 0, chunkEnds: [], receivedBytes: 0,
      completedFrames: 0, pending: [], pendingFrames: 0, outstanding: 0,
      started: false, ended: false, leftover: null, invalidBytes: 0,
    };
    this.turns.add(this.current);
    this.watch();
  }

  push(data: ArrayBuffer) {
    if (!data.byteLength) return;
    if (!this.current || this.current.ended) this.begin();
    this.block();
    const turn = this.current!;
    turn.chunks++;
    turn.receivedBytes += data.byteLength;
    turn.chunkEnds.push(turn.receivedBytes);
    const backlog = [...this.turns].reduce((bytes, t) => bytes + t.receivedBytes - t.completedFrames * 2, 0);
    if (backlog > TRAIN_SAMPLE_RATE * 2 * 60) {
      this.fail(new Error("PCM playback backlog exceeded 60 seconds"));
      return;
    }
    this.watch();
    const bytes = new Uint8Array(data);
    const count = Math.floor((bytes.length + (turn.leftover === null ? 0 : 1)) / 2);
    const samples = new Float32Array(count);
    let offset = 0;
    for (let i = 0; i < count; i++) {
      const low = turn.leftover ?? bytes[offset++];
      turn.leftover = null;
      const sample = low | (bytes[offset++] << 8);
      samples[i] = (sample >= 0x8000 ? sample - 0x10000 : sample) / 32768;
    }
    if (offset < bytes.length) turn.leftover = bytes[offset];
    if (!count) return;
    turn.pending.push(samples);
    turn.pendingFrames += count;
    if (turn.started || turn.pendingFrames >= PREBUFFER_FRAMES) this.flush(turn);
  }

  end() {
    const turn = this.current;
    if (!turn || turn.ended) return;
    turn.ended = true;
    // A partial sample must never leak into the following turn.
    if (turn.leftover !== null) turn.invalidBytes++;
    turn.leftover = null;
    this.flush(turn);
    this.finish(turn);
  }

  private flush(turn: Turn) {
    if (!turn.pendingFrames) return;
    // One native buffer for the initial prebuffer, then enqueue incoming PCM directly.
    const samples = turn.pending.length === 1 ? turn.pending[0] : new Float32Array(turn.pendingFrames);
    if (turn.pending.length > 1) {
      let offset = 0;
      for (const part of turn.pending) { samples.set(part, offset); offset += part.length; }
    }
    turn.pending = [];
    turn.pendingFrames = 0;
    turn.started = true;
    turn.outstanding++;
    const generation = this.generation;
    let completed = false;
    try {
      this.options.driver.enqueue(samples, () => {
        if (completed || generation !== this.generation) return;
        completed = true;
        turn.outstanding--;
        turn.completedFrames += samples.length;
        this.finish(turn);
        this.watch();
      });
    } catch (error) {
      this.fail(error);
    }
  }

  private stats(turn: Turn, reason: string): PlaybackStats {
    const completedBytes = turn.completedFrames * 2;
    return {
      type: "playback_stats", turn: turn.id, chunks: turn.chunks,
      ...(reason === "completed" ? { played_ms: turn.completedFrames / 16 } : {}),
      completed_played_ms: turn.completedFrames / 16,
      dropped_chunks: turn.chunkEnds.filter((end) => end > completedBytes).length,
      invalid_bytes: turn.invalidBytes, end_reason: reason,
    };
  }

  private finish(turn: Turn) {
    if (!this.turns.has(turn) || !turn.ended || turn.pendingFrames || turn.outstanding) return;
    this.turns.delete(turn);
    this.watch();
    this.options.onStats(this.stats(turn, "completed"));
    this.release();
  }

  private watch() {
    if (this.watchdog !== null) this.cancelTimer(this.watchdog);
    this.watchdog = null;
    if (!this.turns.size) return;
    const remainingMs = [...this.turns].reduce((ms, t) => ms + t.receivedBytes / 32 - t.completedFrames / 16, 0);
    this.watchdog = this.timer(() => {
      this.watchdog = null;
      this.fail(new Error("PCM playback or speaking_end timed out"));
    }, remainingMs + 15000);
  }

  private release() {
    if (this.turns.size || this.tail !== null) return;
    const generation = this.generation;
    this.tail = this.timer(() => {
      this.tail = null;
      if (generation !== this.generation || this.turns.size) return;
      this.options.driver.idle();
      this.options.onBlocked(false);
    }, TAIL_MS);
  }

  reset(reason = "interrupt") {
    this.generation++;
    if (this.watchdog !== null) this.cancelTimer(this.watchdog);
    this.watchdog = null;
    if (this.tail !== null) this.cancelTimer(this.tail);
    this.tail = null;
    this.options.driver.clear();
    for (const turn of this.turns) this.options.onStats(this.stats(turn, reason));
    this.turns.clear();
    this.current = null;
    // Even an interrupt leaves a short speaker tail.
    this.release();
  }

  fail(error: unknown) {
    this.reset("playback_error");
    this.options.onError(error);
  }

  dispose() {
    this.reset("disposed");
    if (this.tail !== null) this.cancelTimer(this.tail);
    this.tail = null;
  }
}
