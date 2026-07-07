# Changelog

## 1.0.1

- Clean up the public README for pub.dev.
- Update package documentation to use the published `wildlinks_flutter_sdk` dependency.

## 1.0.0

- Initial release.
- `WildlinksSdk.handleIncomingUri` — resolve a Universal Link / App Link when the app is already installed.
- `WildlinksSdk.checkDeferredInstall` / `matchDeferredToken` — deferred deep link matching after a fresh install.
- `WildlinksListener` — stream-based wrapper around `app_links` that wires the two together automatically.
