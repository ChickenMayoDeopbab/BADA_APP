import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import type { AudioContext as NativeContext, AudioBufferQueueSourceNode } from "react-native-audio-api";
import { TrainPlayback, TRAIN_SAMPLE_RATE, type PlaybackStats } from "@/utils/trainPlayback";

export interface TrainPlaybackOptions {
  onPlaybackBlocked?: (blocked: boolean) => void;
  onPlaybackStats?: (stats: PlaybackStats & { platform: string; os: string; route: string }) => void;
  onPlaybackError?: (error: unknown) => void;
}

/** One output graph per call; no WAV encoding, filesystem IO or per-chunk player. */
export function useTrainPlayback(options: TrainPlaybackOptions) {
  const callbacks = useRef(options);
  callbacks.current = options;
  const muted = useRef(false);
  const active = useRef(AppState.currentState === "active");
  const discardTurn = useRef(false);
  const native = useRef<NativeContext | null>(null);
  const queue = useRef<AudioBufferQueueSourceNode | null>(null);
  const queueStarted = useRef(false);
  const completions = useRef(new Map<string, () => void>());
  const web = useRef<AudioContext | null>(null);
  const webSources = useRef(new Set<AudioBufferSourceNode>());
  const nextTime = useRef(0);
  const operations = useRef(Promise.resolve());
  const controller = useRef<TrainPlayback | null>(null);

  // Serialize suspend/resume: a delayed idle operation must not suspend a new turn.
  const setRunning = (running: boolean) => {
    const context = Platform.OS === "web" ? web.current : native.current;
    if (!context) return;
    operations.current = operations.current.then(async () => {
      if (context !== (Platform.OS === "web" ? web.current : native.current)) return;
      const result = await (running ? context.resume() : context.suspend());
      if (result === false) throw new Error("Audio context state change failed");
    }).catch((error) => {
      if (context === (Platform.OS === "web" ? web.current : native.current)) controller.current?.fail(error);
    });
  };

  const prepareWeb = () => {
    if (!web.current || web.current.state === "closed") {
      const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      web.current = new Constructor({ sampleRate: TRAIN_SAMPLE_RATE });
    }
    return web.current;
  };

  if (!controller.current) {
    controller.current = new TrainPlayback({
      onBlocked: (blocked) => {
        muted.current = blocked;
        callbacks.current.onPlaybackBlocked?.(blocked);
      },
      onStats: (stats) => callbacks.current.onPlaybackStats?.({
        ...stats, platform: Platform.OS, os: String(Platform.Version), route: "unknown",
      }),
      onError: (error) => {
        console.warn("[Audio] PCM 재생 실패", error);
        callbacks.current.onPlaybackError?.(error);
      },
      driver: {
        enqueue: (samples, onEnded) => {
          if (Platform.OS === "web") {
            const ctx = prepareWeb();
            if (webSources.current.size === 0) setRunning(true);
            const buffer = ctx.createBuffer(1, samples.length, TRAIN_SAMPLE_RATE);
            buffer.getChannelData(0).set(samples);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            webSources.current.add(source);
            source.onended = () => {
              if (!webSources.current.delete(source)) return;
              source.disconnect();
              onEnded();
            };
            const start = Math.max(ctx.currentTime, nextTime.current);
            nextTime.current = start + buffer.duration;
            source.start(start);
            return;
          }
          if (!native.current) {
            // Lazy import keeps web and the incoming-call screen free of native initialization.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { AudioContext, AudioManager } = require("react-native-audio-api") as typeof import("react-native-audio-api");
            if (Platform.OS === "ios") {
              AudioManager.setAudioSessionOptions({
                iosCategory: "playAndRecord", iosMode: "voiceChat",
                iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
              });
            }
            native.current = new AudioContext({ sampleRate: TRAIN_SAMPLE_RATE });
            const source = native.current.createBufferQueueSource();
            source.connect(native.current.destination);
            source.onBufferEnded = ({ bufferId }) => {
              if (queue.current !== source) return;
              // A queued old "last buffer" event must not finish a newer buffer/turn.
              const callback = completions.current.get(bufferId);
              completions.current.delete(bufferId);
              callback?.();
            };
            queue.current = source;
          }
          const ctx = native.current;
          if (completions.current.size === 0) setRunning(true);
          const buffer = ctx.createBuffer(1, samples.length, TRAIN_SAMPLE_RATE);
          buffer.getChannelData(0).set(samples);
          const id = queue.current!.enqueueBuffer(buffer);
          completions.current.set(id, onEnded);
          if (!queueStarted.current) {
            queue.current!.start(0, 0);
            queueStarted.current = true;
          }
        },
        clear: () => {
          completions.current.clear();
          const source = queue.current;
          queue.current = null;
          queueStarted.current = false;
          if (source) {
            source.onBufferEnded = null;
            source.stop();
            source.disconnect();
          }
          const ctx = native.current;
          native.current = null;
          if (ctx) void ctx.close().catch(() => {});
          for (const source of webSources.current) {
            source.onended = null;
            source.stop();
            source.disconnect();
          }
          webSources.current.clear();
          nextTime.current = 0;
        },
        idle: () => setRunning(false),
      },
    });
  }

  const beginPlayback = useCallback(() => {
    if (active.current) {
      discardTurn.current = false;
      controller.current!.begin();
    }
  }, []);
  const streamPcmChunk = useCallback((data: ArrayBuffer) => {
    if (active.current && !discardTurn.current) controller.current!.push(data);
  }, []);
  const flushPlayback = useCallback(() => {
    discardTurn.current = false;
    controller.current!.end();
  }, []);
  const resetStream = useCallback((reason = "interrupt") => controller.current!.reset(reason), []);
  const preparePlayback = useCallback(() => {
    if (Platform.OS === "web") {
      const ctx = prepareWeb();
      void ctx.resume().catch((error) => controller.current?.fail(error));
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
      if (!active.current) {
        discardTurn.current = true;
        controller.current!.reset("background");
      }
    });
    return () => {
      subscription.remove();
      controller.current!.dispose();
      const ctx = web.current;
      web.current = null;
      if (ctx) void ctx.close().catch(() => {});
    };
  }, []);

  return { muted, beginPlayback, streamPcmChunk, flushPlayback, resetStream, preparePlayback };
}
