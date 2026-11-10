package expo.modules.wearbiosignal

import org.json.JSONObject

/** 폰 → 워치 명령 본문. 경로와 id 규칙은 [com.bada.biosignal.BioLinkContract]. */
internal object WatchProtocol {
  fun commandPayload(id: String, phoneMs: Long?): ByteArray {
    val json = JSONObject().put("id", id)
    if (phoneMs != null) json.put("phone_ms", phoneMs)
    return json.toString().toByteArray(Charsets.UTF_8)
  }
}
