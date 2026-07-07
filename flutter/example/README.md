# wildlinks_flutter_sdk example

Minimal Flutter app showing `WildlinksSdk` + `WildlinksListener` end to end.

```bash
cd example
flutter pub get
flutter run
```

Before running, edit `lib/main.dart` and set `baseUrl` to your deployed backend
and `domains` to the branded domain(s) you configured in the dashboard.

To actually test deep link resolution without a real device link tap, you can
manually copy a string like `dl_match_token=<32-char-hex-token>` onto your
clipboard (matching a real `matchToken` from a `Click` record in your database),
then hot-restart the app — `checkDeferredInstall` will pick it up.
