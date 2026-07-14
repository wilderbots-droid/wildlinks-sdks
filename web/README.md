# WildLinks Web SDK

Two things live in this package:

1. **`WildlinksClient`** — a server-side client (Node/Next.js API routes/serverless
   functions) for creating and managing smart links. Uses your API key — never ship
   this into a browser bundle.
2. **`checkDeferredMatch` / `resolveLink`** — browser-safe helpers with no secrets,
   safe to bundle into a client-side app.

The SDK also understands both public link shapes:

- `https://yourdomain.com/slug`
- `https://yourdomain.com/x4I9/slug`

## Install

```bash
npm install @wilderbots/wildlinks-sdk
```

## Server-side: create a short URL

```ts
import { WildlinksClient } from '@wilderbots/wildlinks-sdk';

const wildlinks = new WildlinksClient({
  apiKey: process.env.DEEPLINK_API_KEY!,
  baseUrl: 'https://apilink.wilderbots.com',
});

const shortUrl = await wildlinks.createShortLink({
  defaultUrl: 'https://clientbrand.com/diwali-sale',
});

console.log(shortUrl); // https://go.wilderbots.com/diwali-sale
```

Use `createShortLink()` when you want a plain short URL that redirects to a long
URL. This does not add app-routing metadata by itself.

## Server-side: create a smart deep link

```ts
const link = await wildlinks.createDeepLink({
  defaultUrl: 'https://clientbrand.com/diwali-sale',
  appProfileId: 'app_profile_123',
  deepLinkPayload: { screen: 'offer', offerId: 'diwali24' },
  utm: { source: 'newsletter', medium: 'email', campaign: 'diwali24' },
});

console.log(link.shortUrl); // https://go.wilderbots.com/x4I9/diwali-sale
```

Pass `appProfileId` when the link should use a specific app profile's branding,
mobile settings, and optional per-app path prefix. Use `createDeepLink()` (or
`createLink()`) when the link should carry app-open behavior or deep-link
payloads.

If you need to create smart links from a browser-based app, do so through your
own backend or serverless API route so the API key stays secret. For example,
create a route that calls `WildlinksClient.createShortLink()` or
`WildlinksClient.createDeepLink()` and return the generated `shortUrl` to the
browser.

## Client-side: pick up a deferred deep link on your website

If someone tapped a smart link, didn't have your app installed, and landed on your
website instead (or a companion web experience), you can recover what they were
trying to reach:

```ts
import { checkDeferredMatch } from '@wilderbots/wildlinks-sdk';

useEffect(() => {
  checkDeferredMatch('https://apilink.wilderbots.com').then((result) => {
    if (result.matched) {
      // e.g. { screen: 'offer', offerId: 'diwali24' }
      console.log(result.deepLinkPayload);
    }
  });
}, []);
```

## Building from source

```bash
npm install
npm run build   # outputs dist/index.js (CJS), dist/index.mjs (ESM), dist/index.d.ts
```
