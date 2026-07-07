export interface DeeplinkClientOptions {
  apiKey: string;
  baseUrl: string; // e.g. "https://api.yourservice.in"
}

export interface RoutingRuleInput {
  priority: number;
  conditions: {
    platform?: ('ios' | 'android' | 'desktop' | 'other')[];
    countries?: string[];
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
  };
  destinationUrl: string;
}

export interface CreateLinkInput {
  domainId?: string;
  slug?: string;
  title?: string;
  defaultUrl: string;
  rules?: RoutingRuleInput[];
  deepLinkPayload?: Record<string, unknown>;
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  password?: string;
  expiresAt?: string;
  maxClicks?: number;
  tags?: string[];
}

export interface LinkResponse {
  _id: string;
  slug: string;
  title?: string;
  defaultUrl: string;
  shortUrl: string;
  clickCount: number;
  isActive: boolean;
}

/**
 * Server-side client for the Deeplink platform. Use this from your backend or build
 * scripts to create/manage links — never ship your API key into a browser bundle or
 * mobile app binary.
 */
export class DeeplinkClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: DeeplinkClientOptions) {
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
      throw new Error(body?.error || `Deeplink API request failed (${res.status})`);
    }
    return body as T;
  }

  createLink(input: CreateLinkInput): Promise<LinkResponse> {
    return this.request<LinkResponse>('/api/v1/links', { method: 'POST', body: JSON.stringify(input) });
  }

  getLink(linkId: string): Promise<LinkResponse> {
    return this.request<LinkResponse>(`/api/v1/links/${linkId}`);
  }

  getQrCode(linkId: string, format: 'png' | 'svg' = 'png'): Promise<{ shortUrl: string; qrCodeDataUrl?: string }> {
    return this.request(`/api/v1/links/${linkId}/qrcode?format=${format}`);
  }
}
