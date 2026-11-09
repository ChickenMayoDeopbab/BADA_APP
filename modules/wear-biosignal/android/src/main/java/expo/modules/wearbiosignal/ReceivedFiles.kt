package expo.modules.wearbiosignal

import android.content.Context
import java.io.File

/**
 * 워치 세션 파일을 앱 문서 폴더(expo-file-system documentDirectory)의 biosignal/{id}.watch.json에 둔다.
 * 받는 동안은 .part 파일에 쓰고, 다 받은 뒤 이름을 바꾼다.
 */
internal class ReceivedFiles(context: Context) {
  private val dir = File(context.filesDir, "biosignal")

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
}
