# Wildlinks Unity SDK

Unity Package Manager package for resolving WilderLink URLs and sending custom
events from Unity games and apps.

## Install

Add this package from a Git URL in Unity Package Manager:

```text
https://github.com/wilderbots-droid/wildlinks-sdks.git?path=/unity
```

Or copy the `unity/` folder into your project's `Packages/` directory.

## Initialize

```csharp
using Wilderbots.Wildlinks;

WildlinksClient.Init(new WildlinksConfig(
    baseUrl: "https://api.yourservice.in",
    domains: new[] { "go.yourbrand.com" },
    apiKey: "dlk_xxx"
));
```

Only trusted builds should include an API key. For consumer mobile games, prefer
creating links from your backend and use the Unity SDK only for resolve/match.

## Resolve an incoming deep link

Call this when your app receives a Universal Link or Android App Link.

```csharp
StartCoroutine(WildlinksClient.HandleIncomingUrl(url, result =>
{
    if (!result.matched) return;
    Debug.Log(result.openId);
    Debug.Log(result.destinationUrl);
    Debug.Log(result.deepLinkPayloadJson);
}));
```

## Check deferred install

```csharp
StartCoroutine(WildlinksClient.CheckDeferredInstall(result =>
{
    if (result.matched)
    {
        Debug.Log(result.deepLinkPayloadJson);
    }
}));
```

For higher-accuracy Android deferred matching, read the Play Install Referrer in
native code and pass the extracted `dl_match_token` to `MatchDeferredToken`.

## Create a link

```csharp
var request = new WildlinksCreateLinkRequest
{
    defaultUrl = "https://example.com/promo",
    title = "Launch Offer",
    deepLinkPayloadJson = "{\"screen\":\"offer\",\"offerId\":\"spring24\"}",
    ctaOverlayJson = "{\"enabled\":true,\"title\":\"Bonus\",\"buttonUrl\":\"https://example.com/bonus\"}",
    utm = new WildlinksUtm
    {
        source = "unity",
        medium = "game",
        campaign = "spring24"
    }
};

StartCoroutine(WildlinksClient.CreateLink(request, link =>
{
    if (!string.IsNullOrEmpty(link.error))
    {
        Debug.LogError(link.error);
        return;
    }
    Debug.Log(link.shortUrl);
}));
```

## Track an event

```csharp
StartCoroutine(WildlinksClient.TrackEvent(new WildlinksTrackEventRequest
{
    name = "level_complete",
    linkId = "link_id",
    value = 1,
    metadataJson = "{\"level\":3}"
}, result =>
{
    if (!string.IsNullOrEmpty(result.error)) Debug.LogError(result.error);
}));
```
