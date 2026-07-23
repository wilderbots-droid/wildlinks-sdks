# WildLinks Flutter SDK

Flutter SDK for the WildLinks smart link platform: resolves Universal Links / App
Links when your app is already installed, supports app-specific prefixed links like
`/x4I9/slug`, and recovers deferred deep link intent on first launch after a fresh
install.

## Install

Add to `pubspec.yaml`:

```yaml
dependencies:
  wildlinks_flutter_sdk: ^1.0.6
```

Then:

```bash
flutter pub get
```

## Native setup (required — this package doesn't replace it)

- **iOS**: enable *Associated Domains* capability in Xcode, add
  `applinks:go.yourbrand.com` matching the `appId` configured for that domain in
  the dashboard's Domains page.
- **Android**: add an `<intent-filter android:autoVerify="true">` for
  `go.yourbrand.com` in `AndroidManifest.xml`, matching the `packageName` +
  `sha256CertFingerprints` configured in the dashboard.

The App Store URL is mainly the fallback when the app is not installed.
Installed-build Universal Link behavior depends on the Associated Domains
entitlement, matching app ID, and a valid AASA file.

Both of those dashboard entries are what make `/.well-known/apple-app-site-association`
and `/.well-known/assetlinks.json` serve correctly for your domain — the OS checks
those files to decide whether to hand your app the link at all.

If your org uses multiple apps on the same branded domain, WildLinks can generate
prefixed links such as `https://link.valueshift.in/x4I9/launch-offer`. The Flutter
SDK handles those automatically; you do not need to parse the prefix yourself.

## Quick start

Initialize the SDK once near app startup, then start listening for inbound
link resolutions.

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
      if (!resolved.matched) return;

      // Works for every matched link, even when no app payload was attached.
      print('Destination URL: ${resolved.destinationUrl}');
      print('Open ID: ${resolved.openId}');

      // Optional app-specific routing metadata, only present if you created
      // the link with deepLinkPayload.
      if (resolved.deepLinkPayload != null) {
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

`deepLinkPayload` is optional. If you create a normal smart link without app
metadata, `resolved.deepLinkPayload` will be `null` and you can just use
`resolved.destinationUrl`.

## Create a plain short link

Use this when you only need a short URL that redirects to a destination URL.

```dart
final shortUrl = await WildlinksSdk.createShortLink(
  'https://yourwebsite.com/promo',
);

print(shortUrl);
```

## Create smart deep links from your app

Use `deepLinkPayload` only when your app needs extra routing data.

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
    pathPrefix: 'x4I9',
    deepLinkPayload: {'screen': 'offer', 'offerId': 'spring24'},
  );

  print('Link created: ${link.shortUrl}');
  // Share link.shortUrl using your platform's share UI.
}
```

Use `pathPrefix` when the app should create links under a specific namespace like
`https://link.valueshift.in/x4I9/launch-offer`. The backend resolves the matching
app profile from that prefix on the selected domain.

## App Store install attribution

For iOS App Store fallback, WilderLinks appends `ct=wl_<token>` to App Store URLs.
If your attribution provider or custom first-launch flow returns that campaign
token, exchange it for the original deferred payload:

```dart
final result = await WildlinksSdk.matchInstallAttributionToken(
  'https://apilink.wilderbots.com',
  'wl_<token-from-provider>',
  provider: 'app-store-campaign-token',
);
```

Matched app opens are recorded in WilderLinks analytics. When the backend creates
an open record, `ResolvedLink.openId` is populated.
