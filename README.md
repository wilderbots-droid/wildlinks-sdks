# WildLinks SDKs

Three packages, one platform. Pick what matches your stack:

| Package | For | Verified |
|---|---|---|
| `web/` — `@wilderbots/wildlinks-sdk` | Node/Next.js backends, browser-side web apps | ✅ tsc + tsup build both pass |
| `react-native/` — `@wilderbots/wildlinks-react-native` | React Native apps | ✅ tsc + tsup build both pass |
| `flutter/` — `wildlinks_flutter_sdk` | Flutter apps | ⚠️ run `flutter pub get` + `dart analyze` before publishing |

All three talk to the same two backend endpoints for the interesting part
(deep linking, not link management):

- `GET /api/v1/resolve` — "the OS just handed my app this URL, what does it mean?"
  (app already installed — the common path)
- `POST /api/v1/match` — "this is a fresh install, was it from a smart link tap?"
  (deferred deep linking — the app-not-installed-yet path)

All SDKs now understand both link shapes:

- `https://yourdomain.com/slug`
- `https://yourdomain.com/x4I9/slug`

For prefixed links, the SDKs treat the last path segment as the slug and pass the
rest back to the backend as `pathPrefix`, so app-specific routing keeps working when
multiple apps share one branded domain.

Both are public (no API key) since they're called from inside a consumer's own
app/browser, not a trusted backend. Link *creation* (`POST /api/v1/links`) does
require an API key — that's the `WildlinksClient` in the web SDK, meant for
server-side use only. Link creation can also include `appProfileId` when you want
the generated URL to use a specific app's branding and path prefix.

See each package's own README for install + usage.
