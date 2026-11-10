package com.bada.watch.session

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AccSummarizerTest {
    @Test
    fun `1초 구간마다 크기 평균과 표준편차를 낸다`() {
        val summarizer = AccSummarizer()
        val rows = mutableListOf<AccSummarizer.Row>()
        // 1_000~1_999 ms: 0.9 g와 1.1 g를 번갈아 25개
        for (i in 0 until 25) summarizer.add(1_000L + i * 40, if (i % 2 == 0) 0.9 else 1.1)?.let(rows::add)
        // 다음 구간 첫 표본이 오면 앞 구간이 닫힌다.
        summarizer.add(2_000L, 1.0)?.let(rows::add)

        assertEquals(1, rows.size)
        assertEquals(1_000L, rows[0].windowStartMs)
        assertEquals(0.996, rows[0].meanG, 0.001)
        assertEquals(0.1, rows[0].sdG, 0.001)
    }

    @Test
    fun `구간 시작은 워치 epoch 초 경계에 맞춘다`() {
        val summarizer = AccSummarizer(minSamples = 1)
        summarizer.add(1_762_299_999_960L, 1.0)
        val row = summarizer.add(1_762_300_000_010L, 1.0)!!

        assertEquals(1_762_299_999_000L, row.windowStartMs)
    }

    @Test
    fun `표본이 적은 구간은 버린다`() {
        val summarizer = AccSummarizer(minSamples = 5)
        repeat(3) { summarizer.add(1_000L + it * 40, 1.0) }

        assertNull(summarizer.add(2_000L, 1.0))
    }

    @Test
    fun `flush는 진행 중 구간을 닫고 다음 구간은 새로 센다`() {
        val summarizer = AccSummarizer(minSamples = 2)
        summarizer.add(1_000L, 1.0)
        summarizer.add(1_040L, 1.0)
        val flushed = summarizer.flush()!!
        summarizer.add(2_000L, 2.0)

        assertEquals(1.0, flushed.meanG, 0.0)
        assertNull(summarizer.flush()) // flush 뒤 남은 표본 1개는 minSamples 미만
    }

    @Test
    fun `시각이 거꾸로 온 표본은 무시한다`() {
        val summarizer = AccSummarizer(minSamples = 1)
        summarizer.add(2_000L, 1.0)
        assertNull(summarizer.add(1_500L, 5.0))

        assertEquals(1.0, summarizer.flush()!!.meanG, 0.0)
    }

    @Test
    fun `벡터 크기를 g로 계산한다`() {
        assertEquals(1.0, AccSummarizer.magnitude(0.6, 0.8, 0.0), 1e-9)
    }
}
