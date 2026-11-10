package com.bada.watch.sensor

import android.content.Context

/** 가짜 센서 빌드(debug 기본): 실기기·SDK 없이 전송 경로를 확인한다. */
object SensorSources {
    const val IS_FAKE = true

    @Suppress("UNUSED_PARAMETER")
    fun create(context: Context): SensorSource? = FakeSensorSource()
}
