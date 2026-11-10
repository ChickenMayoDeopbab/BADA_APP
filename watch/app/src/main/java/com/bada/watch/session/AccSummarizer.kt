package com.bada.watch.session

import kotlin.math.sqrt

/**
 * 25 Hz 가속도 크기를 1초 구간(워치 epoch 초 경계)마다 [구간 시작 ms, 평균 g, 표준편차 g]로 줄인다.
 * 표본이 [minSamples]보다 적은 구간은 버린다.
 */
class AccSummarizer(private val minSamples: Int = DEFAULT_MIN_SAMPLES) {
    data class Row(val windowStartMs: Long, val meanG: Double, val sdG: Double)

    private var windowStartMs = Long.MIN_VALUE
    private var count = 0
    private var sum = 0.0
    private var sumSquares = 0.0

    /** 앞 구간이 끝났으면 그 요약 행을 돌려준다. */
    fun add(watchMs: Long, magnitudeG: Double): Row? {
        val windowStart = Math.floorDiv(watchMs, WINDOW_MS) * WINDOW_MS
        if (windowStart < windowStartMs) return null // 시각이 거꾸로 온 표본은 버린다
        val closed = if (windowStart != windowStartMs) close().also { windowStartMs = windowStart } else null
        count++
        sum += magnitudeG
        sumSquares += magnitudeG * magnitudeG
        return closed
    }

    /** 진행 중인 구간을 닫는다. */
    fun flush(): Row? = close()

    private fun close(): Row? {
        val row = if (count >= minSamples) {
            val mean = sum / count
            val variance = (sumSquares / count - mean * mean).coerceAtLeast(0.0)
            Row(windowStartMs, round(mean), round(sqrt(variance)))
        } else {
            null
        }
        count = 0
        sum = 0.0
        sumSquares = 0.0
        return row
    }

    private fun round(value: Double) = Math.round(value * 10_000) / 10_000.0

    companion object {
        const val WINDOW_MS = 1_000L
        const val DEFAULT_MIN_SAMPLES = 5

        fun magnitude(xG: Double, yG: Double, zG: Double) = sqrt(xG * xG + yG * yG + zG * zG)
    }
}
