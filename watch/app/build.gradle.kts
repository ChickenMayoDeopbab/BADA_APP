plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Data Layer는 폰·워치 앱의 패키지명과 서명 인증서가 같아야 연결된다.
// 개발 중에는 폰 dev 빌드와 같은 android/app/debug.keystore로 워치 debug 빌드를 서명한다(release에는 쓰지 않는다).
// android/는 폰 앱 prebuild로 생기므로 워치보다 먼저 만들어 둬야 한다(watch/README.md).
val phoneDebugKeystore = rootProject.file("../android/app/debug.keystore")
if (!phoneDebugKeystore.exists()) {
    logger.warn("경고: ${phoneDebugKeystore.path}가 없어 기본 debug 키로 서명합니다. 폰 앱과 연결되지 않으니 폰 앱을 먼저 prebuild하세요.")
}

// 센서 구현: debug는 가짜 센서(에뮬레이터에서 전송 경로 확인)가 기본이고, -Pbada.sensor=samsung이면 실제 센서를 쓴다.
// release는 항상 실제 센서(Samsung Health Sensor SDK)를 쓴다.
val debugSensor = providers.gradleProperty("bada.sensor").getOrElse("fake")
require(debugSensor == "fake" || debugSensor == "samsung") { "bada.sensor는 fake 또는 samsung이어야 합니다: $debugSensor" }
// SDK aar는 라이선스 확인 전까지 커밋하지 않고 각자 app/libs/에 넣는다(watch/README.md).
val hasSensorSdk = file("libs").listFiles { file -> file.extension == "aar" }?.isNotEmpty() == true

android {
    namespace = "com.bada.watch"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.bada.app"
        minSdk = 30 // Wear OS 3 (Galaxy Watch4 이상)
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    signingConfigs {
        getByName("debug") {
            if (phoneDebugKeystore.exists()) {
                storeFile = phoneDebugKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    // 폰 모듈과 같이 빌드하는 Data Layer 규약(경로·id 규칙)
    sourceSets {
        getByName("main") {
            java.srcDir(rootProject.file("../modules/wear-biosignal/android/src/protocol/java"))
        }
        getByName("debug") {
            java.srcDir("src/$debugSensor/java")
        }
        getByName("release") {
            java.srcDir("src/samsung/java")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.wear.compose:compose-material:1.4.1")
    implementation("androidx.wear.compose:compose-foundation:1.4.1")
    implementation("androidx.wear:wear-ongoing:1.0.0")
    implementation("com.google.android.gms:play-services-wearable:19.0.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    // Samsung Health Sensor SDK. 가짜 센서 빌드는 없어도 된다.
    implementation(fileTree("libs") { include("*.aar") })

    testImplementation("junit:junit:4.13.2")
    // 단위 테스트에서 android.jar의 빈 org.json 대신 실제 구현을 쓴다.
    testImplementation("org.json:json:20240303")
}

// 실제 센서 빌드에 SDK가 없으면 컴파일 오류 대신 받는 방법을 알려 주고 멈춘다.
tasks.configureEach {
    val needsSensorSdk = name == "preReleaseBuild" || (debugSensor == "samsung" && name == "preDebugBuild")
    if (needsSensorSdk && !hasSensorSdk) {
        doFirst {
            throw GradleException(
                "Samsung Health Sensor SDK aar가 없습니다. https://developer.samsung.com/health/sensor/overview.html 에서 받아 " +
                    "watch/app/libs/에 넣어 주세요.",
            )
        }
    }
}
