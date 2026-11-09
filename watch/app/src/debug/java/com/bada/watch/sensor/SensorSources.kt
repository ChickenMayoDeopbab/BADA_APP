package com.bada.watch.sensor

import android.content.Context

/** debug 빌드: 실기기·SDK 없이 전송 경로를 확인하도록 가짜 센서를 쓴다. */
object SensorSources {
    const val IS_FAKE = true

    @Suppress("UNUSED_PARAMETER")
    fun create(context: Context): SensorSource? = FakeSensorSource()
}
