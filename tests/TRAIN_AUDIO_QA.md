# Train PCM playback

The training screen uses one `react-native-audio-api` output context and buffer queue per call, reusing it between normal turns and recreating it after an explicit reset. Web uses scheduled AudioBufferSourceNodes. Initial PCM buffering is 250 ms; `speaking_end` flushes even a shorter response. The threshold is buffered audio duration, not a promise of 250 ms end-to-end latency. No WAV files, base64 output encoding, decoders, or per-chunk players remain in the playback path. Idle output is suspended after the tail guard; microphone capture keeps its existing recorder.

The audio lifecycle owns the microphone transmission gate. It remains blocked during prebuffering, queue starvation, playback, and a 300 ms speaker tail. New turns cancel the old tail timer. Emotion metadata does not clear output. Explicit interrupts clear output; background transitions discard the rest of the in-progress turn. A 60-second outstanding PCM limit and playback-duration-plus-15-second watchdog surface failures rather than silently accumulating memory or leaving the microphone blocked forever.

AEC is initialized with recording. Android effects are reused for the recording session, without the previous delayed release/recreate or per-playback reassert. iOS only changes category/mode when necessary. VoiceChat mode alone does not guarantee full AEC with AudioQueue input; microphone gating is the primary protection in this existing half-duplex flow. Full user barge-in would require a separate full-duplex capture/output design with a voice-processing engine and device validation.

References: [Apple VoiceChat](https://developer.apple.com/documentation/avfaudio/avaudiosession/mode-swift.struct/voicechat), [Android AcousticEchoCanceler](https://developer.android.com/reference/android/media/audiofx/AcousticEchoCanceler), [buffer queue API](https://docs.swmansion.com/react-native-audio-api/docs/sources/audio-buffer-queue-source-node/).

The pinned audio-api 0.12.0 package has a C++ return-type mismatch in its Android FFmpeg-disabled error branch. `patches/react-native-audio-api+0.12.0.patch` fixes that single return type; retain the patch until a dependency upgrade includes the upstream fix.

## Telemetry

`playback_stats` is emitted once per finalized turn, before socket shutdown for a local end-call. Turn IDs start at zero for the mounted call. Normal `played_ms` counts frames whose completion events arrived. On reset/error, `played_ms` is omitted: a partially played buffer cannot be measured precisely. `completed_played_ms` is a conservative lower bound, and `dropped_chunks` counts original input chunks not known to be fully played, including an interrupted partial buffer. `invalid_bytes` records an unmatched trailing byte at normal turn end. The current route is reported as `unknown`.

The client advertises `playback_capabilities.completion_ack` when the WebSocket opens. The server's `speaking_end.turn_id` is stored separately from `playback_stats.turn`; `playback_done` echoes that server ID only after every queued buffer for the turn has completed. Interrupt, call-end, background, dispose, and playback-error resets never emit a completion acknowledgement.

`first_play_ms`, `gaps80`, `max_gap_ms` and `total_gap_ms` are deliberately omitted; JS/native completion callbacks do not provide acoustic output timestamps. The server must accept missing fields as specified in the provided protocol. Native render timestamps would be needed for accurate gap telemetry. Disconnected sockets skip telemetry without retrying it into another session.

## Verification

- `npm run test:audio`: deterministic lifecycle, PCM alignment, interruption, tail, overlap, failure and backlog tests.
- `npx tsc --noEmit`
- `npx eslint hooks/useAudio.ts hooks/useTrainPlayback.ts hooks/useTrainWebSocket.ts utils/trainPlayback.ts app/train.tsx`
- `npx patch-package --error-on-fail`
- `npx expo prebuild --no-install` then rebuild native apps. A Metro reload alone cannot add the new native dependency. FFmpeg and background-service support are disabled in the Expo plugin.

Device acceptance still requires a live call on iOS and Android: short and long replies, 5-minute speaker call, wired/Bluetooth route changes, interrupt during playback, background/foreground, repeated calls, and lost socket. Confirm no clipped tails, no AI echo sent back, microphone return after the tail, one statistics message per turn, and one `playback_done` only for fully played turns. Compare CPU/memory and audible gaps against the original branch; no measured performance percentage is claimed by this change.

## Frontend microphone noise gate (#196)

`utils/trainMicrophone.ts` runs on the existing 16 kHz mono PCM16 input on iOS, Android and web. This adds no native module, model download, server endpoint, or server configuration. It is an **energy-based noise gate**, not Silero, a learned speech detector, background speaker separation, or full-duplex echo cancellation. Existing Android optional audio effects and the iOS VoiceChat route are retained. Web requests `noiseSuppression`, `echoCancellation`, and `autoGainControl` as preferences; actual support is browser/device dependent ([media constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)).

Input is classified in 20 ms frames using DC-corrected RMS. The opening threshold is at least 0.003 of full scale (about -50.5 dBFS), follows quiet-frame RMS by a factor of 2.5, and is capped at 0.012 (about -38.4 dBFS). An open gate uses a 60% threshold and a 400 ms hangover. There is no startup calibration period that discards the first sentence. A fixed 100 ms lookahead retains a quiet word onset before a louder vowel. This delay is in addition to capture, network and server latency. Web capture buffers were reduced from 256 ms to 20 ms to avoid stacking the old capture delay on top of lookahead.

Frames classified as quiet become equal-length zero PCM. They are **still sent**, so server silence detection receives silence and recording timestamps keep the existing duration. Speech samples are passed byte-for-byte; the gate does not normalize, filter or compress them. Ordinary capture callback boundaries, including split PCM samples, are reconstructed. Local call end flushes the gate's remaining complete samples **before** sending `end`; a partial buffer still inside the native recorder/worklet is not available to JS. This does not guarantee a server transcription final will arrive before server shutdown.

AI playback/tail, user mute, background, disconnect, screen cleanup and a new call discard pending microphone sound. User mute also applies locally before sending the existing server mute message. Capture starts/stops are serialized and stale async web permission/worklet completion cannot restart an ended call. Microphone startup failures now show an error and end the call instead of leaving a silently nonfunctional call screen. Unexpected web capture sample rates fail explicitly instead of sending PCM with incorrect timing.

### Automated checks

`npm run test:audio` runs the real gate, capture hook with mocked hardware, AudioWorklet conversion, and playback lifecycle tests. Cases include quiet noise, DC offset, a 20 ms utterance, quiet speech, clipping, arbitrary/odd chunk boundaries, exact sample duration, long silence with bounded lookahead, local-end ordering, mute/playback/background transitions, repeated calls, permission/load cancellation, driver errors and sample-rate mismatch. These tests do not measure real STT accuracy or physical microphone suppression.

### Exhibition device acceptance (pending)

On each actual demo iPhone/Android phone, test the current app build with the intended microphone/earbuds:

- In quiet and with fan/crowd noise, say “네”, “아니요”, and a full reservation sentence at a normal and soft speaking volume. Check both the server transcript and recorded audio for word onset/ending loss.
- Repeat with a nearby person talking. Loud nearby speech may pass this gate; use a close headset microphone for the demo if needed. No speaker-isolation claim is made.
- Wait silently after a sentence and confirm the server replies; confirm pauses and report timestamps remain plausible.
- Mute while speaking, unmute, play an AI response, switch apps, reconnect the socket, end immediately after a word, and repeat calls. Check for stale audio or capture continuing after end.
- Compare CPU, battery, microphone route and recognition quality against the previous app on the same phone. Thresholds are conservative defaults and have not been calibrated at EXCO.

A simulator cannot establish these live-call acceptance results. No server deployment or new native dependency is required by this change.
