export interface MatchResult {
  matched: boolean;
  deepLinkPayload?: Record<string, unknown>;
  destinationUrl?: string;
  error?: string;
}

const STORAGE_KEY = 'dl_match_token';

/**
 * Call this once when your web app boots (e.g. inside a PWA, or a companion web
 * experience for an app you're promoting). If the visitor arrived via the
 * platform's app-open interstitial page, a matchToken was stashed in
 * localStorage before they were sent to the store — this retrieves whatever
 * deep link payload was intended for them, so you can show contextual content
 * even on the web ("continue where you left off") before they get the app.
 */
export async function checkDeferredMatch(baseUrl: string): Promise<MatchResult> {
  let matchToken: string | null = null;
  try {
    matchToken = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { matched: false, error: 'localStorage unavailable' };
  }

  if (!matchToken) return { matched: false };

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchToken }),
    });
    const body = await res.json();
    if (res.ok && body.matched) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* non-fatal */
      }
    }
    return body as MatchResult;
  } catch (err) {
    return { matched: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Manually resolve a smart link's destination/payload without following the redirect -
 * useful if you're building your own custom interstitial or want to preview a link's
 * routing outcome client-side. `platform` should be one of 'ios' | 'android' | 'desktop' | 'other'.
 */
export async function resolveLink(
  baseUrl: string,
  params: { domain: string; slug: string; platform?: string; password?: string }
): Promise<{ title?: string; destinationUrl: string; deepLinkPayload: Record<string, unknown> }> {
  const query = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/resolve?${query.toString()}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `Resolve failed (${res.status})`);
  return body;
}
