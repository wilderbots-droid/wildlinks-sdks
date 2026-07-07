# WildLinks Web SDK

Two things live in this package:

1. **`WildlinksClient`** — a server-side client (Node/Next.js API routes/serverless
   functions) for creating and managing smart links. Uses your API key — never ship
   this into a browser bundle.
2. **`checkDeferredMatch` / `resolveLink`** — browser-safe helpers with no secrets,
   safe to bundle into a client-side app.

## Install

```bash
npm install @wilderbots/wildlinks-sdk
```

## Server-side: create a link

```ts
import { WildlinksClient } from '@wilderbots/wildlinks-sdk';

const wildlinks = new WildlinksClient({
  apiKey: process.env.DEEPLINK_API_KEY!,
  baseUrl: 'https://apilink.wilderbots.com',
});

const link = await wildlinks.createLink({
  defaultUrl: 'https://clientbrand.com/diwali-sale',
  deepLinkPayload: { screen: 'offer', offerId: 'diwali24' },
  utm: { source: 'newsletter', medium: 'email', campaign: 'diwali24' },
});

console.log(link.shortUrl); // https://go.wilderbots.com/diwali-sale
```

If you need to create smart links from a browser-based app, do so through your
own backend or serverless API route so the API key stays secret. For example,
create a route that calls `WildlinksClient.createLink()` and return the generated
`shortUrl` to the browser.

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
