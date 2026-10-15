class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 20 ms at 16 kHz; avoid adding the old 256 ms capture delay to input lookahead.
    this._buffer = new Float32Array(320);
    this._bufferIndex = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._bufferIndex++] = channel[i];
      if (this._bufferIndex >= this._buffer.length) {
        const int16 = new Int16Array(this._buffer.length);
        for (let j = 0; j < this._buffer.length; j++) {
          const sample = Math.max(-1, Math.min(1, this._buffer[j]));
          int16[j] = Math.round(sample * (sample < 0 ? 32768 : 32767));
        }
        this.port.postMessage(int16.buffer, [int16.buffer]);
        this._bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
