const FRAME_BYTES = 640; // 16 kHz · mono · PCM16, 20 ms
const PRE_ROLL_FRAMES = 5; // 100 ms lookahead protects quiet word onsets.
const HANGOVER_FRAMES = 20; // Keep 400 ms of word endings and short pauses.
const MIN_THRESHOLD = 0.003;
const MAX_THRESHOLD = 0.012; // Never keep raising the threshold over a quiet voice.

/** Join emitted PCM frames without changing their sample count or byte order. */
function joinFrames(frames: Uint8Array[]): ArrayBuffer | null {
  const length = frames.reduce((total, frame) => total + frame.length, 0);
  if (!length) return null;
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const frame of frames) {
    joined.set(frame, offset);
    offset += frame.length;
  }
  return joined.buffer;
}

/** Conservative energy gate, not a speech model or a speaker identification system. */
export class MicrophoneNoiseGate {
  private frame = new Uint8Array(FRAME_BYTES);
  private frameLength = 0;
  private pending: { bytes: Uint8Array; shouldPass: boolean }[] = [];
  private noiseFloor = 0.0005;
  private hangover = 0;

  /** Accept arbitrary capture boundaries, including a sample split across two chunks. */
  push(data: ArrayBuffer): ArrayBuffer | null {
    const input = new Uint8Array(data);
    const output: Uint8Array[] = [];
    let offset = 0;
    while (offset < input.length) {
      const count = Math.min(FRAME_BYTES - this.frameLength, input.length - offset);
      this.frame.set(input.subarray(offset, offset + count), this.frameLength);
      this.frameLength += count;
      offset += count;
      if (this.frameLength === FRAME_BYTES) {
        this.classify(this.frame, output);
        this.frame = new Uint8Array(FRAME_BYTES);
        this.frameLength = 0;
      }
    }
    return joinFrames(output);
  }

  /** Release the final lookahead before a local end message, without padding time. */
  flush(): ArrayBuffer | null {
    const output: Uint8Array[] = [];
    const validLength = this.frameLength - this.frameLength % 2;
    if (validLength) this.classify(this.frame.slice(0, validLength), output);
    for (const frame of this.pending) {
      output.push(frame.shouldPass ? frame.bytes : new Uint8Array(frame.bytes.length));
    }
    this.reset();
    return joinFrames(output);
  }

  /** Forget buffered sound and calibration across mute, playback, background and calls. */
  reset(): void {
    this.frame = new Uint8Array(FRAME_BYTES);
    this.frameLength = 0;
    this.pending = [];
    this.noiseFloor = 0.0005;
    this.hangover = 0;
  }

  /** Classify a frame by DC-corrected RMS; passed speech remains byte-for-byte intact. */
  private classify(bytes: Uint8Array, output: Uint8Array[]): void {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = bytes.byteLength / 2;
    let sum = 0;
    let squares = 0;
    for (let index = 0; index < count; index++) {
      const sample = view.getInt16(index * 2, true) / 32768;
      sum += sample;
      squares += sample * sample;
    }
    const rms = Math.sqrt(Math.max(0, squares / count - (sum / count) ** 2));
    const threshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, this.noiseFloor * 2.5));
    const hasVoiceEnergy = rms >= threshold * (this.hangover > 0 ? 0.6 : 1);
    if (hasVoiceEnergy) {
      this.hangover = HANGOVER_FRAMES;
      for (const frame of this.pending) frame.shouldPass = true;
    } else {
      // Learn only quiet frames; never calibrate from the initial spoken sentence.
      const weight = rms < this.noiseFloor ? 0.2 : 0.05;
      this.noiseFloor += (rms - this.noiseFloor) * weight;
    }
    this.pending.push({ bytes, shouldPass: hasVoiceEnergy || this.hangover > 0 });
    if (!hasVoiceEnergy && this.hangover > 0) this.hangover--;
    if (this.pending.length > PRE_ROLL_FRAMES) {
      const frame = this.pending.shift()!;
      // Keep silence PCM flowing: the server needs it for endpointing and timestamps.
      output.push(frame.shouldPass ? frame.bytes : new Uint8Array(frame.bytes.length));
    }
  }
}

/** Own the input gate independently of capture platform and React render timing. */
export class TrainMicrophone {
  private gate = new MicrophoneNoiseGate();
  private send: ((data: ArrayBuffer) => void) | null = null;
  private isPlaybackBlocked = false;
  private isMuted = false;
  private isActive = true;

  /** Start a fresh call without retaining speech from the previous call. */
  start(send: (data: ArrayBuffer) => void): void {
    this.gate.reset();
    this.send = send;
  }

  /** Mask quiet input only while the user is allowed to send microphone audio. */
  push(data: ArrayBuffer): void {
    if (!this.canSend()) return;
    const output = this.gate.push(data);
    if (output) this.send!(output);
  }

  /** Flush a local end, or discard sound when leaving the screen. */
  stop(shouldFlush = false): void {
    const output = this.canSend() && shouldFlush ? this.gate.flush() : null;
    const send = this.send;
    this.send = null;
    this.gate.reset();
    if (output) send!(output);
  }

  /** Drop lookahead immediately, even when no capture callbacks arrive during AI speech. */
  setPlaybackBlocked(blocked: boolean): void {
    if (this.isPlaybackBlocked !== blocked) this.gate.reset();
    this.isPlaybackBlocked = blocked;
  }

  /** User mute applies locally as well as through the existing server mute message. */
  setMuted(muted: boolean): void {
    if (this.isMuted !== muted) this.gate.reset();
    this.isMuted = muted;
  }

  /** Background transitions cannot retain microphone sound for a later foreground call. */
  setActive(active: boolean): void {
    if (this.isActive !== active) this.gate.reset();
    this.isActive = active;
  }

  /** Read current gates instead of capturing stale state in a recorder callback. */
  private canSend(): boolean {
    return this.send !== null && this.isActive && !this.isPlaybackBlocked && !this.isMuted;
  }
}
