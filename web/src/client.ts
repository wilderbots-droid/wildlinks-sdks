export interface WildlinksClientOptions {
  apiKey: string;
  baseUrl: string; // e.g. "https://api.yourservice.in"
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
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  marketing?: {
    referralCode?: string;
    affiliateId?: string;
    couponCode?: string;
    promoCode?: string;
    appendToDestination?: boolean;
  };
  leadCapture?: {
    enabled?: boolean;
    title?: string;
    description?: string;
    fields?: { name?: boolean; email?: boolean; phone?: boolean; company?: boolean };
    requireConsent?: boolean;
    consentText?: string;
    submitButtonLabel?: string;
  };
  retargetingPixels?: {
    provider: 'meta' | 'google' | 'custom';
    pixelId?: string;
    eventName?: string;
    imageUrl?: string;
    isActive?: boolean;
  }[];
  ctaOverlay?: {
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
  };
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
  marketing?: CreateLinkInput['marketing'];
  leadCapture?: CreateLinkInput['leadCapture'];
  retargetingPixels?: CreateLinkInput['retargetingPixels'];
  ctaOverlay?: CreateLinkInput['ctaOverlay'];
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

/**
 * Server-side client for the WildLinks platform. Use this from your backend or build
 * scripts to create/manage links — never ship your API key into a browser bundle or
 * mobile app binary.
 */
export class WildlinksClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: WildlinksClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${this.apiKey}`,
        ...init.headers,
      },
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error || `WildLinks API request failed (${res.status})`);
    }
    return body as T;
  }

  createLink(input: CreateLinkInput): Promise<LinkResponse> {
    return this.request<LinkResponse>('/api/v1/links', { method: 'POST', body: JSON.stringify(input) });
  }

  createShortLink(input: {
    defaultUrl: string;
    domainId?: string;
    appProfileId?: string;
    pathPrefix?: string;
    slug?: string;
  }): Promise<string> {
    return this.createLink({
      ...input,
      preferShortDomain: true,
    }).then((link) => link.shortUrl);
  }

  createDeepLink(input: CreateLinkInput): Promise<LinkResponse> {
    return this.createLink(input);
  }

  getLink(linkId: string): Promise<LinkResponse> {
    return this.request<LinkResponse>(`/api/v1/links/${linkId}`);
  }

  getQrCode(linkId: string, format: 'png' | 'svg' = 'png'): Promise<{ shortUrl: string; qrCodeDataUrl?: string }> {
    return this.request(`/api/v1/links/${linkId}/qrcode?format=${format}`);
  }

  trackEvent(input: TrackEventInput): Promise<{ id: string; name: string; linkId?: string; occurredAt: string }> {
    return this.request('/api/v1/events', { method: 'POST', body: JSON.stringify(input) });
  }
}
