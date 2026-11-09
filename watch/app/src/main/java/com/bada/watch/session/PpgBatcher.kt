package com.bada.watch.session

/**
 * PPG green 표본을 {t0, hz, green[]} 묶음으로 모은다.
 * 간격이 [hz] 주기의 [gapFactor]배보다 벌어지거나 시각이 거꾸로 가면 새 묶음을 시작하고,
 * [minDurationMs]보다 짧은 묶음은 버린다. 한 묶음은 [maxDurationMs]에서 자른다.
 */
class PpgBatcher(
    val hz: Int = DEFAULT_HZ,
    private val gapFactor: Double = 2.5,
    private val minDurationMs: Long = 4_000L,
    private val maxDurationMs: Long = 60_000L,
) {
    data class Batch(val t0: Long, val hz: Int, val green: IntArray)

    private val periodMs = 1_000.0 / hz
    private val minSamples = (minDurationMs * hz / 1_000).toInt()
    private val maxSamples = (maxDurationMs * hz / 1_000).toInt()

    private var t0 = 0L
    private var lastMs = Long.MIN_VALUE
    private val values = ArrayList<Int>(maxSamples)

    /** 묶음이 끝났으면 돌려준다(버린 묶음은 null). */
    fun add(watchMs: Long, green: Int): Batch? {
        val isGap = values.isNotEmpty() &&
            (watchMs <= lastMs || watchMs - lastMs > periodMs * gapFactor)
        val closed = if (isGap || values.size >= maxSamples) close() else null
        if (values.isEmpty()) t0 = watchMs
        values.add(green)
        lastMs = watchMs
        return closed
    }

    fun flush(): Batch? = close()

    private fun close(): Batch? {
        val batch = if (values.size >= minSamples) Batch(t0, hz, values.toIntArray()) else null
        values.clear()
        return batch
    }

    companion object {
        const val DEFAULT_HZ = 25
    }
}
