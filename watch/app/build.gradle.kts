plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Data Layer는 폰·워치 앱의 패키지명과 서명 인증서가 같아야 연결된다.
// 개발 중에는 폰 dev 빌드와 같은 android/app/debug.keystore로 워치 debug 빌드를 서명한다(release에는 쓰지 않는다).
val phoneDebugKeystore = rootProject.file("../android/app/debug.keystore")

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
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.wear.compose:compose-material:1.4.1")
    implementation("androidx.wear.compose:compose-foundation:1.4.1")
    implementation("androidx.wear:wear-ongoing:1.0.0")
    implementation("com.google.android.gms:play-services-wearable:19.0.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    testImplementation("junit:junit:4.13.2")
    // 단위 테스트에서 android.jar의 빈 org.json 대신 실제 구현을 쓴다.
    testImplementation("org.json:json:20240303")
}
