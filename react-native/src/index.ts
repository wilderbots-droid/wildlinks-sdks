export { init as initWildlinks, handleIncomingUrl as handleWildlinksUrl, checkDeferredInstall as checkWildlinksInstall, createDeepLink as createWildlink } from './linking';
export { init, handleIncomingUrl, checkDeferredInstall, matchDeferredToken, createLink, createShortLink, createDeepLink } from './linking';
export type { WildlinksConfig, ResolvedLink, CreateLinkInput, LinkResponse, RoutingRuleInput, UTMParams } from './linking';
export { useWildlinks } from './useWildlinks';
