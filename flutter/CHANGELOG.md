# Changelog

## 1.0.0

- Initial release.
- `DeeplinkSdk.handleIncomingUri` — resolve a Universal Link / App Link when the app is already installed.
- `DeeplinkSdk.checkDeferredInstall` / `matchDeferredToken` — deferred deep link matching after a fresh install.
- `DeeplinkListener` — stream-based wrapper around `app_links` that wires the two together automatically.
