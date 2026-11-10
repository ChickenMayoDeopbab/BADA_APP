package com.bada.watch.sensor

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.bada.watch.MeasurementError
import com.samsung.android.service.health.tracking.ConnectionListener
import com.samsung.android.service.health.tracking.HealthTracker
import com.samsung.android.service.health.tracking.HealthTrackerException
import com.samsung.android.service.health.tracking.HealthTrackingService
import com.samsung.android.service.health.tracking.data.DataPoint
import com.samsung.android.service.health.tracking.data.HealthTrackerType
import com.samsung.android.service.health.tracking.data.PpgType
import com.samsung.android.service.health.tracking.data.ValueKey

/**
 * Samsung Health Sensor SDK 연속 측정. 기기가 지원하는 트래커만 켜고, 심박을 못 재는 기기면 측정 오류로 끝낸다.
 * 연결·종료 처리는 메인 스레드에서 하고, 신호 값은 SDK가 부르는 스레드에서 바로 [SensorSink]로 넘긴다.
 * 화면이 꺼지면 SDK가 값을 묶어 늦게 보낼 수 있어, 멈출 때 트래커마다 flush()로 남은 값을 받은 뒤 끝낸다.
 */
class SamsungSensorSource(context: Context) : SensorSource {
    /** 트래커 하나와 그 값을 [SensorSink]로 옮기는 방법 */
    private class Spec(
        val type: HealthTrackerType,
        val names: List<String>,
        /** 이 트래커가 오류를 내면 측정 전체를 끝낸다. 나머지는 그 트래커 값만 빠진다. */
        val isRequired: Boolean = false,
        val open: (HealthTrackingService) -> HealthTracker = { it.getHealthTracker(type) },
        val read: (DataPoint, SensorSink) -> Unit,
    )

    override val sdkVersion = SDK_VERSION
    override val trackers: List<String> get() = activeTrackers

    private val appContext = context.applicationContext
    private val handler = Handler(Looper.getMainLooper())
    private var service: HealthTrackingService? = null
    private val running = mutableListOf<HealthTracker>()

    @Volatile
    private var activeTrackers: List<String> = emptyList()
    private var isStopping = false
    private val pendingFlush = mutableSetOf<HealthTracker>()
    private var onStopped: (() -> Unit)? = null
    private val flushTimeout = Runnable { finishStop() }

    override fun start(sink: SensorSink, onError: (String) -> Unit) {
        val listener = object : ConnectionListener {
            override fun onConnectionSuccess() {
                handler.post { startTrackers(sink, onError) }
            }

            // 측정 중에 끊기면 그때까지 받은 값으로 세션 파일을 만든다.
            override fun onConnectionEnded() = Unit

            override fun onConnectionFailed(error: HealthTrackerException) {
                // Health Platform(com.samsung.android.service.health)이 없거나 오래된 기기
                Log.w(TAG, "connection failed: ${error.errorCode}")
                handler.post { if (!isStopping) onError(MeasurementError.NO_SENSOR) }
            }
        }
        service = HealthTrackingService(listener, appContext).also { it.connectService() }
    }

    override fun stop(onStopped: () -> Unit) {
        handler.post {
            if (isStopping) {
                // 이미 멈췄으면 바로, 멈추는 중이면 그 작업이 끝날 때 함께 알린다.
                val previous = this.onStopped
                if (previous == null) onStopped() else this.onStopped = { previous(); onStopped() }
                return@post
            }
            isStopping = true
            this.onStopped = onStopped
            running.filterTo(pendingFlush) { runCatching { it.flush() }.getOrDefault(false) }
            if (pendingFlush.isEmpty()) finishStop() else handler.postDelayed(flushTimeout, FLUSH_TIMEOUT_MS)
        }
    }

    private fun startTrackers(sink: SensorSink, onError: (String) -> Unit) {
        val connected = service ?: return
        if (isStopping) return
        val supported = runCatching { connected.trackingCapability.supportHealthTrackerTypes }.getOrDefault(emptyList())
        if (HealthTrackerType.HEART_RATE_CONTINUOUS !in supported) return onError(MeasurementError.NO_SENSOR)

        val started = mutableListOf<String>()
        for (spec in specs()) {
            if (spec.type !in supported) continue
            val tracker = runCatching { spec.open(connected) }
                .onFailure { Log.w(TAG, "tracker unavailable: ${spec.type}", it) }
                .getOrNull()
            if (tracker == null) {
                // 심박 트래커를 못 열면 심박을 못 재는 기기와 같이 끝낸다. 나머지는 그 값만 빠진다.
                if (spec.isRequired) return onError(MeasurementError.NO_SENSOR)
                continue
            }
            tracker.setEventListener(eventListener(tracker, spec, sink, onError))
            running += tracker
            started += spec.names
        }
        activeTrackers = started
    }

    private fun eventListener(
        tracker: HealthTracker,
        spec: Spec,
        sink: SensorSink,
        reportError: (String) -> Unit,
    ) = object : HealthTracker.TrackerEventListener {
        override fun onDataReceived(points: List<DataPoint>) {
            points.forEach { spec.read(it, sink) }
        }

        override fun onFlushCompleted() {
            handler.post { onFlushed(tracker) }
        }

        override fun onError(error: HealthTracker.TrackerError) {
            Log.w(TAG, "tracker error: ${spec.type} $error")
            handler.post {
                // 오류 난 트래커는 값을 더 보내지 않으니 끄고 목록에서 뺀다. 멈추는 중이면 그 flush도 기다리지 않는다.
                if (running.remove(tracker)) {
                    runCatching { tracker.unsetEventListener() }
                    activeTrackers = activeTrackers - spec.names.toSet()
                }
                if (isStopping) return@post onFlushed(tracker)
                if (!spec.isRequired) return@post
                // SDK_POLICY_ERROR: 등록되지 않은 앱이라 Health Platform 개발자 모드가 필요하다.
                reportError(
                    if (error == HealthTracker.TrackerError.PERMISSION_ERROR) {
                        MeasurementError.PERMISSION
                    } else {
                        MeasurementError.SDK_POLICY
                    },
                )
            }
        }
    }

    private fun onFlushed(tracker: HealthTracker) {
        if (pendingFlush.remove(tracker) && pendingFlush.isEmpty()) finishStop()
    }

    private fun finishStop() {
        handler.removeCallbacks(flushTimeout)
        pendingFlush.clear()
        running.forEach { runCatching { it.unsetEventListener() } }
        running.clear()
        activeTrackers = emptyList()
        runCatching { service?.disconnectService() }
        service = null
        onStopped?.also { onStopped = null }?.invoke()
    }

    /** 켤 트래커. 가속도는 ACTIVITY_RECOGNITION 권한이 있을 때만 켠다(없어도 심박은 잰다). */
    private fun specs(): List<Spec> = buildList {
        add(Spec(HealthTrackerType.HEART_RATE_CONTINUOUS, listOf(Trackers.HR, Trackers.IBI), isRequired = true, read = ::readHeartRate))
        if (isGranted(Manifest.permission.ACTIVITY_RECOGNITION)) {
            add(Spec(HealthTrackerType.ACCELEROMETER_CONTINUOUS, listOf(Trackers.ACC), read = ::readAccelerometer))
        }
        add(
            Spec(
                HealthTrackerType.PPG_CONTINUOUS,
                listOf(Trackers.PPG),
                open = { it.getHealthTracker(HealthTrackerType.PPG_CONTINUOUS, setOf(PpgType.GREEN)) },
                read = ::readPpgGreen,
            ),
        )
        add(Spec(HealthTrackerType.EDA_CONTINUOUS, listOf(Trackers.EDA), read = ::readEda))
        add(Spec(HealthTrackerType.SKIN_TEMPERATURE_CONTINUOUS, listOf(Trackers.SKIN_TEMP), read = ::readSkinTemperature))
    }

    private fun isGranted(permission: String) =
        ContextCompat.checkSelfPermission(appContext, permission) == PackageManager.PERMISSION_GRANTED

    private companion object {
        const val TAG = "BadaSensor"

        /** watch/app/libs의 SDK aar 버전과 맞춘다. 세션 파일 device.sdk로 간다. */
        const val SDK_VERSION = "samsung-1.4.1"

        /** flush 완료가 오지 않아도 이 시간이 지나면 받은 값까지로 끝낸다. 폰은 30초 뒤 파일을 다시 요청한다. */
        const val FLUSH_TIMEOUT_MS = 10_000L

        // DataPoint.timestamp는 부팅 기준 시간이 아니라 벽시계 epoch ms다(Galaxy Watch6 실기: System.currentTimeMillis와 수십 ms 차이).
        // 그래서 변환 없이 넘기고, SessionRecorder가 IBI 시각을 이 값에서 당겨도 음수가 되지 않는다.
        fun readHeartRate(point: DataPoint, sink: SensorSink) {
            val bpm = point.getValue(ValueKey.HeartRateSet.HEART_RATE) ?: return
            val status = point.getValue(ValueKey.HeartRateSet.HEART_RATE_STATUS) ?: return
            sink.onHeartRate(
                point.timestamp,
                bpm,
                status,
                point.getValue(ValueKey.HeartRateSet.IBI_LIST).orEmpty(),
                point.getValue(ValueKey.HeartRateSet.IBI_STATUS_LIST).orEmpty(),
            )
        }

        fun readAccelerometer(point: DataPoint, sink: SensorSink) {
            val x = point.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_X) ?: return
            val y = point.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Y) ?: return
            val z = point.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Z) ?: return
            sink.onAccelerometer(
                point.timestamp,
                SamsungValues.accelerometerG(x),
                SamsungValues.accelerometerG(y),
                SamsungValues.accelerometerG(z),
            )
        }

        fun readPpgGreen(point: DataPoint, sink: SensorSink) {
            if (!SamsungValues.isPpgUsable(point.getValue(ValueKey.PpgSet.GREEN_STATUS))) return
            val green = point.getValue(ValueKey.PpgSet.PPG_GREEN) ?: return
            sink.onPpgGreen(point.timestamp, green)
        }

        fun readEda(point: DataPoint, sink: SensorSink) {
            val value = point.getValue(ValueKey.EdaSet.SKIN_CONDUCTANCE) ?: return
            val status = point.getValue(ValueKey.EdaSet.STATUS) ?: return
            sink.onEda(point.timestamp, value.toDouble(), status)
        }

        fun readSkinTemperature(point: DataPoint, sink: SensorSink) {
            val celsius = point.getValue(ValueKey.SkinTemperatureSet.OBJECT_TEMPERATURE) ?: return
            val status = point.getValue(ValueKey.SkinTemperatureSet.STATUS) ?: return
            sink.onSkinTemperature(point.timestamp, celsius.toDouble(), status)
        }
    }
}
