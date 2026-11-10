package com.bada.watch

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.bada.watch.sensor.SensorSources

/** 측정 상태만 보여 준다. 통화 중 불안을 키우지 않도록 심박 숫자는 표시하지 않는다. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                MeasurementScreen()
            }
        }
    }
}

@Composable
private fun MeasurementScreen() {
    val context = LocalContext.current
    val snapshot by MeasurementStatus.snapshot.collectAsState()
    var isPermissionGranted by remember { mutableStateOf(HeartRatePermission.isGranted(context)) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        isPermissionGranted = HeartRatePermission.isGranted(context)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (!isPermissionGranted) {
            StatusText(title = "권한이 필요해요", body = "통화 중 몸의 반응을 재려면 센서 권한을 허용해 주세요.")
            Spacer(Modifier.height(8.dp))
            Button(onClick = { permissionLauncher.launch(HeartRatePermission.requested) }) {
                Text("허용")
            }
        } else {
            val (title, body) = statusMessage(snapshot)
            StatusText(title = title, body = body)
        }
        if (SensorSources.IS_FAKE) {
            Spacer(Modifier.height(6.dp))
            Text(text = "테스트 센서", style = MaterialTheme.typography.caption3, color = MaterialTheme.colors.secondary)
        }
    }
}

@Composable
private fun StatusText(title: String, body: String) {
    Text(text = title, style = MaterialTheme.typography.title3, textAlign = TextAlign.Center)
    Spacer(Modifier.height(4.dp))
    Text(text = keepWords(body), style = MaterialTheme.typography.body2, textAlign = TextAlign.Center)
}

/** 한글이 어절 중간에서 끊기지 않도록 글자 사이에 word joiner를 넣어 띄어쓰기에서만 줄을 바꾼다. */
private fun keepWords(text: String) = text.split(' ').joinToString(" ") { it.toList().joinToString("\u2060") }

private fun statusMessage(snapshot: MeasurementStatus.Snapshot): Pair<String, String> = when (snapshot.state) {
    MeasurementState.IDLE -> "대기 중" to "폰에서 통화를 시작하면 자동으로 재요. 이 화면을 켜 둔 채로 시작해 주세요."
    MeasurementState.MEASURING -> "측정 중" to "통화가 끝나면 폰으로 보내요."
    MeasurementState.SENDING -> "보내는 중" to "폰으로 측정 기록을 보내고 있어요."
    MeasurementState.SENT -> "보냈어요" to "폰에서 리포트를 확인해 주세요."
    MeasurementState.ERROR -> when (snapshot.error) {
        MeasurementError.PERMISSION -> "측정하지 못했어요" to "센서 권한을 허용해 주세요."
        MeasurementError.NO_SENSOR -> "측정하지 못했어요" to "이 워치에서는 측정할 수 없어요."
        MeasurementError.BACKGROUND_START -> "측정하지 못했어요" to "워치 앱을 열어 둔 채로 다시 시작해 주세요."
        MeasurementError.SEND_FAILED -> "보내지 못했어요" to "측정 기록은 워치에 남아 있어요. 폰과 가까이 두면 다시 보내요."
        else -> "측정하지 못했어요" to "다시 시도해 주세요."
    }
}
