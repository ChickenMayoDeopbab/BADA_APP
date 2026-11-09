package com.bada.watch

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** 화면이 보는 측정 상태. 서비스와 메시지 수신 서비스가 갱신한다. */
object MeasurementStatus {
    data class Snapshot(
        val state: MeasurementState = MeasurementState.IDLE,
        val id: String? = null,
        val error: String? = null,
    )

    private val mutableSnapshot = MutableStateFlow(Snapshot())
    val snapshot: StateFlow<Snapshot> = mutableSnapshot.asStateFlow()

    fun publish(state: MeasurementState, id: String?, error: String? = null) {
        mutableSnapshot.value = Snapshot(state, id, error)
    }

    /** [id] 측정이 끝났으면(ack·cancel) 대기로 돌린다. 다른 측정이 진행 중이면 그대로 둔다. */
    fun clear(id: String) {
        val current = mutableSnapshot.value
        if (current.id == id && current.state != MeasurementState.MEASURING) publish(MeasurementState.IDLE, null)
    }
}
