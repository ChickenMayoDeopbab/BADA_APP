package com.bada.biosignal

/**
 * 폰 앱(modules/wear-biosignal)과 워치 앱(watch/)이 같이 빌드하는 Data Layer 규약.
 * 두 앱이 이 파일 하나를 쓰므로 경로와 id 규칙이 어긋나지 않는다.
 * 매니페스트 intent-filter 경로와 워치 res/values/wear.xml의 capability는 XML이라 따로 맞춘다.
 */
object BioLinkContract {
  const val CAPABILITY = "bada_biosignal"
  const val PATH_START = "/bada/bio/start"
  const val PATH_STOP = "/bada/bio/stop"
  const val PATH_CANCEL = "/bada/bio/cancel"
  const val PATH_ACK = "/bada/bio/ack"
  const val PATH_STATUS = "/bada/bio/status"
  const val DATA_PATH_PREFIX = "/bada/bio/data/"

  /** id는 파일 이름과 채널 경로에 쓰이므로 uuid 형태 문자만 받는다. */
  fun isValidId(id: String) = id.length in 1..64 && id.all { it.isLetterOrDigit() || it == '-' || it == '_' }

  fun dataPath(id: String) = DATA_PATH_PREFIX + id

  /** 데이터 채널 경로에서 측정 id를 꺼낸다. */
  fun dataId(path: String): String? =
    path.takeIf { it.startsWith(DATA_PATH_PREFIX) }
      ?.removePrefix(DATA_PATH_PREFIX)
      ?.takeIf(::isValidId)
}
