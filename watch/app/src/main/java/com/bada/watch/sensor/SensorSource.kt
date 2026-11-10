package com.bada.watch.sensor

/**
 * 워치 센서 공급원. 실제 기기는 Samsung Health Sensor SDK 구현을, debug 빌드는 가짜 구현을 쓴다.
 * 모든 시각은 워치 시계 epoch ms.
 */
interface SensorSource {
    /** 세션 파일 device.sdk 값 */
    val sdkVersion: String

    /** 이 기기에서 켤 수 있는 트래커. status 메시지 trackers 값과 같다. */
    val trackers: List<String>

    fun start(sink: SensorSink)

    /** 남은 데이터를 모두 넘긴 뒤 멈추고 [onStopped]를 부른다. */
    fun stop(onStopped: () -> Unit)
}

/** 센서 콜백. 어느 스레드에서든 불릴 수 있다. */
interface SensorSink {
    /** 심박 포인트 하나. [ibiMs]·[ibiStatus]는 0~4개이고 길이가 같다. */
    fun onHeartRate(watchMs: Long, bpm: Int, status: Int, ibiMs: List<Int>, ibiStatus: List<Int>)

    /** 가속도 벡터(g). */
    fun onAccelerometer(watchMs: Long, xG: Double, yG: Double, zG: Double)

    fun onPpgGreen(watchMs: Long, value: Int)

    fun onEda(watchMs: Long, value: Double, status: Int)

    fun onSkinTemperature(watchMs: Long, celsius: Double, status: Int)
}

object Trackers {
    const val HR = "hr"
    const val IBI = "ibi"
    const val ACC = "acc"
    const val PPG = "ppg"
    const val EDA = "eda"
    const val SKIN_TEMP = "skin_temp"
}
