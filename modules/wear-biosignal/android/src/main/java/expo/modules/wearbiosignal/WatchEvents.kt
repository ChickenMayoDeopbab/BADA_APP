package expo.modules.wearbiosignal

/** 수신 서비스(WatchEventService)가 받은 것을 JS 모듈로 넘긴다. JS가 떠 있지 않으면 버린다. */
internal object WatchEvents {
  const val STATUS = "onWatchStatus"
  const val DATA = "onData"
  const val ERROR = "onError"

  private var emitter: ((String, Map<String, Any?>) -> Unit)? = null

  @Synchronized
  fun attach(emit: (String, Map<String, Any?>) -> Unit) {
    emitter = emit
  }

  /** 개발 중 JS 재시작 때 새 모듈이 먼저 붙을 수 있어 자기 것일 때만 뗀다. */
  @Synchronized
  fun detach(emit: (String, Map<String, Any?>) -> Unit) {
    if (emitter === emit) emitter = null
  }

  fun emit(name: String, body: Map<String, Any?>) {
    synchronized(this) { emitter }?.invoke(name, body)
  }

  fun emitError(id: String?, code: String, message: String?) {
    emit(ERROR, mapOf("id" to id, "code" to code, "message" to (message ?: code)))
  }
}
