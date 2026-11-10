package com.bada.watch

import android.content.Context
import android.net.Uri
import android.util.Log
import com.bada.biosignal.BioLinkContract
import com.google.android.gms.wearable.ChannelClient
import com.google.android.gms.wearable.Wearable
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/** 폰으로 status 메시지와 세션 파일을 보낸다. */
class PhoneLink(context: Context) {
    private val messageClient = Wearable.getMessageClient(context)
    private val channelClient = Wearable.getChannelClient(context)

    fun sendStatus(
        nodeId: String,
        id: String?,
        state: MeasurementState,
        trackers: List<String> = emptyList(),
        error: String? = null,
    ) {
        val payload = BioProtocol.statusPayload(id, state, System.currentTimeMillis(), trackers, error)
        messageClient.sendMessage(nodeId, BioLinkContract.PATH_STATUS, payload)
            .addOnFailureListener { Log.w(TAG, "status 전송 실패", it) }
    }

    /** 채널로 파일을 보내고, 폰이 끝까지 받았는지를 [onDone]으로 한 번 알린다. */
    fun sendFile(nodeId: String, id: String, file: File, onDone: (Boolean) -> Unit) {
        channelClient.openChannel(nodeId, BioLinkContract.dataPath(id))
            .addOnSuccessListener { channel ->
                val isDone = AtomicBoolean(false)
                lateinit var callback: ChannelClient.ChannelCallback
                fun finish(isSuccess: Boolean) {
                    if (!isDone.compareAndSet(false, true)) return
                    channelClient.unregisterChannelCallback(channel, callback)
                    if (!isSuccess) channelClient.close(channel)
                    onDone(isSuccess)
                }
                callback = object : ChannelClient.ChannelCallback() {
                    override fun onOutputClosed(closed: ChannelClient.Channel, closeReason: Int, appSpecificErrorCode: Int) {
                        if (closed.path == channel.path) finish(closeReason == CLOSE_NORMAL)
                    }

                    override fun onChannelClosed(closed: ChannelClient.Channel, closeReason: Int, appSpecificErrorCode: Int) {
                        if (closed.path == channel.path && closeReason != CLOSE_NORMAL) finish(false)
                    }
                }
                channelClient.registerChannelCallback(channel, callback)
                channelClient.sendFile(channel, Uri.fromFile(file))
                    .addOnFailureListener {
                        Log.w(TAG, "파일 전송 실패", it)
                        finish(false)
                    }
            }
            .addOnFailureListener {
                Log.w(TAG, "채널 열기 실패", it)
                onDone(false)
            }
    }

    private companion object {
        const val TAG = "BadaPhoneLink"
        const val CLOSE_NORMAL = ChannelClient.ChannelCallback.CLOSE_REASON_NORMAL
    }
}
