package com.bada.watch.session

import android.content.Context
import java.io.File

/** 폰의 ack를 받을 때까지 세션 파일을 보관한다. 폰 재전송 큐와 같이 24시간이 지나면 지운다. */
class SessionFiles(context: Context) {
    private val dir = File(context.filesDir, "biosignal")

    fun file(id: String) = File(dir, "$id.json")

    fun exists(id: String) = file(id).isFile

    /** 임시 파일에 쓴 뒤 이름을 바꿔 반쯤 쓰인 파일이 남지 않게 한다. */
    fun write(id: String, json: String): File {
        dir.mkdirs()
        val target = file(id)
        val temp = File(dir, "$id.json.tmp")
        temp.writeText(json, Charsets.UTF_8)
        if (!temp.renameTo(target)) {
            temp.delete()
            error("세션 파일 저장 실패: $id")
        }
        return target
    }

    fun delete(id: String) {
        file(id).delete()
    }

    fun deleteExpired(nowMs: Long = System.currentTimeMillis()) {
        dir.listFiles()?.forEach { if (nowMs - it.lastModified() > RETENTION_MS) it.delete() }
    }

    companion object {
        const val RETENTION_MS = 24 * 60 * 60 * 1_000L
    }
}
