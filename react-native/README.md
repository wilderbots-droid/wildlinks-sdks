# WildLinks React Native SDK

Handles two paths a smart link tap can take once your app exists:

1. **App already installed** — the OS hands your app the URL directly (Universal
   Links on iOS, App Links on Android). This SDK resolves what that URL means.
2. **App not installed yet** — user gets sent to the store, installs, and opens the
   app for the first time. This SDK checks whether that install came from a smart
   link tap (clipboard-based deferred matching) and gets back the original intent.

It also supports app-specific prefixed URLs such as
`https://link.valueshift.in/x4I9/launch-offer` when multiple apps share one branded
domain.

## Install

```bash
npm install @wilderbots/wildlinks-react-native
npm install @react-native-clipboard/clipboard   # optional, only needed for deferred matching
```

## Native setup (required — this SDK doesn't replace it)

Universal Links / App Links are OS-level features; you still need to configure them
natively so the OS knows to hand your app URLs from your domain, so Anthropic isn't
duplicating what React Navigation's own linking docs cover:

- **iOS**: add your domain under *Associated Domains* capability as
  `applinks:go.yourbrand.com`, matching the `appId` you configured for that domain
  in the dashboard's Domains page (which serves `apple-app-site-association`).
- **Android**: add an `<intent-filter>` with `android:autoVerify="true"` for
  `go.yourbrand.com` in your `AndroidManifest.xml`, matching the `packageName` +
  `sha256CertFingerprints` you configured in the dashboard (which serves
  `assetlinks.json`).

## Usage

```tsx
import { initWildlinks, useWildlinks } from '@wilderbots/wildlinks-react-native';

// Once, at app startup (e.g. top of App.tsx, outside the component)
initWildlinks({
  baseUrl: 'https://apilink.wilderbots.com',
  domains: ['go.wilderbots.com'],
  apiKey: 'dlk_xxx',
});

function App() {
  const { resolved, loading } = useWildlinks();

  useEffect(() => {
    if (resolved?.matched && resolved.deepLinkPayload) {
      // e.g. { screen: 'offer', offerId: 'diwali24' }
      navigation.navigate(resolved.deepLinkPayload.screen, resolved.deepLinkPayload);
    }
  }, [resolved]);

  // ... your navigator
}
```

## Create links from your app

```ts
import { createWildlink } from '@wilderbots/wildlinks-react-native';

const link = await createWildlink({
  defaultUrl: 'https://example.com/promo',
  title: 'Launch Offer',
  appProfileId: 'app_profile_123',
  deepLinkPayload: { screen: 'offer', offerId: 'spring24' },
});

console.log(link.shortUrl);
// https://go.wilderbots.com/x4I9/launch-offer
```

Use `createLink` for the full created link object, `createShortLink` to return only
`shortUrl`, or `createWildlink` as a convenience wrapper. Pass `appProfileId` when
the link should be generated for a specific app profile from the WildLinks dashboard.

Or call the lower-level functions directly if you're not using the hook:

```ts
import { handleWildlinksUrl, checkWildlinksInstall } from '@wilderbots/wildlinks-react-native';

const result = await handleWildlinksUrl('https://go.wilderbots.com/diwali-sale');
// { matched: true, destinationUrl: '...', deepLinkPayload: {...} }
```

That lower-level helper also works with prefixed URLs:

```ts
const result = await handleWildlinksUrl('https://go.wilderbots.com/x4I9/diwali-sale');
```

## Improving deferred-match accuracy on Android

Clipboard matching works but is a fallback. For production Android traffic, wire up
the [Play Install Referrer API](https://developer.android.com/google/play/installreferrer)
in a small native module: have the web interstitial append
`&dl_match_token=<token>` as an install referrer parameter on the Play Store link
instead of relying on clipboard, then on first launch read the referrer string and
call `matchDeferredToken(baseUrl, token)` directly. iOS has no equivalent public
API — clipboard is the standard technique there (Branch/AppsFlyer use the same
approach under the hood for iOS deferred matching).

## Building from source

```bash
npm install
npm run build
```
