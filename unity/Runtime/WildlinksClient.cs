using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Networking;

namespace Wilderbots.Wildlinks
{
    public static class WildlinksClient
    {
        private static readonly Regex MatchTokenRegex = new Regex("^[a-f0-9]{32}$", RegexOptions.IgnoreCase);
        private static readonly Regex ClipboardTokenRegex = new Regex("dl_match_token=([a-f0-9]{32})", RegexOptions.IgnoreCase);
        private static WildlinksConfig _config;

        public static void Init(WildlinksConfig config)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));
            _config = config;
        }

        public static IEnumerator HandleIncomingUrl(string url, Action<WildlinksResolvedLink> callback)
        {
            var cfg = RequireConfig();
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            {
                callback?.Invoke(NotMatched("Not a valid URL"));
                yield break;
            }

            var token = GetQueryValue(uri.Query, "dl_match_token");
            if (!string.IsNullOrEmpty(token) && MatchTokenRegex.IsMatch(token))
            {
                WildlinksResolvedLink deferred = null;
                yield return MatchDeferredToken(cfg.BaseUrl, token, result => deferred = result);
                if (deferred != null && deferred.matched)
                {
                    callback?.Invoke(deferred);
                    yield break;
                }
            }

            if (!cfg.Domains.Contains(uri.Host))
            {
                callback?.Invoke(new WildlinksResolvedLink { matched = false });
                yield break;
            }

            var segments = uri.AbsolutePath.Trim('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0)
            {
                callback?.Invoke(NotMatched("No slug in URL"));
                yield break;
            }

            var slug = segments[segments.Length - 1];
            var query = new Dictionary<string, string>
            {
                { "domain", uri.Host },
                { "slug", slug },
                { "platform", PlatformName() }
            };
            if (segments.Length > 1)
            {
                query["pathPrefix"] = "/" + string.Join("/", Subarray(segments, 0, segments.Length - 1)) + "/";
            }
            var password = GetQueryValue(uri.Query, "pw");
            if (!string.IsNullOrEmpty(password)) query["password"] = password;
            if (!string.IsNullOrEmpty(Application.systemLanguage.ToString())) query["language"] = Application.systemLanguage.ToString();
            query["osVersion"] = SystemInfo.operatingSystem;

            var endpoint = TrimSlash(cfg.BaseUrl) + "/api/v1/resolve?" + BuildQuery(query);
            yield return SendGet<WildlinksResolvedLink>(endpoint, null, result =>
            {
                if (result != null && string.IsNullOrEmpty(result.error)) result.matched = true;
                callback?.Invoke(result);
            });
        }

        public static IEnumerator CheckDeferredInstall(Action<WildlinksResolvedLink> callback)
        {
            var cfg = RequireConfig();
            var text = GUIUtility.systemCopyBuffer;
            var match = string.IsNullOrEmpty(text) ? null : ClipboardTokenRegex.Match(text);
            if (match == null || !match.Success)
            {
                callback?.Invoke(new WildlinksResolvedLink { matched = false });
                yield break;
            }
            yield return MatchDeferredToken(cfg.BaseUrl, match.Groups[1].Value, callback);
        }

        public static IEnumerator MatchDeferredToken(string baseUrl, string matchToken, Action<WildlinksResolvedLink> callback)
        {
            var body = "{\"matchToken\":" + Quote(matchToken) + "}";
            yield return SendPost<WildlinksResolvedLink>(TrimSlash(baseUrl) + "/api/v1/match", body, null, callback);
        }

        public static IEnumerator MatchInstallAttributionToken(string baseUrl, string installAttributionToken, Action<WildlinksResolvedLink> callback, string provider = "app-store-campaign-token")
        {
            var body = "{\"installAttributionToken\":" + Quote(installAttributionToken) + ",\"provider\":" + Quote(provider) + "}";
            yield return SendPost<WildlinksResolvedLink>(TrimSlash(baseUrl) + "/api/v1/match/install-attribution", body, null, callback);
        }

        public static IEnumerator CreateLink(WildlinksCreateLinkRequest request, Action<WildlinksLinkResponse> callback)
        {
            var cfg = RequireConfig();
            RequireApiKey(cfg);
            yield return SendPost<WildlinksLinkResponse>(TrimSlash(cfg.BaseUrl) + "/api/v1/links", ToJson(request), cfg.ApiKey, callback);
        }

        public static IEnumerator CreateDeepLink(WildlinksCreateLinkRequest request, Action<WildlinksLinkResponse> callback)
        {
            yield return CreateLink(request, callback);
        }

        public static IEnumerator CreateShortLink(WildlinksCreateLinkRequest request, Action<string, string> callback)
        {
            request.preferShortDomain = true;
            yield return CreateLink(request, result => callback?.Invoke(result?.shortUrl, result?.error));
        }

        public static IEnumerator GetLink(string linkId, Action<WildlinksLinkResponse> callback)
        {
            var cfg = RequireConfig();
            RequireApiKey(cfg);
            yield return SendGet<WildlinksLinkResponse>(TrimSlash(cfg.BaseUrl) + "/api/v1/links/" + Escape(linkId), cfg.ApiKey, callback);
        }

        public static IEnumerator GetQrCode(string linkId, Action<WildlinksQrCodeResponse> callback, string format = "png")
        {
            var cfg = RequireConfig();
            RequireApiKey(cfg);
            var url = TrimSlash(cfg.BaseUrl) + "/api/v1/links/" + Escape(linkId) + "/qrcode?format=" + Escape(format);
            yield return SendGet<WildlinksQrCodeResponse>(url, cfg.ApiKey, callback);
        }

        public static IEnumerator TrackEvent(WildlinksTrackEventRequest request, Action<WildlinksEventResponse> callback)
        {
            var cfg = RequireConfig();
            RequireApiKey(cfg);
            yield return SendPost<WildlinksEventResponse>(TrimSlash(cfg.BaseUrl) + "/api/v1/events", ToJson(request), cfg.ApiKey, callback);
        }

        private static IEnumerator SendGet<T>(string url, string apiKey, Action<T> callback) where T : class, new()
        {
            using (var web = UnityWebRequest.Get(url))
            {
                if (!string.IsNullOrEmpty(apiKey)) web.SetRequestHeader("Authorization", "ApiKey " + apiKey);
                yield return web.SendWebRequest();
                callback?.Invoke(ParseResponse<T>(web));
            }
        }

        private static IEnumerator SendPost<T>(string url, string body, string apiKey, Action<T> callback) where T : class, new()
        {
            using (var web = new UnityWebRequest(url, "POST"))
            {
                web.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body ?? "{}"));
                web.downloadHandler = new DownloadHandlerBuffer();
                web.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(apiKey)) web.SetRequestHeader("Authorization", "ApiKey " + apiKey);
                yield return web.SendWebRequest();
                callback?.Invoke(ParseResponse<T>(web));
            }
        }

        private static T ParseResponse<T>(UnityWebRequest web) where T : class, new()
        {
            var body = web.downloadHandler == null ? "" : web.downloadHandler.text;
            T parsed = null;
            try
            {
                parsed = string.IsNullOrEmpty(body) ? new T() : JsonUtility.FromJson<T>(body);
            }
            catch
            {
                parsed = new T();
            }

            if (parsed is WildlinksResolvedLink resolved)
            {
                resolved.deepLinkPayloadJson = ExtractJsonField(body, "deepLinkPayload");
            }
            if (web.result == UnityWebRequest.Result.Success) return parsed;
            var error = ExtractError(body);
            var field = typeof(T).GetField("error");
            if (field != null) field.SetValue(parsed, string.IsNullOrEmpty(error) ? web.error : error);
            return parsed;
        }

        private static WildlinksResolvedLink NotMatched(string error)
        {
            return new WildlinksResolvedLink { matched = false, error = error };
        }

        private static WildlinksConfig RequireConfig()
        {
            if (_config == null) throw new InvalidOperationException("WildlinksClient is not initialized. Call WildlinksClient.Init(...) once at app startup.");
            return _config;
        }

        private static void RequireApiKey(WildlinksConfig cfg)
        {
            if (string.IsNullOrEmpty(cfg.ApiKey)) throw new InvalidOperationException("API key is required. Pass ApiKey in WildlinksConfig for link creation and event tracking.");
        }

        private static string ToJson(WildlinksCreateLinkRequest request)
        {
            var json = new JsonBuilder();
            json.Add("defaultUrl", request.defaultUrl);
            json.Add("domainId", request.domainId);
            json.Add("appProfileId", request.appProfileId);
            json.Add("pathPrefix", request.pathPrefix);
            json.Add("slug", request.slug);
            json.Add("title", request.title);
            json.AddRaw("rules", request.rulesJson);
            json.AddRaw("splitTargets", request.splitTargetsJson);
            json.AddRaw("deepLinkPayload", request.deepLinkPayloadJson);
            json.AddRaw("utm", UtmJson(request.utm));
            json.AddRaw("marketing", MarketingJson(request.marketing));
            json.AddRaw("leadCapture", request.leadCaptureJson);
            json.AddRaw("retargetingPixels", request.retargetingPixelsJson);
            json.AddRaw("ctaOverlay", request.ctaOverlayJson);
            json.Add("password", request.password);
            json.Add("startsAt", request.startsAt);
            json.Add("expiresAt", request.expiresAt);
            json.Add("maxClicks", request.maxClicks);
            json.AddArray("tags", request.tags);
            if (request.preferShortDomain) json.Add("preferShortDomain", true);
            return json.ToString();
        }

        private static string ToJson(WildlinksTrackEventRequest request)
        {
            var json = new JsonBuilder();
            json.Add("name", request.name);
            json.Add("linkId", request.linkId);
            json.Add("visitorId", request.visitorId);
            json.Add("value", request.value);
            json.Add("currency", request.currency);
            json.AddRaw("metadata", request.metadataJson);
            json.Add("occurredAt", request.occurredAt);
            return json.ToString();
        }

        private static string UtmJson(WildlinksUtm utm)
        {
            if (utm == null) return null;
            var json = new JsonBuilder();
            json.Add("source", utm.source);
            json.Add("medium", utm.medium);
            json.Add("campaign", utm.campaign);
            json.Add("term", utm.term);
            json.Add("content", utm.content);
            return json.IsEmpty ? null : json.ToString();
        }

        private static string MarketingJson(WildlinksMarketing marketing)
        {
            if (marketing == null) return null;
            var json = new JsonBuilder();
            json.Add("referralCode", marketing.referralCode);
            json.Add("affiliateId", marketing.affiliateId);
            json.Add("couponCode", marketing.couponCode);
            json.Add("promoCode", marketing.promoCode);
            json.Add("appendToDestination", marketing.appendToDestination);
            return json.ToString();
        }

        private static string ExtractJsonField(string body, string fieldName)
        {
            if (string.IsNullOrEmpty(body)) return null;
            var marker = Quote(fieldName) + ":";
            var start = body.IndexOf(marker, StringComparison.Ordinal);
            if (start < 0) return null;
            start += marker.Length;
            while (start < body.Length && char.IsWhiteSpace(body[start])) start++;
            if (start >= body.Length) return null;

            if (body[start] != '{' && body[start] != '[') return null;
            var stack = new Stack<char>();
            var inString = false;
            var escaped = false;
            for (var i = start; i < body.Length; i++)
            {
                var c = body[i];
                if (escaped)
                {
                    escaped = false;
                    continue;
                }
                if (c == '\\')
                {
                    escaped = true;
                    continue;
                }
                if (c == '"')
                {
                    inString = !inString;
                    continue;
                }
                if (inString) continue;
                if (c == '{') stack.Push('}');
                else if (c == '[') stack.Push(']');
                else if ((c == '}' || c == ']') && stack.Count > 0)
                {
                    if (stack.Pop() != c) return null;
                    if (stack.Count == 0) return body.Substring(start, i - start + 1);
                }
            }
            return null;
        }

        private static string BuildQuery(Dictionary<string, string> query)
        {
            var parts = new List<string>();
            foreach (var pair in query)
            {
                if (!string.IsNullOrEmpty(pair.Value)) parts.Add(Escape(pair.Key) + "=" + Escape(pair.Value));
            }
            return string.Join("&", parts);
        }

        private static string GetQueryValue(string query, string key)
        {
            if (string.IsNullOrEmpty(query)) return null;
            var trimmed = query.TrimStart('?');
            foreach (var part in trimmed.Split('&'))
            {
                var pieces = part.Split(new[] { '=' }, 2);
                if (pieces.Length > 0 && Uri.UnescapeDataString(pieces[0]) == key)
                {
                    return pieces.Length > 1 ? Uri.UnescapeDataString(pieces[1]) : "";
                }
            }
            return null;
        }

        private static string ExtractError(string body)
        {
            if (string.IsNullOrEmpty(body)) return null;
            var match = Regex.Match(body, "\"error\"\\s*:\\s*\"([^\"]+)\"");
            return match.Success ? match.Groups[1].Value : null;
        }

        private static string[] Subarray(string[] input, int start, int count)
        {
            var output = new string[count];
            Array.Copy(input, start, output, 0, count);
            return output;
        }

        private static string PlatformName()
        {
            if (Application.platform == RuntimePlatform.IPhonePlayer) return "ios";
            if (Application.platform == RuntimePlatform.Android) return "android";
            return "other";
        }

        private static string TrimSlash(string url)
        {
            return string.IsNullOrEmpty(url) ? "" : url.TrimEnd('/');
        }

        private static string Escape(string value)
        {
            return Uri.EscapeDataString(value ?? "");
        }

        private static string Quote(string value)
        {
            return "\"" + (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
        }

        private sealed class JsonBuilder
        {
            private readonly StringBuilder _builder = new StringBuilder("{");
            private bool _hasFields;
            public bool IsEmpty => !_hasFields;

            public void Add(string key, string value)
            {
                if (string.IsNullOrEmpty(value)) return;
                Next(key);
                _builder.Append(Quote(value));
            }

            public void Add(string key, int? value)
            {
                if (!value.HasValue) return;
                Next(key);
                _builder.Append(value.Value);
            }

            public void Add(string key, double? value)
            {
                if (!value.HasValue) return;
                Next(key);
                _builder.Append(value.Value.ToString(System.Globalization.CultureInfo.InvariantCulture));
            }

            public void Add(string key, bool value)
            {
                Next(key);
                _builder.Append(value ? "true" : "false");
            }

            public void AddRaw(string key, string rawJson)
            {
                if (string.IsNullOrWhiteSpace(rawJson)) return;
                Next(key);
                _builder.Append(rawJson);
            }

            public void AddArray(string key, List<string> values)
            {
                if (values == null || values.Count == 0) return;
                Next(key);
                _builder.Append("[");
                for (var i = 0; i < values.Count; i++)
                {
                    if (i > 0) _builder.Append(",");
                    _builder.Append(Quote(values[i]));
                }
                _builder.Append("]");
            }

            public override string ToString()
            {
                return _builder.ToString() + "}";
            }

            private void Next(string key)
            {
                if (_hasFields) _builder.Append(",");
                _hasFields = true;
                _builder.Append(Quote(key)).Append(":");
            }
        }
    }
}
