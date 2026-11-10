package expo.modules.wearbiosignal

import android.content.Context
import com.bada.biosignal.BioLinkContract
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** 폰 → 워치 측정 명령과 워치 → 폰 이벤트(status·세션 파일)를 JS에 잇는다. */
class WearBiosignalModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val emit: (String, Map<String, Any?>) -> Unit = { name, body -> sendEvent(name, body) }

  override fun definition() = ModuleDefinition {
    Name("WearBiosignal")

    Events(WatchEvents.STATUS, WatchEvents.DATA, WatchEvents.ERROR)

    OnCreate {
      WatchEvents.attach(emit)
      // 앱이 ack하지 못하고 남은 세션 파일을 정리한다.
      appContext.reactContext?.filesDir?.let { filesDir ->
        Thread { ReceivedFiles(filesDir).deleteExpired() }.start()
      }
    }

    OnDestroy { WatchEvents.detach(emit) }

    AsyncFunction("getWatchStatus") { promise: Promise ->
      // 폰에 Wear OS 앱이 없으면 API 자체가 없으므로 연결 안 됨으로 본다.
      findWatch(
        onResult = { node -> promise.resolve(watchStatus(node)) },
        onFailure = { promise.resolve(watchStatus(null)) },
      )
    }

    AsyncFunction("start") { id: String, phoneMs: Double, promise: Promise ->
      send(BioLinkContract.PATH_START, id, phoneMs.toLong(), promise)
    }

    AsyncFunction("stop") { id: String, promise: Promise ->
      send(BioLinkContract.PATH_STOP, id, null, promise)
    }

    AsyncFunction("cancel") { id: String, promise: Promise ->
      send(BioLinkContract.PATH_CANCEL, id, null, promise)
    }

    AsyncFunction("ack") { id: String, promise: Promise ->
      send(BioLinkContract.PATH_ACK, id, null, promise)
    }
  }

  private fun watchStatus(node: Node?) = mapOf(
    "isConnected" to (node != null),
    "nodeId" to node?.id,
    "displayName" to node?.displayName,
  )

  /** 측정 앱이 깔린, 지금 닿는 워치. 여러 대면 블루투스로 바로 붙은 쪽을 고른다. */
  private fun findWatch(onResult: (Node?) -> Unit, onFailure: (Exception) -> Unit) {
    Wearable.getCapabilityClient(context)
      .getCapability(BioLinkContract.CAPABILITY, CapabilityClient.FILTER_REACHABLE)
      .addOnSuccessListener { info -> onResult(info.nodes.maxByOrNull { if (it.isNearby) 1 else 0 }) }
      .addOnFailureListener(onFailure)
  }

  private fun send(path: String, id: String, phoneMs: Long?, promise: Promise) {
    if (!BioLinkContract.isValidId(id)) {
      promise.reject(ERROR_INVALID_ID, "측정 id 형식이 맞지 않아요: $id", null)
      return
    }
    findWatch(
      onResult = { node ->
        if (node == null) {
          promise.reject(ERROR_NO_WATCH, "연결된 워치가 없어요", null)
        } else {
          Wearable.getMessageClient(context)
            .sendMessage(node.id, path, WatchProtocol.commandPayload(id, phoneMs))
            .addOnSuccessListener { promise.resolve() }
            .addOnFailureListener { promise.reject(ERROR_SEND_FAILED, it.message, it) }
        }
      },
      onFailure = { promise.reject(ERROR_NO_WATCH, it.message, it) },
    )
  }

  private companion object {
    const val ERROR_INVALID_ID = "INVALID_ID"
    const val ERROR_NO_WATCH = "NO_WATCH"
    const val ERROR_SEND_FAILED = "SEND_FAILED"
  }
}
