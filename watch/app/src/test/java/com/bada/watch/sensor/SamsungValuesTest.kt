package com.bada.watch.sensor

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SamsungValuesTest {
    @Test
    fun accelerometerRawIsConvertedToG() {
        // SDK 문서의 m/s² 변환식을 9.81로 나눈 값과 같아야 한다.
        val raw = 2_048
        val metersPerSecondSquared = 9.81 / (16_383.75 / 4.0) * raw
        assertEquals(metersPerSecondSquared / 9.81, SamsungValues.accelerometerG(raw), 1e-12)
        assertEquals(1.0, SamsungValues.accelerometerG(4_096), 1e-4)
        assertEquals(-0.5, SamsungValues.accelerometerG(-2_048), 1e-4)
    }

    @Test
    fun onlyNormalPpgSamplesAreUsed() {
        assertTrue(SamsungValues.isPpgUsable(0))
        assertFalse(SamsungValues.isPpgUsable(-1))
        assertFalse(SamsungValues.isPpgUsable(null))
    }
}
