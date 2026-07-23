/// The outcome of resolving or matching a smart link.
class ResolvedLink {
  final bool matched;
  final String? installId;
  final String? openId;
  final String? title;
  final String? destinationUrl;
  final Map<String, dynamic>? deepLinkPayload;
  final String? installAttributionProvider;
  final String? error;

  const ResolvedLink({
    required this.matched,
    this.installId,
    this.openId,
    this.title,
    this.destinationUrl,
    this.deepLinkPayload,
    this.installAttributionProvider,
    this.error,
  });

  factory ResolvedLink.notMatched([String? error]) =>
      ResolvedLink(matched: false, error: error);

  factory ResolvedLink.fromJson(Map<String, dynamic> json,
      {bool matched = true}) {
    return ResolvedLink(
      matched: matched,
      installId: json['installId'] as String?,
      openId: json['openId'] as String?,
      title: json['title'] as String?,
      destinationUrl: json['destinationUrl'] as String?,
      deepLinkPayload: _asStringDynamicMap(json['deepLinkPayload']),
      installAttributionProvider: json['installAttributionProvider'] as String?,
    );
  }

  @override
  String toString() =>
      'ResolvedLink(matched: $matched, installId: $installId, openId: $openId, destinationUrl: $destinationUrl, deepLinkPayload: $deepLinkPayload, installAttributionProvider: $installAttributionProvider, error: $error)';
}

/// A smart link created or fetched from the backend service.
class LinkModel {
  final String id;
  final String slug;
  final String? title;
  final String defaultUrl;
  final String shortUrl;
  final bool isActive;
  final int clickCount;
  final Map<String, dynamic>? deepLinkPayload;
  final Map<String, dynamic>? marketing;
  final Map<String, dynamic>? leadCapture;
  final List<Map<String, dynamic>> retargetingPixels;
  final Map<String, dynamic>? ctaOverlay;
  final String? password;
  final String? startsAt;
  final String? expiresAt;
  final int? maxClicks;
  final List<String> tags;
  final Map<String, dynamic>? domain;
  final List<Map<String, dynamic>> rules;
  final DateTime? createdAt;

  const LinkModel({
    required this.id,
    required this.slug,
    this.title,
    required this.defaultUrl,
    required this.shortUrl,
    required this.isActive,
    required this.clickCount,
    this.deepLinkPayload,
    this.marketing,
    this.leadCapture,
    this.retargetingPixels = const [],
    this.ctaOverlay,
    this.password,
    this.startsAt,
    this.expiresAt,
    this.maxClicks,
    this.tags = const [],
    this.domain,
    this.rules = const [],
    this.createdAt,
  });

  factory LinkModel.fromJson(Map<String, dynamic> json) {
    return LinkModel(
      id: json['_id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String?,
      defaultUrl: json['defaultUrl'] as String,
      shortUrl: json['shortUrl'] as String,
      isActive: json['isActive'] as bool? ?? true,
      clickCount: json['clickCount'] as int? ?? 0,
      deepLinkPayload: _asStringDynamicMap(json['deepLinkPayload']),
      marketing: _asStringDynamicMap(json['marketing']),
      leadCapture: _asStringDynamicMap(json['leadCapture']),
      retargetingPixels: (json['retargetingPixels'] as List?)
              ?.whereType<Map>()
              .map((item) => item.cast<String, dynamic>())
              .toList() ??
          [],
      ctaOverlay: _asStringDynamicMap(json['ctaOverlay']),
      password: json['password'] as String?,
      startsAt: json['startsAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
      maxClicks: json['maxClicks'] as int?,
      tags: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      domain: _asStringDynamicMap(json['domain']),
      rules: (json['rules'] as List?)
              ?.whereType<Map>()
              .map((item) => item.cast<String, dynamic>())
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  @override
  String toString() =>
      'LinkModel(id: $id, slug: $slug, shortUrl: $shortUrl, defaultUrl: $defaultUrl, isActive: $isActive, clickCount: $clickCount)';
}

/// The backend response after tracking a custom event.
class TrackEventResult {
  final String id;
  final String name;
  final String? linkId;
  final DateTime? occurredAt;

  const TrackEventResult({
    required this.id,
    required this.name,
    this.linkId,
    this.occurredAt,
  });

  factory TrackEventResult.fromJson(Map<String, dynamic> json) {
    return TrackEventResult(
      id: json['id'].toString(),
      name: json['name'] as String,
      linkId: json['linkId']?.toString(),
      occurredAt: json['occurredAt'] != null
          ? DateTime.tryParse(json['occurredAt'].toString())
          : null,
    );
  }
}

Map<String, dynamic>? _asStringDynamicMap(Object? value) {
  if (value is Map) return value.cast<String, dynamic>();
  return null;
}
