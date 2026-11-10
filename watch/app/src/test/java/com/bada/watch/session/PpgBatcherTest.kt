package com.bada.watch.session

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PpgBatcherTest {
    private fun PpgBatcher.feed(startMs: Long, count: Int, firstValue: Int = 0): List<PpgBatcher.Batch> =
        (0 until count).mapNotNull { add(startMs + it * 40L, firstValue + it) }

    @Test
    fun `끊김 없이 이어지면 한 묶음으로 낸다`() {
        val batcher = PpgBatcher()
        assertEquals(emptyList<PpgBatcher.Batch>(), batcher.feed(10_000L, 200))

        val batch = batcher.flush()!!
        assertEquals(10_000L, batch.t0)
        assertEquals(25, batch.hz)
        assertEquals(200, batch.green.size)
        assertEquals(199, batch.green.last())
    }

    @Test
    fun `간격이 벌어지면 새 묶음을 시작한다`() {
        val batcher = PpgBatcher()
        batcher.feed(10_000L, 150) // 6초
        val closed = batcher.feed(20_000L, 150, firstValue = 1_000)

        assertEquals(1, closed.size)
        assertEquals(10_000L, closed[0].t0)
        assertEquals(150, closed[0].green.size)
        assertEquals(20_000L, batcher.flush()!!.t0)
    }

    @Test
    fun `4초 미만 묶음은 버린다`() {
        val batcher = PpgBatcher()
        batcher.feed(10_000L, 99) // 3.96초
        assertEquals(emptyList<PpgBatcher.Batch>(), batcher.feed(20_000L, 1))
        assertNull(batcher.flush())
    }

    @Test
    fun `시각이 거꾸로 가면 묶음을 끊는다`() {
        val batcher = PpgBatcher()
        batcher.feed(10_000L, 100)
        val closed = batcher.add(9_000L, 7)

        assertEquals(100, closed!!.green.size)
    }

    @Test
    fun `긴 묶음은 60초에서 자른다`() {
        val batcher = PpgBatcher()
        val closed = batcher.feed(0L, 1_600)

        assertEquals(1, closed.size)
        assertEquals(1_500, closed[0].green.size)
        assertEquals(60_000L, batcher.flush()!!.t0)
    }

    @Test
    fun `flush 뒤에는 비어 있다`() {
        val batcher = PpgBatcher()
        batcher.feed(0L, 100, firstValue = 5)
        assertArrayEquals((5 until 105).toList().toIntArray(), batcher.flush()!!.green)
        assertNull(batcher.flush())
    }
}
