package com.bada.watch.session

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class SessionRecorderTest {
    @Test
    fun `업로드 본문 형식으로 세션 파일을 만든다`() {
        val recorder = SessionRecorder()
        recorder.onHeartRate(1_000L, 72, 1, listOf(820, 830), listOf(0, 0))
        recorder.onEda(1_000L, 2.5, 0)
        recorder.onSkinTemperature(1_000L, 33.1, 0)
        for (i in 0 until 125) {
            recorder.onAccelerometer(1_000L + i * 40, 0.0, 0.0, 1.0)
            recorder.onPpgGreen(1_000L + i * 40, 51_000 + i)
        }
        recorder.finish()

        val json = JSONObject(recorder.toJson("m-1", 9_000L, "SM-R960", "1.4.1"))

        assertEquals("m-1", json.getString("id"))
        assertEquals(9_000L, json.getLong("watch_sent_ms"))
        assertEquals("SM-R960", json.getJSONObject("device").getString("model"))
        assertEquals("1.4.1", json.getJSONObject("device").getString("sdk"))
        assertEquals("[[1000,72,1]]", json.getJSONArray("hr").toString())
        // 심박 포인트 하나의 IBI를 한 줄씩 펼치고, 앞 박동은 뒤 간격(830)만큼 당긴다.
        assertEquals("[[170,820,0],[1000,830,0]]", json.getJSONArray("ibi").toString())
        assertEquals("[[1000,2.5,0]]", json.getJSONArray("eda").toString())
        assertEquals("[[1000,33.1,0]]", json.getJSONArray("skin_temp").toString())
        assertEquals(5, json.getJSONArray("acc").length())
        assertEquals("[1000,1,0]", json.getJSONArray("acc").getJSONArray(0).toString())
        val ppg = json.getJSONArray("ppg").getJSONObject(0)
        assertEquals(1_000L, ppg.getLong("t0"))
        assertEquals(25, ppg.getInt("hz"))
        assertEquals(125, ppg.getJSONArray("green").length())
    }

    @Test
    fun `심박 값 외 필드는 넣지 않는다`() {
        val json = JSONObject(SessionRecorder().toJson("m-1", 0L, "model", "sdk"))

        assertEquals(
            setOf("id", "watch_sent_ms", "device", "hr", "ibi", "eda", "skin_temp", "acc", "ppg"),
            json.keys().asSequence().toSet(),
        )
    }

    @Test
    fun `상한을 넘는 행은 버린다`() {
        val recorder = SessionRecorder(SessionRecorder.Limits(rows = 2, ibiRows = 3, ppgSamples = 100))
        repeat(5) { recorder.onHeartRate(it * 1_000L, 70, 1, listOf(800, 800), listOf(0, 0)) }
        repeat(250) { recorder.onPpgGreen(it * 40L, it) }
        recorder.finish()

        val json = JSONObject(recorder.toJson("m-1", 0L, "model", "sdk"))
        assertEquals(2, json.getJSONArray("hr").length())
        assertEquals(3, json.getJSONArray("ibi").length())
        assertFalse(json.getJSONArray("ppg").length() > 0) // 250개 묶음은 상한 100을 넘어 버림
    }
}
