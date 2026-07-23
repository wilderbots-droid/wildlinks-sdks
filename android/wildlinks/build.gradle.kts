plugins {
  id("com.android.library")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.wilderbots.wildlinks"
  compileSdk = 35

  defaultConfig {
    minSdk = 23
    consumerProguardFiles("consumer-rules.pro")
  }
}

kotlin {
  jvmToolchain(17)
}

dependencies {
  api("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
