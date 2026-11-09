package com.bada.watch.sensor

import android.content.Context

/** release 빌드: Samsung Health Sensor SDK 구현을 넣기 전까지는 측정할 수 없다(null). */
object SensorSources {
    const val IS_FAKE = false

    @Suppress("UNUSED_PARAMETER")
    fun create(context: Context): SensorSource? = null
}
