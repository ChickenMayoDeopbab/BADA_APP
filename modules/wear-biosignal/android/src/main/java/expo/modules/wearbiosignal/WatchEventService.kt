package expo.modules.wearbiosignal

import android.net.Uri
import com.bada.biosignal.BioLinkContract
import com.google.android.gms.wearable.ChannelClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/** 워치가 보내는 status 메시지와 세션 파일 채널을 받는다. 앱이 백그라운드여도 파일은 저장된다. */
class WatchEventService : WearableListenerService() {
  override fun onMessageReceived(event: MessageEvent) {
    if (event.path != BioLinkContract.PATH_STATUS) return
    val phoneReceivedMs = System.currentTimeMillis()
    val json = runCatching { JSONObject(String(event.data, Charsets.UTF_8)) }.getOrNull() ?: return
    val trackers = json.optJSONArray("trackers")
    WatchEvents.emit(
      WatchEvents.STATUS,
      mapOf(
        "id" to json.optNullableString("id"),
        "state" to json.optString("state"),
        "watchMs" to json.optLong("watch_ms").toDouble(),
        "trackers" to List(trackers?.length() ?: 0) { trackers!!.optString(it) },
        "error" to json.optNullableString("error"),
        "phoneReceivedMs" to phoneReceivedMs.toDouble(),
      ),
    )
  }

  override fun onChannelOpened(channel: ChannelClient.Channel) {
    val id = BioLinkContract.dataId(channel.path) ?: return
    val files = ReceivedFiles(filesDir)
    files.deleteExpired()
    val file = files.prepare(id)
    Wearable.getChannelClient(this)
      .receiveFile(channel, Uri.fromFile(file), false)
      .addOnFailureListener { WatchEvents.emitError(id, ERROR_RECEIVE_FAILED, it.message) }
  }

  override fun onInputClosed(channel: ChannelClient.Channel, closeReason: Int, appSpecificErrorCode: Int) {
    val id = BioLinkContract.dataId(channel.path) ?: return
    val phoneReceivedMs = System.currentTimeMillis()
    val files = ReceivedFiles(filesDir)
    Wearable.getChannelClient(this).close(channel)
    if (closeReason != ChannelClient.ChannelCallback.CLOSE_REASON_NORMAL) {
      files.partial(id).delete()
      WatchEvents.emitError(id, ERROR_RECEIVE_FAILED, "channel closed: $closeReason")
      return
    }
    val file = files.commit(id)
    if (file == null) {
      WatchEvents.emitError(id, ERROR_RECEIVE_FAILED, "파일 저장 실패")
      return
    }
    WatchEvents.emit(
      WatchEvents.DATA,
      mapOf("id" to id, "uri" to Uri.fromFile(file).toString(), "phoneReceivedMs" to phoneReceivedMs.toDouble()),
    )
  }

  private fun JSONObject.optNullableString(key: String): String? = if (isNull(key)) null else optString(key)

  private companion object {
    const val ERROR_RECEIVE_FAILED = "RECEIVE_FAILED"
  }
}
