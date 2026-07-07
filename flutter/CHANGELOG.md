# Changelog

## 1.0.4

- Support app-specific prefixed links such as `/x4I9/slug`.
- Add `appProfileId` to link-creation examples and package docs.

## 1.0.3

- Clarify the README examples for links with and without `deepLinkPayload`.

## 1.0.2

- Fix the install instructions so apps only add `wildlinks_flutter_sdk`.

## 1.0.1

- Clean up the public README for pub.dev.
- Update package documentation to use the published `wildlinks_flutter_sdk` dependency.

## 1.0.0

- Initial release.
- `WildlinksSdk.handleIncomingUri` — resolve a Universal Link / App Link when the app is already installed.
- `WildlinksSdk.checkDeferredInstall` / `matchDeferredToken` — deferred deep link matching after a fresh install.
- `WildlinksListener` — stream-based wrapper around `app_links` that wires the two together automatically.
