# WildLinks Flutter SDK

Flutter SDK for the WildLinks smart link platform: resolves Universal Links / App
Links when your app is already installed, and recovers deferred deep link intent
on first launch after a fresh install.

> **Run `flutter pub get` and `dart analyze` before publishing.**
> The package API and docs are prepared, but your local Flutter toolchain should
> still verify the final package state before you ship it to pub.dev.

## Install

Add to `pubspec.yaml`:

```yaml
dependencies:
  wildlinks_flutter_sdk:
    path: ../wildlinks_flutter_sdk   # or git/pub source once you publish it
  app_links: ^6.0.0
  http: ^1.2.0
```

Then:

```bash
flutter pub get
```

## Publishing to pub.dev

This package now has the files pub.dev requires: `LICENSE` (MIT), `CHANGELOG.md`,
and an `example/` app. Before you publish:

1. Replace the placeholder GitHub URLs in `pubspec.yaml` (`homepage`,
   `repository`, `issue_tracker`) if you move this package into its own public repo.
2. Double-check the `topics:` list in `pubspec.yaml` against pub.dev's
   [current allowed topics](https://pub.dev/create-package/topics) — it
   validates against a fixed list and will reject unrecognized ones.
3. Run, in this exact order:
   ```bash
   flutter pub get
   dart analyze
   dart pub publish --dry-run
   ```
   Fix anything the dry-run flags, then `dart pub publish` for real.
4. Confirm the package name `wildlinks_flutter_sdk` is still free on pub.dev —
   names are first-come, first-served.

## Native setup (required — this package doesn't replace it)

- **iOS**: enable *Associated Domains* capability in Xcode, add
  `applinks:go.yourbrand.com` matching the `appId` configured for that domain in
  the dashboard's Domains page.
- **Android**: add an `<intent-filter android:autoVerify="true">` for
  `go.yourbrand.com` in `AndroidManifest.xml`, matching the `packageName` +
  `sha256CertFingerprints` configured in the dashboard.

Both of those dashboard entries are what make `/.well-known/apple-app-site-association`
and `/.well-known/assetlinks.json` serve correctly for your domain — the OS checks
those files to decide whether to hand your app the link at all.

## Usage

```dart
import 'package:wildlinks_flutter_sdk/wildlinks_flutter_sdk.dart';

void main() {
  WildlinksSdk.init(const WildlinksConfig(
    baseUrl: 'https://apilink.wilderbots.com',
    domains: ['go.wilderbots.com'],
  ));
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final _listener = WildlinksListener();

  @override
  void initState() {
    super.initState();
    _listener.stream.listen((resolved) {
      if (resolved.matched && resolved.deepLinkPayload != null) {
        // e.g. {'screen': 'offer', 'offerId': 'diwali24'}
        Navigator.of(context).pushNamed(
          resolved.deepLinkPayload!['screen'] as String,
          arguments: resolved.deepLinkPayload,
        );
      }
    });
    _listener.start();
  }

  @override
  void dispose() {
    _listener.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => const MaterialApp(home: HomeScreen());
}
```

## Create links from your app

```dart
import 'package:wildlinks_flutter_sdk/wildlinks_flutter_sdk.dart';

void main() {
  WildlinksSdk.init(const WildlinksConfig(
    baseUrl: 'https://apilink.wilderbots.com',
    domains: ['go.wilderbots.com'],
    apiKey: 'dlk_xxx',
  ));
  runApp(const MyApp());
}

Future<void> createAndShareLink() async {
  final link = await WildlinksSdk.createDeepLink(
    defaultUrl: 'https://yourwebsite.com/promo',
    title: 'Spring sale',
    deepLinkPayload: {'screen': 'offer', 'offerId': 'spring24'},
  );

  print('Link created: ${link.shortUrl}');
  // Share link.shortUrl using your platform's share UI.
}
```

and call `WildlinksSdk.matchDeferredToken(baseUrl, token)` directly. iOS has no
public equivalent — clipboard is the standard approach there.
