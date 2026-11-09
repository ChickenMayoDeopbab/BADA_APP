package expo.modules.wearbiosignal

import org.json.JSONObject

/** 워치 앱(watch/ BioProtocol)과 맞춘 Data Layer 규약. 경로·필드를 바꾸면 워치 쪽도 같이 바꾼다. */
internal object WatchProtocol {
  const val CAPABILITY = "bada_biosignal"
  const val PATH_START = "/bada/bio/start"
  const val PATH_STOP = "/bada/bio/stop"
  const val PATH_CANCEL = "/bada/bio/cancel"
  const val PATH_ACK = "/bada/bio/ack"
  const val PATH_STATUS = "/bada/bio/status"
  private const val DATA_PATH_PREFIX = "/bada/bio/data/"

  /** id는 파일 이름과 채널 경로에 쓰이므로 uuid 형태 문자만 받는다. */
  fun isValidId(id: String) = id.length in 1..64 && id.all { it.isLetterOrDigit() || it == '-' || it == '_' }

  fun commandPayload(id: String, phoneMs: Long?): ByteArray {
    val json = JSONObject().put("id", id)
    if (phoneMs != null) json.put("phone_ms", phoneMs)
    return json.toString().toByteArray(Charsets.UTF_8)
  }

  /** 데이터 채널 경로에서 측정 id를 꺼낸다. */
  fun dataId(path: String): String? =
    path.takeIf { it.startsWith(DATA_PATH_PREFIX) }
      ?.removePrefix(DATA_PATH_PREFIX)
      ?.takeIf(::isValidId)
}
