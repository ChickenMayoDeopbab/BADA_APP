package com.bada.watch

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/** 심박 센서 권한. Wear OS 6(API 36)부터 BODY_SENSORS 대신 READ_HEART_RATE를 쓴다. */
object HeartRatePermission {
    private const val READ_HEART_RATE = "android.permission.health.READ_HEART_RATE"
    private const val API_WEAR_OS_6 = 36

    val name: String
        get() = if (Build.VERSION.SDK_INT >= API_WEAR_OS_6) READ_HEART_RATE else Manifest.permission.BODY_SENSORS

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
