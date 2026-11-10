package com.bada.watch

import androidx.core.content.ContextCompat
import com.bada.watch.session.SessionFiles
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/** 폰이 보낸 /bada/bio/ 아래 명령을 받는다. 측정 서비스가 떠 있으면 그쪽으로 넘긴다. */
class PhoneCommandService : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) {
        val command = BioProtocol.parseCommand(event.path, event.data) ?: return
        val node = event.sourceNodeId
        MeasurementService.current?.let {
            it.handle(command, node)
            return
        }
        val files = SessionFiles(this)
        when (command) {
            is Command.Start -> startService(MeasurementService.ACTION_START, command.id, node, command.phoneMs)
            is Command.Stop ->
                if (files.exists(command.id)) {
                    startService(MeasurementService.ACTION_RESEND, command.id, node)
                } else {
                    replyIdle(command.id, node)
                }

            is Command.Cancel, is Command.Ack -> {
                files.delete(command.id)
                replyIdle(command.id, node)
            }
        }
    }

    private fun startService(action: String, id: String, node: String, phoneMs: Long = 0) {
        try {
            ContextCompat.startForegroundService(this, MeasurementService.intent(this, action, id, node, phoneMs))
        } catch (e: IllegalStateException) {
            // Android 12+는 백그라운드에서 포그라운드 서비스를 못 띄울 수 있다. 워치 앱을 연 채로 측정한다.
            MeasurementStatus.publish(MeasurementState.ERROR, id, MeasurementError.BACKGROUND_START)
            PhoneLink(this).sendStatus(node, id, MeasurementState.ERROR, error = MeasurementError.BACKGROUND_START)
        }
    }

    private fun replyIdle(id: String, node: String) {
        MeasurementStatus.clear(id)
        PhoneLink(this).sendStatus(node, id, MeasurementState.IDLE)
    }
}
