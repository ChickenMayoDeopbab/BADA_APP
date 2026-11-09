package com.bada.watch.sensor

import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

/**
 * 실제 SDK와 비슷한 주기로 그럴듯한 값을 만든다. 시각은 시작 시각 + 표본 번호로 계산해 끊김이 없다.
 * acc·ppg 25 Hz, 심박·IBI·EDA 1 Hz, 피부 온도 10초.
 */
class FakeSensorSource(private val random: Random = Random.Default) : SensorSource {
    override val sdkVersion = "fake"
    override val trackers = listOf(
        Trackers.HR,
        Trackers.IBI,
        Trackers.ACC,
        Trackers.PPG,
        Trackers.EDA,
        Trackers.SKIN_TEMP,
    )

    private var executor: ScheduledExecutorService? = null

    override fun start(sink: SensorSink) {
        val startMs = System.currentTimeMillis()
        var tick = 0L
        executor = Executors.newSingleThreadScheduledExecutor().apply {
            scheduleAtFixedRate({ emit(sink, startMs + tick * TICK_MS, tick++) }, 0, TICK_MS, TimeUnit.MILLISECONDS)
        }
    }

    override fun stop(onStopped: () -> Unit) {
        val running = executor ?: return onStopped()
        executor = null
        Thread {
            running.shutdown()
            running.awaitTermination(1, TimeUnit.SECONDS)
            onStopped()
        }.start()
    }

    private fun emit(sink: SensorSink, watchMs: Long, tick: Long) {
        val seconds = tick * TICK_MS / 1_000.0
        val bpm = 72 + 6 * sin(2 * PI * seconds / 60)

        sink.onAccelerometer(watchMs, noise(0.02), noise(0.02), 1.0 + noise(0.02))
        val pulse = sin(2 * PI * seconds * bpm / 60)
        sink.onPpgGreen(watchMs, (50_000 + 800 * pulse + noise(40.0)).roundToInt())

        if (tick % TICKS_PER_SECOND == 0L) {
            sink.onHeartRate(watchMs, bpm.roundToInt(), HR_STATUS_OK, listOf((60_000 / bpm).roundToInt()), listOf(IBI_STATUS_OK))
            sink.onEda(watchMs, 2.0 + 0.3 * sin(2 * PI * seconds / 90) + noise(0.02), 0)
        }
        if (tick % (TICKS_PER_SECOND * 10) == 0L) {
            sink.onSkinTemperature(watchMs, 33.0 + noise(0.1), 0)
        }
    }

    private fun noise(scale: Double) = (random.nextDouble() * 2 - 1) * scale

    private companion object {
        const val TICK_MS = 40L
        const val TICKS_PER_SECOND = 25L
        const val HR_STATUS_OK = 1
        const val IBI_STATUS_OK = 0
    }
}
