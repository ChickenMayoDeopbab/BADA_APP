package com.bada.watch

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import com.bada.watch.sensor.SensorSource
import com.bada.watch.sensor.SensorSources
import com.bada.watch.session.SessionFiles
import com.bada.watch.session.SessionRecorder
import java.util.concurrent.Executors

/**
 * 측정·파일 전송 동안 살아 있는 health 타입 포그라운드 서비스.
 * 명령 처리와 상태 변경은 모두 메인 스레드에서 한다.
 */
class MeasurementService : Service() {
    private class ActiveSession(val id: String, val source: SensorSource, val recorder: SessionRecorder)

    private val handler = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private lateinit var phoneLink: PhoneLink
    private lateinit var files: SessionFiles
    private lateinit var wakeLock: PowerManager.WakeLock

    private var session: ActiveSession? = null
    private val sendingIds = mutableSetOf<String>()
    private var nodeId: String? = null

    private val statusTicker = object : Runnable {
        override fun run() {
            session?.let { sendStatus(it.id, MeasurementState.MEASURING) }
            handler.postDelayed(this, STATUS_INTERVAL_MS)
        }
    }
    private val maxDurationStop = Runnable { finishMeasurement() }

    override fun onCreate() {
        super.onCreate()
        phoneLink = PhoneLink(this)
        files = SessionFiles(this)
        wakeLock = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "bada:measurement")
        io.execute { files.deleteExpired() }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        current = this
        startInForeground()
        val id = intent?.getStringExtra(EXTRA_ID)
        val node = intent?.getStringExtra(EXTRA_NODE_ID)
        val command = when (intent?.action) {
            ACTION_START -> id?.let { Command.Start(it, intent.getLongExtra(EXTRA_PHONE_MS, 0)) }
            ACTION_RESEND -> id?.let { Command.Stop(it) }
            else -> null
        }
        if (command != null && node != null) onCommand(command, node) else stopIfIdle()
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        if (current === this) current = null
        handler.removeCallbacksAndMessages(null)
        session?.let { discard(it) }
        io.shutdown()
        super.onDestroy()
    }

    /** 이미 떠 있는 서비스로 명령을 넘긴다. 어느 스레드에서든 부를 수 있다. */
    fun handle(command: Command, sourceNodeId: String) {
        handler.post { onCommand(command, sourceNodeId) }
    }

    private fun onCommand(command: Command, sourceNodeId: String) {
        nodeId = sourceNodeId
        val active = session
        when (command) {
            is Command.Start -> when {
                active?.id == command.id -> sendStatus(command.id, MeasurementState.MEASURING)
                else -> {
                    // 폰이 새 측정을 시작하면 끝나지 않은 이전 측정은 버린다.
                    active?.let { discard(it) }
                    startMeasurement(command.id)
                }
            }

            is Command.Stop -> when {
                active?.id == command.id -> finishMeasurement()
                command.id in sendingIds -> sendStatus(command.id, MeasurementState.SENDING)
                // 폰이 파일을 못 받아 stop을 다시 보내면 보관 중인 파일을 다시 보낸다.
                files.exists(command.id) -> sendFile(command.id)
                else -> replyIdle(command.id)
            }

            is Command.Cancel -> {
                if (active != null && active.id == command.id) discard(active)
                io.execute { files.delete(command.id) }
                replyIdle(command.id)
            }

            is Command.Ack -> {
                io.execute { files.delete(command.id) }
                replyIdle(command.id)
            }
        }
    }

    private fun startMeasurement(id: String) {
        if (!HeartRatePermission.isGranted(this)) return fail(id, MeasurementError.PERMISSION)
        val source = SensorSources.create(this) ?: return fail(id, MeasurementError.NO_SENSOR)
        val recorder = SessionRecorder()
        session = ActiveSession(id, source, recorder)
        wakeLock.acquire(MAX_MEASUREMENT_MS + WAKE_LOCK_MARGIN_MS)
        source.start(recorder)
        MeasurementStatus.publish(MeasurementState.MEASURING, id)
        handler.removeCallbacks(statusTicker)
        handler.post(statusTicker)
        handler.postDelayed(maxDurationStop, MAX_MEASUREMENT_MS)
    }

    /** 센서를 멈추고 세션 파일을 써서 폰으로 보낸다. */
    private fun finishMeasurement() {
        val active = session ?: return
        endSession()
        sendingIds += active.id
        MeasurementStatus.publish(MeasurementState.SENDING, active.id)
        sendStatus(active.id, MeasurementState.SENDING)
        active.source.stop {
            io.execute {
                val written = runCatching {
                    active.recorder.finish()
                    val json = active.recorder.toJson(
                        id = active.id,
                        watchSentMs = System.currentTimeMillis(),
                        deviceModel = Build.MODEL,
                        sdkVersion = active.source.sdkVersion,
                    )
                    files.write(active.id, json)
                }
                handler.post {
                    sendingIds -= active.id
                    if (written.isSuccess) sendFile(active.id) else fail(active.id, MeasurementError.WRITE_FAILED)
                }
            }
        }
    }

    private fun sendFile(id: String) {
        val node = nodeId ?: return fail(id, MeasurementError.SEND_FAILED)
        sendingIds += id
        if (session == null) MeasurementStatus.publish(MeasurementState.SENDING, id)
        sendStatus(id, MeasurementState.SENDING)
        phoneLink.sendFile(node, id, files.file(id)) { isSent ->
            handler.post {
                sendingIds -= id
                if (isSent) {
                    // 파일은 ack를 받을 때까지 남겨 둔다.
                    if (session == null) MeasurementStatus.publish(MeasurementState.SENT, id)
                    sendStatus(id, MeasurementState.SENT)
                    stopIfIdle()
                } else {
                    fail(id, MeasurementError.SEND_FAILED)
                }
            }
        }
    }

    /** 측정을 버린다. 파일은 남기지 않는다. */
    private fun discard(active: ActiveSession) {
        endSession()
        active.source.stop {}
        io.execute { files.delete(active.id) }
    }

    private fun endSession() {
        session = null
        handler.removeCallbacks(statusTicker)
        handler.removeCallbacks(maxDurationStop)
        if (wakeLock.isHeld) wakeLock.release()
    }

    private fun fail(id: String, error: String) {
        if (session == null) MeasurementStatus.publish(MeasurementState.ERROR, id, error)
        sendStatus(id, MeasurementState.ERROR, error)
        stopIfIdle()
    }

    private fun replyIdle(id: String) {
        MeasurementStatus.clear(id)
        sendStatus(id, MeasurementState.IDLE)
        stopIfIdle()
    }

    private fun sendStatus(id: String, state: MeasurementState, error: String? = null) {
        val node = nodeId ?: return
        val trackers = session?.takeIf { it.id == id }?.source?.trackers.orEmpty()
        phoneLink.sendStatus(node, id, state, trackers, error)
    }

    private fun stopIfIdle() {
        if (session != null || sendingIds.isNotEmpty()) return
        // 이후 명령은 새로 시작하는 서비스가 받도록 먼저 비운다.
        if (current === this) current = null
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun startInForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW,
            ),
        )
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val builder = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_measure)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.notification_measuring))
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setOngoing(true)
            .setContentIntent(openApp)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        OngoingActivity.Builder(applicationContext, NOTIFICATION_ID, builder)
            .setStaticIcon(R.drawable.ic_measure)
            .setTouchIntent(openApp)
            .setStatus(Status.Builder().addTemplate(getString(R.string.ongoing_status)).build())
            .build()
            .apply(applicationContext)
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
        } else {
            0
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, builder.build(), type)
    }

    companion object {
        const val ACTION_START = "com.bada.watch.action.START"
        const val ACTION_RESEND = "com.bada.watch.action.RESEND"
        private const val EXTRA_ID = "id"
        private const val EXTRA_NODE_ID = "node_id"
        private const val EXTRA_PHONE_MS = "phone_ms"

        private const val NOTIFICATION_CHANNEL_ID = "measurement"
        private const val NOTIFICATION_ID = 1
        const val STATUS_INTERVAL_MS = 5_000L

        /** 폰과 연결이 끊겨 stop을 못 받아도 배터리를 계속 쓰지 않도록 측정을 끝낸다. */
        const val MAX_MEASUREMENT_MS = 60 * 60 * 1_000L
        private const val WAKE_LOCK_MARGIN_MS = 60_000L

        /** 떠 있는 서비스. 메시지 수신 서비스가 명령을 바로 넘길 때 쓴다. */
        @Volatile
        var current: MeasurementService? = null
            private set

        fun intent(context: Context, action: String, id: String, nodeId: String, phoneMs: Long = 0) =
            Intent(context, MeasurementService::class.java)
                .setAction(action)
                .putExtra(EXTRA_ID, id)
                .putExtra(EXTRA_NODE_ID, nodeId)
                .putExtra(EXTRA_PHONE_MS, phoneMs)
    }
}
