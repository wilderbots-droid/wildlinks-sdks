export { init as initWildlinks, handleIncomingUrl as handleWildlinksUrl, checkDeferredInstall as checkWildlinksInstall, createDeepLink as createWildlink } from './linking';
export {
  init,
  handleIncomingUrl,
  checkDeferredInstall,
  matchDeferredToken,
  matchInstallAttributionToken,
  createLink,
  createShortLink,
  createDeepLink,
  trackEvent,
} from './linking';
export type { WildlinksConfig, ResolvedLink, CreateLinkInput, LinkResponse, RoutingRuleInput, UTMParams, MarketingParams, LeadCaptureConfig, RetargetingPixel, CtaOverlayConfig, TrackEventInput, TrackEventResponse } from './linking';
export { useWildlinks } from './useWildlinks';
