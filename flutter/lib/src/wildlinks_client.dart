import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart' show Clipboard;
import 'package:http/http.dart' as http;

import 'models.dart';

/// Configuration for [WildlinksSdk]. Call [WildlinksSdk.init] once at app startup,
/// before you check for incoming links or a deferred install match.
class WildlinksConfig {
  final String baseUrl; // e.g. "https://api.yourservice.in"
  final List<String> domains; // hostnames this app owns, e.g. ["go.yourbrand.com"]
  final String? apiKey; // API key for creating smart links from the app

  const WildlinksConfig({required this.baseUrl, required this.domains, this.apiKey});
}

/// Entry point for the WildLinks Flutter SDK. All methods are static so you can
/// call them from anywhere in your app after [init] has run once.
class WildlinksSdk {
  WildlinksSdk._();

  static WildlinksConfig? _config;
  static http.Client _httpClient = http.Client();

  static void init(WildlinksConfig config) {
    _config = config;
  }

  static void setHttpClient(http.Client client) {
    _httpClient = client;
  }

  static void reset() {
    _config = null;
    _httpClient = http.Client();
  }

  static WildlinksConfig _requireConfig() {
    final cfg = _config;
    if (cfg == null) {
      throw StateError(
        'WildlinksSdk not initialized - call WildlinksSdk.init(WildlinksConfig(...)) once at app startup',
      );
    }
    return cfg;
  }

  static String _platformName() {
    if (kIsWeb) return 'other';
    try {
      if (Platform.isIOS) return 'ios';
      if (Platform.isAndroid) return 'android';
    } catch (_) {
      // Platform.isIOS/isAndroid can throw on unsupported platforms (e.g. some test harnesses)
    }
    return 'other';
  }

  /// Call this with any [Uri] your app receives via a Universal Link (iOS) or
  /// App Link (Android) - typically from an `app_links` stream subscription.
  /// Returns `ResolvedLink(matched: false)` for any URI that isn't one of your
  /// configured smart-link domains; fall through to your normal URI handling
  /// in that case.
  static Future<ResolvedLink> handleIncomingUri(Uri uri) async {
    final cfg = _requireConfig();

    if (!cfg.domains.contains(uri.host)) {
      return ResolvedLink.notMatched();
    }

    final slug = uri.pathSegments.isNotEmpty ? uri.pathSegments.last : '';
    if (slug.isEmpty) {
      return ResolvedLink.notMatched('No slug in URI');
    }

    final query = {
      'domain': uri.host,
      'slug': slug,
      'platform': _platformName(),
      if (uri.queryParameters['pw'] != null) 'password': uri.queryParameters['pw']!,
    };

    final resolveUri = Uri.parse('${_trimTrailingSlash(cfg.baseUrl)}/api/v1/resolve')
        .replace(queryParameters: query);

    try {
      final res = await _httpClient.get(resolveUri);
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode != 200) {
        return ResolvedLink.notMatched(body['error'] as String? ?? 'Resolve failed (${res.statusCode})');
      }
      return ResolvedLink.fromJson(body);
    } catch (err) {
      return ResolvedLink.notMatched(err.toString());
    }
  }

  /// Call once on app startup (before your first route renders) to check whether
  /// this install originated from a smart link tap. Relies on a matchToken having
  /// been placed on the clipboard by the platform's web interstitial page - a
  /// standard low-friction deferred deep linking technique that needs no native
  /// install-referrer integration. For higher-accuracy Android matching, read the
  /// Play Install Referrer string in native code instead and call
  /// [matchDeferredToken] directly with the extracted token.
  static Future<ResolvedLink> checkDeferredInstall() async {
    final cfg = _requireConfig();

    String? clipboardText;
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      clipboardText = data?.text;
    } catch (err) {
      return ResolvedLink.notMatched('Clipboard read failed: $err');
    }

    if (clipboardText == null) return ResolvedLink.notMatched();

    final match = RegExp(r'dl_match_token=([a-f0-9]{32})').firstMatch(clipboardText);
    if (match == null) return ResolvedLink.notMatched();

    return matchDeferredToken(cfg.baseUrl, match.group(1)!);
  }

  /// Directly match a deferred deep link token obtained some other way
  /// (e.g. from an Android Install Referrer native channel call).
  static Future<ResolvedLink> matchDeferredToken(String baseUrl, String matchToken) async {
    final uri = Uri.parse('${_trimTrailingSlash(baseUrl)}/api/v1/match');
    try {
      final res = await _httpClient.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'matchToken': matchToken}),
      );
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final matched = body['matched'] == true;
      return matched ? ResolvedLink.fromJson(body) : ResolvedLink.notMatched(body['error'] as String?);
    } catch (err) {
      return ResolvedLink.notMatched(err.toString());
    }
  }

  /// Create a new smart link on the service and return the full link object.
  /// Requires [apiKey] in [WildlinksConfig].
  static Future<LinkModel> createLink({
    required String defaultUrl,
    String? domainId,
    String? slug,
    String? title,
    Map<String, dynamic>? deepLinkPayload,
    Map<String, String>? utm,
    String? password,
    String? expiresAt,
    int? maxClicks,
    List<String>? tags,
  }) async {
    final cfg = _requireConfig();
    if (cfg.apiKey == null || cfg.apiKey!.isEmpty) {
      throw StateError('API key is required to create links. Pass apiKey to WildlinksConfig.');
    }

    final uri = Uri.parse('${_trimTrailingSlash(cfg.baseUrl)}/api/v1/links');
    final body = {
      'defaultUrl': defaultUrl,
      if (domainId != null) 'domainId': domainId,
      if (slug != null) 'slug': slug,
      if (title != null) 'title': title,
      if (deepLinkPayload != null) 'deepLinkPayload': deepLinkPayload,
      if (utm != null) 'utm': utm,
      if (password != null) 'password': password,
      if (expiresAt != null) 'expiresAt': expiresAt,
      if (maxClicks != null) 'maxClicks': maxClicks,
      if (tags != null) 'tags': tags,
    };

    final res = await _httpClient.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'ApiKey ${cfg.apiKey}',
      },
      body: jsonEncode(body),
    );

    final responseBody = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 201) {
      final error = responseBody['error'] as String? ?? 'Failed to create link (${res.statusCode})';
      throw Exception(error);
    }
    return LinkModel.fromJson(responseBody);
  }

  /// Create a smart deep link and return the generated short URL.
  static Future<String> createShortLink(String defaultUrl, {String? domainId, String? slug}) async {
    final result = await createLink(defaultUrl: defaultUrl, domainId: domainId, slug: slug);
    return result.shortUrl;
  }

  /// Create a deep link using a URL and optional metadata. This is a convenience
  /// wrapper around [createLink].
  static Future<LinkModel> createDeepLink({
    required String defaultUrl,
    String? domainId,
    String? slug,
    String? title,
    Map<String, dynamic>? deepLinkPayload,
  }) async {
    return createLink(
      defaultUrl: defaultUrl,
      domainId: domainId,
      slug: slug,
      title: title,
      deepLinkPayload: deepLinkPayload,
    );
  }

  static String _trimTrailingSlash(String url) => url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}
