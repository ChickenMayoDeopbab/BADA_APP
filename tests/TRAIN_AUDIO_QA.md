# Train PCM playback

The training screen uses one `react-native-audio-api` output context and buffer queue per call, reusing it between normal turns and recreating it after an explicit reset. Web uses scheduled AudioBufferSourceNodes. Initial PCM buffering is 250 ms; `speaking_end` flushes even a shorter response. The threshold is buffered audio duration, not a promise of 250 ms end-to-end latency. No WAV files, base64 output encoding, decoders, or per-chunk players remain in the playback path. Idle output is suspended after the tail guard; microphone capture keeps its existing recorder.

The audio lifecycle owns the microphone transmission gate. It remains blocked during prebuffering, queue starvation, playback, and a 300 ms speaker tail. New turns cancel the old tail timer. Emotion metadata does not clear output. Explicit interrupts clear output; background transitions discard the rest of the in-progress turn. A 60-second outstanding PCM limit and playback-duration-plus-15-second watchdog surface failures rather than silently accumulating memory or leaving the microphone blocked forever.

AEC is initialized with recording. Android effects are reused for the recording session, without the previous delayed release/recreate or per-playback reassert. iOS only changes category/mode when necessary. VoiceChat mode alone does not guarantee full AEC with AudioQueue input; microphone gating is the primary protection in this existing half-duplex flow. Full user barge-in would require a separate full-duplex capture/output design with a voice-processing engine and device validation.

References: [Apple VoiceChat](https://developer.apple.com/documentation/avfaudio/avaudiosession/mode-swift.struct/voicechat), [Android AcousticEchoCanceler](https://developer.android.com/reference/android/media/audiofx/AcousticEchoCanceler), [buffer queue API](https://docs.swmansion.com/react-native-audio-api/docs/sources/audio-buffer-queue-source-node/).

The pinned audio-api 0.12.0 package has a C++ return-type mismatch in its Android FFmpeg-disabled error branch. `patches/react-native-audio-api+0.12.0.patch` fixes that single return type; retain the patch until a dependency upgrade includes the upstream fix.

## Telemetry

`playback_stats` is emitted once per finalized turn, before socket shutdown for a local end-call. Turn IDs start at zero for the mounted call. Normal `played_ms` counts frames whose completion events arrived. On reset/error, `played_ms` is omitted: a partially played buffer cannot be measured precisely. `completed_played_ms` is a conservative lower bound, and `dropped_chunks` counts original input chunks not known to be fully played, including an interrupted partial buffer. `invalid_bytes` records an unmatched trailing byte at normal turn end. The current route is reported as `unknown`.

`first_play_ms`, `gaps80`, `max_gap_ms` and `total_gap_ms` are deliberately omitted; JS/native completion callbacks do not provide acoustic output timestamps. The server must accept missing fields as specified in the provided protocol. Native render timestamps would be needed for accurate gap telemetry. Disconnected sockets skip telemetry without retrying it into another session.

## Verification

- `npm run test:audio`: deterministic lifecycle, PCM alignment, interruption, tail, overlap, failure and backlog tests.
- `npx tsc --noEmit`
- `npx eslint hooks/useAudio.ts hooks/useTrainPlayback.ts hooks/useTrainWebSocket.ts utils/trainPlayback.ts app/train.tsx`
- `npx patch-package --error-on-fail`
- `npx expo prebuild --no-install` then rebuild native apps. A Metro reload alone cannot add the new native dependency. FFmpeg and background-service support are disabled in the Expo plugin.

Device acceptance still requires a live call on iOS and Android: short and long replies, 5-minute speaker call, wired/Bluetooth route changes, interrupt during playback, background/foreground, repeated calls, and lost socket. Confirm no clipped tails, no AI echo sent back, microphone return after the tail, and one statistics message per turn. Compare CPU/memory and audible gaps against the original branch; no measured performance percentage is claimed by this change.
