# WilderLinks Android SDK

Native Android SDK for resolving WilderLinks App Links and recovering deferred
deep-link payloads after install.

## Install

Add the `wildlinks` module or publish it to your Maven registry, then initialize
the SDK at app startup:

```kotlin
Wildlinks.init(
  WildlinksConfig(
    baseUrl = "https://apilink.wilderbots.com",
    domains = listOf("go.yourbrand.com")
  )
)
```

## Resolve an App Link

```kotlin
val result = Wildlinks.handleIncomingUri(intent.data!!)
if (result.matched) {
  // result.deepLinkPayload contains the original campaign payload.
  // result.openId is present when WilderLinks tracked this app open.
}
```

## Deferred install match

```kotlin
val result = Wildlinks.checkDeferredInstall(context)
```

For higher-accuracy Play Store attribution, read the Play Install Referrer string
in your app and pass the extracted `dl_match_token` directly:

```kotlin
val result = Wildlinks.matchDeferredToken(
  "https://apilink.wilderbots.com",
  "<32-char-token>"
)
```

## App Store attribution token

The Android package exposes the same provider claim API for shared codebases:

```kotlin
val result = Wildlinks.matchInstallAttributionToken(
  "https://apilink.wilderbots.com",
  "wl_<token-from-provider>"
)
```
