package com.bada.watch

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * 심박 센서 권한. targetSdk 35라 Wear OS 6(API 36) 기기에서도 BODY_SENSORS를 쓴다.
 * Samsung Health Sensor SDK는 targetSdk 35 이하 앱을 BODY_SENSORS로 확인해, READ_HEART_RATE만 있으면 PERMISSION_ERROR를 낸다.
 */
object HeartRatePermission {
    const val name = Manifest.permission.BODY_SENSORS

    /** 화면에서 한 번에 요청할 권한 목록. 가속도(움직임)는 ACTIVITY_RECOGNITION이 있어야 재고, 없어도 심박은 잰다. */
    val requested: Array<String>
        get() = buildList {
            add(name)
            add(Manifest.permission.ACTIVITY_RECOGNITION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) add(Manifest.permission.POST_NOTIFICATIONS)
        }.toTypedArray()

    fun isGranted(context: Context) =
        ContextCompat.checkSelfPermission(context, name) == PackageManager.PERMISSION_GRANTED
}
