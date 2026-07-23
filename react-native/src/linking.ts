export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface MarketingParams {
  referralCode?: string;
  affiliateId?: string;
  couponCode?: string;
  promoCode?: string;
  appendToDestination?: boolean;
}

export interface LeadCaptureConfig {
  enabled?: boolean;
  title?: string;
  description?: string;
  fields?: { name?: boolean; email?: boolean; phone?: boolean; company?: boolean };
  requireConsent?: boolean;
  consentText?: string;
  submitButtonLabel?: string;
}

export interface RetargetingPixel {
  provider: 'meta' | 'google' | 'custom';
  pixelId?: string;
  eventName?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface CtaOverlayConfig {
  enabled?: boolean;
  position?: 'top' | 'bottom';
  title?: string;
  message?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  dismissible?: boolean;
}

export interface RoutingRuleInput {
  priority: number;
  conditions: {
    platform?: ('ios' | 'android' | 'desktop' | 'other')[];
    deviceTypes?: string[];
    browsers?: string[];
    deviceVendors?: string[];
    deviceModels?: string[];
    countries?: string[];
    regions?: string[];
    cities?: string[];
    languages?: string[];
    minOsVersion?: string;
    maxOsVersion?: string;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
  };
  destinationUrl: string;
}

export interface CreateLinkInput {
  domainId?: string;
  appProfileId?: string;
  pathPrefix?: string;
  slug?: string;
  title?: string;
  defaultUrl: string;
  rules?: RoutingRuleInput[];
  deepLinkPayload?: Record<string, unknown>;
  utm?: UTMParams;
  marketing?: MarketingParams;
  leadCapture?: LeadCaptureConfig;
  retargetingPixels?: RetargetingPixel[];
  ctaOverlay?: CtaOverlayConfig;
  password?: string;
  startsAt?: string;
  expiresAt?: string;
  maxClicks?: number;
  tags?: string[];
  preferShortDomain?: boolean;
}

export interface LinkResponse {
  _id: string;
  slug: string;
  title?: string;
  defaultUrl: string;
  shortUrl: string;
  clickCount: number;
  isActive: boolean;
  marketing?: MarketingParams;
  leadCapture?: LeadCaptureConfig;
  retargetingPixels?: RetargetingPixel[];
  ctaOverlay?: CtaOverlayConfig;
  startsAt?: string | null;
  expiresAt?: string | null;
}

export interface TrackEventInput {
  name: string;
  linkId?: string;
  visitorId?: string;
  value?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface TrackEventResponse {
  id: string;
  name: string;
  linkId?: string;
  occurredAt: string;
}

export interface WildlinksConfig {
  baseUrl: string; // e.g. "https://api.yourservice.in"
  domains: string[]; // hostnames this app should treat as its own smart links, e.g. ["go.myapp.com"]
  apiKey?: string;
}

export interface ResolvedLink {
  matched: boolean;
  installId?: string;
  openId?: string;
  title?: string;
  destinationUrl?: string;
  deepLinkPayload?: Record<string, unknown>;
  installAttributionProvider?: string | null;
  error?: string;
}

let config: WildlinksConfig | null = null;

export function init(cfg: WildlinksConfig) {
  config = cfg;
}

function requireConfig(): WildlinksConfig {
  if (!config) {
    throw new Error('WildLinks SDK not initialized - call init({ baseUrl, domains }) once at app startup');
  }
  return config;
}

function requireApiKey(cfg: WildlinksConfig): string {
  if (!cfg.apiKey) {
    throw new Error('API key is required to create links. Pass apiKey to init({ baseUrl, domains, apiKey }) once at app startup');
  }
  return cfg.apiKey;
}

async function apiRequest<T>(path: string, body: unknown): Promise<T> {
  const cfg = requireConfig();
  const apiKey = requireApiKey(cfg);

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseBody = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(responseBody?.error || `WildLinks API request failed (${res.status})`);
  }
  return responseBody as T;
}

function getPlatform(): 'ios' | 'android' | 'other' {
  try {
    // Lazily required so this file has no hard compile-time dependency on react-native's
    // Platform module ordering during bundling in non-RN test environments.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'other';
  } catch {
    return 'other';
  }
}

function getOsVersion(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    return Platform.Version != null ? String(Platform.Version) : null;
  } catch {
    return null;
  }
}

/**
 * Call this with any URL your app receives via a Universal Link (iOS) or App Link (Android) -
 * typically from `Linking.addEventListener('url', ...)` or `Linking.getInitialURL()` on cold
 * start. If the URL's hostname matches one of your configured smart-link domains, this resolves
 * it against the platform and returns the deep link payload so you can route the user directly.
 * Returns `{ matched: false }` for any URL that isn't one of your smart links (e.g. a plain
 * external link) - callers should fall through to their normal URL handling in that case.
 */
export async function handleIncomingUrl(url: string): Promise<ResolvedLink> {
  const cfg = requireConfig();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { matched: false, error: 'Not a valid URL' };
  }

  const deferredToken = parsed.searchParams.get('dl_match_token');
  if (deferredToken && /^[a-f0-9]{32}$/.test(deferredToken)) {
    const deferredMatch = await matchDeferredToken(cfg.baseUrl, deferredToken);
    if (deferredMatch.matched) return deferredMatch;
  }

  if (!cfg.domains.includes(parsed.hostname)) {
    return { matched: false };
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const slug = segments.length ? segments[segments.length - 1] : '';
  if (!slug) return { matched: false, error: 'No slug in URL' };
  const pathPrefix = segments.length > 1 ? `/${segments.slice(0, -1).join('/')}/` : null;

  const platform = getPlatform();
  const query = new URLSearchParams({ domain: parsed.hostname, slug, platform });
  const osVersion = getOsVersion();
  if (osVersion) query.set('osVersion', osVersion);
  const language = parsed.searchParams.get('language') || parsed.searchParams.get('lang');
  if (language) query.set('language', language);
  if (pathPrefix) query.set('pathPrefix', pathPrefix);
  const password = parsed.searchParams.get('pw');
  if (password) query.set('password', password);

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/v1/resolve?${query.toString()}`);
    const body = await res.json();
    if (!res.ok) return { matched: false, error: body?.error || `Resolve failed (${res.status})` };
    return { matched: true, ...body };
  } catch (err) {
    return { matched: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Call once on app startup (ideally before your navigation container mounts) to check whether
 * this install originated from a smart link the user tapped before the app was installed.
 *
 * This relies on a matchToken having been placed on the clipboard by the web interstitial page
 * (a common, low-friction technique for deferred deep linking without a native install-referrer
 * integration). For higher-accuracy Android matching, wire up the Play Install Referrer API in
 * native code instead and pass the extracted token to `matchDeferredToken` directly - see the
 * README for the referrer string format to look for.
 */
export async function checkDeferredInstall(): Promise<ResolvedLink> {
  const cfg = requireConfig();

  let clipboardText: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Clipboard = require('@react-native-clipboard/clipboard').default;
    clipboardText = await Clipboard.getString();
  } catch {
    return { matched: false, error: 'Clipboard module not available - install @react-native-clipboard/clipboard' };
  }

  const tokenMatch = clipboardText?.match(/dl_match_token=([a-f0-9]{32})/);
  if (!tokenMatch) return { matched: false };

  return matchDeferredToken(cfg.baseUrl, tokenMatch[1]);
}

/**
 * Directly match a deferred deep link token you've obtained some other way
 * (e.g. from an Android Install Referrer native module, or a custom onboarding flow).
 */
export async function matchDeferredToken(baseUrl: string, matchToken: string): Promise<ResolvedLink> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchToken }),
    });
    const body = await res.json();
    return { matched: !!body.matched, ...body };
  } catch (err) {
    return { matched: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Match a deferred install using an attribution campaign token from an iOS/App Store
 * provider callback. Pass either the raw 32-char token or the App Store campaign
 * value shaped as `wl_<token>`.
 */
export async function matchInstallAttributionToken(
  baseUrl: string,
  installAttributionToken: string,
  provider = 'app-store-campaign-token'
): Promise<ResolvedLink> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/match/install-attribution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installAttributionToken, provider }),
    });
    const body = await res.json();
    return { matched: !!body.matched, ...body };
  } catch (err) {
    return { matched: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function createLink(input: CreateLinkInput): Promise<LinkResponse> {
  return apiRequest<LinkResponse>('/api/v1/links', input);
}

export async function createShortLink(input: {
  defaultUrl: string;
  domainId?: string;
  appProfileId?: string;
  pathPrefix?: string;
  slug?: string;
}): Promise<string> {
  const link = await createLink({
    ...input,
    preferShortDomain: true,
  });
  return link.shortUrl;
}

export async function createDeepLink(input: CreateLinkInput): Promise<LinkResponse> {
  return createLink(input);
}

export async function trackEvent(input: TrackEventInput): Promise<TrackEventResponse> {
  return apiRequest<TrackEventResponse>('/api/v1/events', input);
}
