class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(4096);
    this._bufferIndex = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._bufferIndex++] = channel[i];
      if (this._bufferIndex >= 4096) {
        const int16 = new Int16Array(4096);
        for (let j = 0; j < 4096; j++) {
          int16[j] = Math.max(-32768, Math.min(32767, Math.round(this._buffer[j] * 32767)));
        }
        this.port.postMessage(int16.buffer, [int16.buffer]);
        this._bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
