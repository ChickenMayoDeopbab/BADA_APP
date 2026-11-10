package com.bada.watch

import com.bada.biosignal.BioLinkContract
import org.json.JSONArray
import org.json.JSONObject

/** 폰 명령 해석과 status 본문. 경로와 id 규칙은 폰과 같이 빌드하는 [BioLinkContract]. 필드를 바꾸면 폰 쪽도 같이 바꾼다. */
object BioProtocol {
    fun parseCommand(path: String, data: ByteArray): Command? {
        val json = runCatching { JSONObject(String(data, Charsets.UTF_8)) }.getOrNull() ?: return null
        val id = json.optString("id").takeIf(BioLinkContract::isValidId) ?: return null
        return when (path) {
            BioLinkContract.PATH_START -> Command.Start(id, json.optLong("phone_ms"))
            BioLinkContract.PATH_STOP -> Command.Stop(id)
            BioLinkContract.PATH_CANCEL -> Command.Cancel(id)
            BioLinkContract.PATH_ACK -> Command.Ack(id)
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

    /** Samsung Health Sensor Service가 이 앱을 허용하지 않음(개발자 모드 꺼짐 또는 서명 불일치) */
    const val SDK_POLICY = "sdk_policy"
    const val BACKGROUND_START = "background_start"
    const val SEND_FAILED = "send_failed"
    const val WRITE_FAILED = "write_failed"
}
