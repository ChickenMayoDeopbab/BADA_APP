package expo.modules.mediavolumecontrol

import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MediaVolumeControlModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MediaVolumeControl")

    Function("setEnabled") { enabled: Boolean ->
      val activity = appContext.currentActivity ?: return@Function
      activity.runOnUiThread {
        activity.volumeControlStream = if (enabled) {
          AudioManager.STREAM_MUSIC
        } else {
          AudioManager.USE_DEFAULT_STREAM_TYPE
        }
      }
    }
  }
}
