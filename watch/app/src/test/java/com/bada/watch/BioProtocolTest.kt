package com.bada.watch

import com.bada.biosignal.BioLinkContract
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class BioProtocolTest {
    private fun bytes(json: String) = json.toByteArray(Charsets.UTF_8)

    @Test
    fun `명령 경로별로 해석한다`() {
        assertEquals(
            Command.Start("abc-1", 1_762_300_000_000L),
            BioProtocol.parseCommand(BioLinkContract.PATH_START, bytes("""{"id":"abc-1","phone_ms":1762300000000}""")),
        )
        assertEquals(Command.Stop("abc-1"), BioProtocol.parseCommand(BioLinkContract.PATH_STOP, bytes("""{"id":"abc-1"}""")))
        assertEquals(Command.Cancel("abc-1"), BioProtocol.parseCommand(BioLinkContract.PATH_CANCEL, bytes("""{"id":"abc-1"}""")))
        assertEquals(Command.Ack("abc-1"), BioProtocol.parseCommand(BioLinkContract.PATH_ACK, bytes("""{"id":"abc-1"}""")))
    }

    @Test
    fun `잘못된 명령은 버린다`() {
        assertNull(BioProtocol.parseCommand(BioLinkContract.PATH_START, bytes("not json")))
        assertNull(BioProtocol.parseCommand(BioLinkContract.PATH_STOP, bytes("""{"id":""}""")))
        // id는 파일 이름에 쓰이므로 경로 문자를 막는다.
        assertNull(BioProtocol.parseCommand(BioLinkContract.PATH_STOP, bytes("""{"id":"../x"}""")))
        assertNull(BioProtocol.parseCommand(BioLinkContract.PATH_STATUS, bytes("""{"id":"abc"}""")))
    }

    @Test
    fun `status에는 워치 송신 시각을 넣고 심박 값은 넣지 않는다`() {
        val json = JSONObject(
            String(BioProtocol.statusPayload("abc", MeasurementState.MEASURING, 123L, listOf("hr", "acc")), Charsets.UTF_8),
        )

        assertEquals(setOf("id", "state", "watch_ms", "trackers"), json.keys().asSequence().toSet())
        assertEquals("measuring", json.getString("state"))
        assertEquals(123L, json.getLong("watch_ms"))
        assertEquals("""["hr","acc"]""", json.getJSONArray("trackers").toString())
    }

    @Test
    fun `오류 status에는 사유를 넣는다`() {
        val json = JSONObject(
            String(BioProtocol.statusPayload("abc", MeasurementState.ERROR, 1L, emptyList(), MeasurementError.PERMISSION), Charsets.UTF_8),
        )

        assertEquals("permission", json.getString("error"))
        assertFalse(json.isNull("id"))
    }

    @Test
    fun `데이터 채널 경로와 id를 오간다`() {
        assertEquals("/bada/bio/data/abc", BioLinkContract.dataPath("abc"))
        assertEquals("abc", BioLinkContract.dataId("/bada/bio/data/abc"))
        assertNull(BioLinkContract.dataId("/bada/bio/data/../abc"))
        assertNull(BioLinkContract.dataId("/bada/bio/status"))
    }
}
