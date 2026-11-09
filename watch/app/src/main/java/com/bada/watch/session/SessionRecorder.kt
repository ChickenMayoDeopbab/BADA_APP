package com.bada.watch.session

import com.bada.watch.sensor.SensorSink
import org.json.JSONArray
import org.json.JSONObject

/**
 * 측정 한 번의 신호를 메모리에 모으고 세션 파일 JSON을 만든다.
 * 신호 배열은 서버 업로드 본문 형식 그대로다. 행 거르기·구간 자르기는 폰이 한다.
 * 배열마다 상한을 넘는 행은 버린다(앞부분 유지).
 */
class SessionRecorder(private val limits: Limits = Limits()) : SensorSink {
    data class Limits(
        val rows: Int = 7_200,
        val ibiRows: Int = 15_000,
        val ppgSamples: Int = 120_000,
    )

    private val hr = ArrayList<Row3>()
    private val ibi = ArrayList<Row3>()
    private val eda = ArrayList<Row3>()
    private val skinTemp = ArrayList<Row3>()
    private val acc = ArrayList<AccSummarizer.Row>()
    private val ppg = ArrayList<PpgBatcher.Batch>()
    private var ppgSampleCount = 0

    private val accSummarizer = AccSummarizer()
    private val ppgBatcher = PpgBatcher()

    @Synchronized
    override fun onHeartRate(watchMs: Long, bpm: Int, status: Int, ibiMs: List<Int>, ibiStatus: List<Int>) {
        hr.addCapped(Row3(watchMs, bpm, status), limits.rows)
        ibiMs.forEachIndexed { index, value ->
            ibi.addCapped(Row3(watchMs, value, ibiStatus.getOrElse(index) { -1 }), limits.ibiRows)
        }
    }

    @Synchronized
    override fun onAccelerometer(watchMs: Long, xG: Double, yG: Double, zG: Double) {
        accSummarizer.add(watchMs, AccSummarizer.magnitude(xG, yG, zG))?.let { acc.addCapped(it, limits.rows) }
    }

    @Synchronized
    override fun onPpgGreen(watchMs: Long, value: Int) {
        ppgBatcher.add(watchMs, value)?.let(::addPpg)
    }

    @Synchronized
    override fun onEda(watchMs: Long, value: Double, status: Int) {
        eda.addCapped(Row3(watchMs, value, status), limits.rows)
    }

    @Synchronized
    override fun onSkinTemperature(watchMs: Long, celsius: Double, status: Int) {
        skinTemp.addCapped(Row3(watchMs, celsius, status), limits.rows)
    }

    /** 진행 중인 acc 구간·ppg 묶음을 닫는다. 측정이 끝난 뒤 한 번 부른다. */
    @Synchronized
    fun finish() {
        accSummarizer.flush()?.let { acc.addCapped(it, limits.rows) }
        ppgBatcher.flush()?.let(::addPpg)
    }

    @Synchronized
    fun toJson(id: String, watchSentMs: Long, deviceModel: String, sdkVersion: String): String =
        JSONObject()
            .put("id", id)
            .put("watch_sent_ms", watchSentMs)
            .put("device", JSONObject().put("model", deviceModel).put("sdk", sdkVersion))
            .put("hr", hr.toJsonRows())
            .put("ibi", ibi.toJsonRows())
            .put("eda", eda.toJsonRows())
            .put("skin_temp", skinTemp.toJsonRows())
            .put("acc", JSONArray().apply { acc.forEach { put(JSONArray().put(it.windowStartMs).put(it.meanG).put(it.sdG)) } })
            .put("ppg", JSONArray().apply { ppg.forEach { put(it.toJson()) } })
            .toString()

    private fun addPpg(batch: PpgBatcher.Batch) {
        if (ppgSampleCount + batch.green.size > limits.ppgSamples) return
        ppg.add(batch)
        ppgSampleCount += batch.green.size
    }

    private data class Row3(val watchMs: Long, val value: Number, val status: Int)

    private fun <T> ArrayList<T>.addCapped(row: T, limit: Int) {
        if (size < limit) add(row)
    }

    private fun List<Row3>.toJsonRows() = JSONArray().also { rows ->
        forEach { rows.put(JSONArray().put(it.watchMs).put(it.value).put(it.status)) }
    }

    private fun PpgBatcher.Batch.toJson() = JSONObject()
        .put("t0", t0)
        .put("hz", hz)
        .put("green", JSONArray().also { array -> green.forEach { array.put(it) } })
}
