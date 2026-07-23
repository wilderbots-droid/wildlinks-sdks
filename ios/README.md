# WilderLinks iOS SDK

Native Swift Package for resolving WilderLinks Universal Links and claiming
deferred install matches.

## Install

Add this folder as a Swift Package dependency, or publish it from the SDK repo:

```swift
.package(url: "https://github.com/wilderbots-droid/wildlinks-sdks.git", from: "1.0.0")
```

## Initialize

```swift
let client = WildlinksClient(
  config: WildlinksConfig(
    baseURL: URL(string: "https://apilink.wilderbots.com")!,
    domains: ["go.yourbrand.com"]
  )
)
```

## Resolve a Universal Link

```swift
let result = await client.handleIncomingURL(url)
if result.matched {
  // result.deepLinkPayload contains the original campaign payload.
  // result.openId is present when WilderLinks tracked this app open.
}
```

## Deferred install match

If your app receives a `dl_match_token`, exchange it directly:

```swift
let result = await client.matchDeferredToken("<32-char-token>")
```

For App Store attribution, WilderLinks appends `ct=wl_<token>` to App Store
fallback URLs. If your attribution provider or first-launch flow returns that
campaign token, exchange it with:

```swift
let result = await client.matchInstallAttributionToken("wl_<token-from-provider>")
```
