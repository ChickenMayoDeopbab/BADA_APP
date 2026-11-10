package expo.modules.wearbiosignal

import java.io.File

/**
 * 워치 세션 파일을 앱 내부 files 폴더의 biosignal/{id}.watch.json에 둔다.
 * Android에서 expo-file-system의 documentDirectory가 이 files 폴더(context.filesDir)다.
 * 받는 동안은 .part 파일에 쓰고, 다 받은 뒤 이름을 바꾼다.
 * 생체 측정 파일이 기기에 오래 남지 않도록 [RETENTION_MS]가 지나면 지운다(워치 보관 기간·폰 재전송 큐와 같음).
 */
internal class ReceivedFiles(filesDir: File) {
  private val dir = File(filesDir, "biosignal")

  fun partial(id: String) = File(dir, "$id.watch.json.part")

  fun prepare(id: String): File {
    dir.mkdirs()
    return partial(id).apply { delete() }
  }

  /** 다 받은 파일을 제자리로 옮긴다. 같은 id를 다시 받으면 덮어쓴다. */
  fun commit(id: String): File? {
    val target = File(dir, "$id.watch.json")
    target.delete()
    return target.takeIf { partial(id).renameTo(it) }
  }

  fun deleteExpired(nowMs: Long = System.currentTimeMillis()) {
    dir.listFiles()?.forEach { if (nowMs - it.lastModified() > RETENTION_MS) it.delete() }
  }

  companion object {
    const val RETENTION_MS = 24 * 60 * 60 * 1_000L
  }
}
