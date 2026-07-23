# WilderLink CLI

Command-line tools for managing WilderLink links from a terminal or CI job.

## Install

```bash
npm install -g @wilderbots/wildlinks-cli
```

For local development in this repo:

```bash
node bin/wildlinks.js --help
```

## Configure

```bash
wl login --api-base https://api.yourdomain.com --email you@example.com --password '<password>'
wl config get
```

You can also use environment variables instead of the config file:

```bash
WILDLINKS_API_BASE=https://api.yourdomain.com
WILDLINKS_TOKEN=<dashboard-jwt>
WILDLINKS_ORG_ID=<organization-id>
WILDLINKS_API_KEY=<server-api-key>
```

## Commands

```bash
wl orgs
wl links list --limit 10
wl links get <link-id>
wl links create --url https://example.com/app --title "Launch" --utm-source instagram --utm-medium social --utm-campaign launch
wl qr <link-id> --format png --out launch-qr.png --logo
wl utm generate --url https://example.com/app --title "Summer Launch" --source instagram --content hero-a
```

The CLI targets the WilderLinks beta API, including link management, QR export,
and AI-assisted UTM generation. SDK/mobile open tracking appears in analytics as
first-class open records.

When `WILDLINKS_ORG_ID` or a logged-in organization is available, link commands use
the authenticated organization API. Without an organization, `links create`,
`links get`, and `qr` can fall back to the external API-key routes.
