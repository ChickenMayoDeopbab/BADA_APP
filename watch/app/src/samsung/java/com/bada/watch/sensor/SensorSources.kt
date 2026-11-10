package com.bada.watch.sensor

import android.content.Context

/** 실제 센서 빌드(release, debug -Pbada.sensor=samsung): Samsung Health Sensor SDK로 잰다. */
object SensorSources {
    const val IS_FAKE = false

    fun create(context: Context): SensorSource? = SamsungSensorSource(context)
}
