# WilderLinks SDKs

Beta SDKs for resolving WilderLinks smart links, claiming deferred install
matches, and creating links from trusted runtimes.

Seven packages, one platform. Pick what matches your stack:

| Package | For | Verified |
|---|---|---|
| `web/` — `@wilderbots/wildlinks-sdk` | Node/Next.js backends, browser-side web apps | ✅ tsc + tsup build both pass |
| `react-native/` — `@wilderbots/wildlinks-react-native` | React Native apps | ✅ tsc + tsup build both pass |
| `flutter/` — `wildlinks_flutter_sdk` | Flutter apps | ⚠️ run `flutter pub get` + `dart analyze` before publishing |
| `android/` — `com.wilderbots.wildlinks` | Native Android/Kotlin apps | ⚠️ Gradle wrapper not included; compile with Gradle/Android Studio |
| `ios/` — `WildlinksSDK` | Native iOS/Swift apps | ✅ `swift test` passes |
| `unity/` — `com.wilderbots.wildlinks` | Unity games and apps | ⚠️ validate inside Unity Package Manager before publishing |
| `cli/` — `@wilderbots/wildlinks-cli` | Terminal and CI link management | ✅ node syntax + help smoke pass |

All SDKs talk to the same backend endpoints for the interesting part
(deep linking, not link management):

- `GET /api/v1/resolve` — "the OS just handed my app this URL, what does it mean?"
  (app already installed — the common path)
- `POST /api/v1/match` — "this is a fresh install, was it from a smart link tap?"
  (deferred deep linking — the app-not-installed-yet path)
- `POST /api/v1/match/install-attribution` — "an install attribution provider
  returned the App Store campaign token; recover the original payload"

Matched app opens are tracked by the API, and SDK result models expose optional
`openId` when the backend creates a first-class open record.

All SDKs now understand both link shapes:

- `https://yourdomain.com/slug`
- `https://yourdomain.com/x4I9/slug`

For prefixed links, the SDKs treat the last path segment as the slug and pass the
rest back to the backend as `pathPrefix`, so app-specific routing keeps working when
multiple apps share one branded domain.

Both are public (no API key) since they're called from inside a consumer's own
app/browser, not a trusted backend. Link *creation* (`POST /api/v1/links`) does
require an API key — that's the `WildlinksClient` in the web SDK, meant for
server-side use only. Link creation can include `pathPrefix` when you want the
generated URL to use a specific app namespace on a shared domain.

See each package's own README for install + usage.

## Current Platform Coverage

The beta platform behind these SDKs includes direct/deferred deep links,
Universal Links, Android App Links, multi-app path prefixes, smart fallbacks,
preview testing, QR-to-link flows, click/install/open analytics, custom events,
webhooks, REST API, CLI support, and AI-assisted campaign diagnostics.

Extras such as browser extensions, Figma, Zapier, n8n, App Clips, Instant Apps,
NFC, heatmaps, and session replay are future backlog items.
