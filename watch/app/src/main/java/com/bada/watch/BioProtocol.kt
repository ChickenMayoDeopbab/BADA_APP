package com.bada.watch

import org.json.JSONArray
import org.json.JSONObject

/** 폰 앱(modules/wear-biosignal)과 맞춘 Data Layer 규약. 경로·필드를 바꾸면 폰 쪽도 같이 바꾼다. */
object BioProtocol {
    const val PATH_PREFIX = "/bada/bio/"
    const val PATH_START = "/bada/bio/start"
    const val PATH_STOP = "/bada/bio/stop"
    const val PATH_CANCEL = "/bada/bio/cancel"
    const val PATH_ACK = "/bada/bio/ack"
    const val PATH_STATUS = "/bada/bio/status"
    const val DATA_PATH_PREFIX = "/bada/bio/data/"

    fun dataPath(id: String) = DATA_PATH_PREFIX + id

    fun parseCommand(path: String, data: ByteArray): Command? {
        val json = runCatching { JSONObject(String(data, Charsets.UTF_8)) }.getOrNull() ?: return null
        val id = json.optString("id").takeIf { isValidId(it) } ?: return null
        return when (path) {
            PATH_START -> Command.Start(id, json.optLong("phone_ms"))
            PATH_STOP -> Command.Stop(id)
            PATH_CANCEL -> Command.Cancel(id)
            PATH_ACK -> Command.Ack(id)
            else -> null
        }
    }

    /** 폰이 시계 차를 구할 수 있게 워치 송신 시각을 넣는다. 심박 값은 넣지 않는다. */
    fun statusPayload(
        id: String?,
        state: MeasurementState,
        watchMs: Long,
        trackers: List<String>,
        error: String? = null,
    ): ByteArray {
        val json = JSONObject()
            .put("id", id ?: JSONObject.NULL)
            .put("state", state.wire)
            .put("watch_ms", watchMs)
            .put("trackers", JSONArray(trackers))
        if (error != null) json.put("error", error)
        return json.toString().toByteArray(Charsets.UTF_8)
    }

    /** id는 파일 이름과 채널 경로에 쓰이므로 uuid 형태 문자만 받는다. */
    fun isValidId(id: String) = id.length in 1..64 && id.all { it.isLetterOrDigit() || it == '-' || it == '_' }
}

sealed interface Command {
    val id: String

    data class Start(override val id: String, val phoneMs: Long) : Command
    data class Stop(override val id: String) : Command
    data class Cancel(override val id: String) : Command
    data class Ack(override val id: String) : Command
}

enum class MeasurementState(val wire: String) {
    IDLE("idle"),
    MEASURING("measuring"),
    SENDING("sending"),

    /** 파일을 보냈고 폰의 ack를 기다린다. ack 전까지 파일을 지우지 않는다. */
    SENT("sent"),
    ERROR("error"),
}

/** 측정 오류 사유. status 메시지의 error 필드 값. */
object MeasurementError {
    const val PERMISSION = "permission"
    const val NO_SENSOR = "no_sensor"
    const val BACKGROUND_START = "background_start"
    const val SEND_FAILED = "send_failed"
    const val WRITE_FAILED = "write_failed"
}
