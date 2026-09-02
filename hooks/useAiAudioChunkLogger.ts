import { useCallback, useRef } from "react";

/**
 * ⚠️ A1(연속 버퍼 재생 개편) 착수 전 실측을 위한 임시 훅. 개편 완료 후 삭제할 것.
 * docs/통화오디오끊김앱팀공유.md 1절이 요청한 "청크 크기와 도착 간격" 측정에 해당한다.
 */

/** 16kHz · mono · 16bit PCM의 초당 바이트 수 (실시간 대비 도착 속도의 기준값) */
const BYTES_PER_SECOND = 16000 * 1 * 2;

/** 청크 하나의 도착 기록 */
interface AudioChunkRecord {
  byteLength: number; // 청크 크기(byte)
  gapMs: number; // 직전 청크가 도착한 뒤 흐른 시간
}

export interface UseAiAudioChunkLoggerReturn {
  /** emotion 수신 = AI 턴 시작 */
  handleTurnStart: () => void;
  /** AI 음성 PCM 청크 수신 */
  handleAudioChunk: (data: ArrayBuffer) => void;
  /** speaking_end 수신 = 서버 송출 종료 */
  handleTurnEnd: () => void;
}

/** PCM 바이트 수를 재생 길이(ms)로 환산 */
function toPlaybackMs(byteLength: number): number {
  return (byteLength / BYTES_PER_SECOND) * 1000;
}

/**
 * AI 음성 청크의 크기와 도착 간격을 턴 단위로 집계해 로그로 남기는 진단 훅.
 * 청크마다 출력하면 로그 비용이 도착 간격 자체를 왜곡하므로,
 * 기록은 메모리에 모아두고 턴이 끝날 때 한 번에 출력한다.
 */
export function useAiAudioChunkLogger(): UseAiAudioChunkLoggerReturn {
  const turnIndexRef = useRef(0); // 통화 내 AI 턴 순번
  const chunksRef = useRef<AudioChunkRecord[]>([]);
  const turnStartedAtRef = useRef<number | null>(null); // emotion 수신 시각
  const firstChunkAtRef = useRef<number | null>(null);
  const lastChunkAtRef = useRef<number | null>(null);

  /** 모아둔 턴 기록을 요약해 출력하고 버퍼를 비운다 */
  const printTurn = useCallback((endedAt: number | null) => {
    const chunks = chunksRef.current;
    const turnIndex = turnIndexRef.current;
    const turnStartedAt = turnStartedAtRef.current;
    const firstChunkAt = firstChunkAtRef.current;
    const lastChunkAt = lastChunkAtRef.current;

    chunksRef.current = [];
    turnStartedAtRef.current = null;
    firstChunkAtRef.current = null;
    lastChunkAtRef.current = null;

    if (turnStartedAt === null && chunks.length === 0) return;

    if (chunks.length === 0 || firstChunkAt === null || lastChunkAt === null) {
      console.log(`[AudioProbe] turn#${turnIndex} 수신한 청크 없음`);
      return;
    }

    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const audioMs = toPlaybackMs(totalBytes); // 받은 PCM의 실제 재생 길이
    const wallMs = lastChunkAt - firstChunkAt; // 첫 청크부터 마지막 청크까지 걸린 시간
    /** 1보다 크면 실시간보다 빠르게 몰아서 도착한다는 뜻 (청크가 하나뿐이면 계산 불가) */
    const ratio = wallMs > 0 ? `${(audioMs / wallMs).toFixed(2)}x` : "-";
    const avgBytes = Math.round(totalBytes / chunks.length);
    const gaps = chunks.map((chunk) => chunk.gapMs);
    const maxGapMs = Math.max(...gaps);
    /** 직전 청크의 재생 길이보다 도착 간격이 길면 그 지점에서 재생이 실시간을 못 따라간다 */
    const underrunCount = chunks.filter(
      (chunk, index) =>
        index > 0 && chunk.gapMs > toPlaybackMs(chunks[index - 1].byteLength),
    ).length;
    const firstChunkDelayMs =
      turnStartedAt === null ? 0 : firstChunkAt - turnStartedAt;
    const tailMs = endedAt === null ? 0 : endedAt - lastChunkAt;

    console.log(
      `[AudioProbe] turn#${turnIndex} chunks=${chunks.length} ` +
        `avg=${avgBytes}B(${toPlaybackMs(avgBytes).toFixed(0)}ms) ` +
        `audio=${(audioMs / 1000).toFixed(2)}s wall=${(wallMs / 1000).toFixed(2)}s ` +
        `ratio=${ratio} firstChunk=+${firstChunkDelayMs}ms ` +
        `tail=${tailMs}ms maxGap=${maxGapMs}ms underrun=${underrunCount}`,
    );
    console.log(`[AudioProbe] turn#${turnIndex} gaps=[${gaps.join(",")}]`);
  }, []);

  const handleTurnStart = useCallback(() => {
    // speaking_end 없이 다음 턴이 시작되는 경우가 있어 직전 턴을 여기서도 마감한다
    printTurn(null);
    turnIndexRef.current += 1;
    turnStartedAtRef.current = Date.now();
  }, [printTurn]);

  const handleAudioChunk = useCallback((data: ArrayBuffer) => {
    const now = Date.now();
    const lastChunkAt = lastChunkAtRef.current;

    if (firstChunkAtRef.current === null) firstChunkAtRef.current = now;
    lastChunkAtRef.current = now;
    chunksRef.current.push({
      byteLength: data.byteLength,
      gapMs: lastChunkAt === null ? 0 : now - lastChunkAt,
    });
  }, []);

  const handleTurnEnd = useCallback(() => {
    printTurn(Date.now());
  }, [printTurn]);

  return { handleTurnStart, handleAudioChunk, handleTurnEnd };
}
