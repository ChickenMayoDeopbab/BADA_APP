package com.bada.watch.sensor

/** Samsung Health Sensor SDK 값 해석. SDK 없이 단위 테스트할 수 있게 SDK 타입을 쓰지 않는다. */
object SamsungValues {
    /**
     * 가속도 raw 1 g에 해당하는 값. SDK 문서: m/s² = 9.81 / (16383.75 / 4.0) × raw.
     * 중력이 포함돼 있어 가만히 있으면 크기가 약 1 g다(Galaxy Watch6 실기 확인).
     */
    private const val ACC_RAW_PER_G = 16_383.75 / 4.0

    /** PPG GREEN_STATUS 정상 값. -1은 BIA 같은 우선 센서가 LED를 쓰는 중이라 값이 없다는 뜻이다. */
    private const val PPG_STATUS_OK = 0

    fun accelerometerG(raw: Int): Double = raw / ACC_RAW_PER_G

    fun isPpgUsable(status: Int?): Boolean = status == PPG_STATUS_OK
}
