/// The outcome of resolving or matching a smart link.
class ResolvedLink {
  final bool matched;
  final String? title;
  final String? destinationUrl;
  final Map<String, dynamic>? deepLinkPayload;
  final String? error;

  const ResolvedLink({
    required this.matched,
    this.title,
    this.destinationUrl,
    this.deepLinkPayload,
    this.error,
  });

  factory ResolvedLink.notMatched([String? error]) =>
      ResolvedLink(matched: false, error: error);

  factory ResolvedLink.fromJson(Map<String, dynamic> json, {bool matched = true}) {
    return ResolvedLink(
      matched: matched,
      title: json['title'] as String?,
      destinationUrl: json['destinationUrl'] as String?,
      deepLinkPayload: (json['deepLinkPayload'] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  String toString() =>
      'ResolvedLink(matched: $matched, destinationUrl: $destinationUrl, deepLinkPayload: $deepLinkPayload, error: $error)';
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
  final String? password;
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
    this.password,
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
      deepLinkPayload: (json['deepLinkPayload'] as Map?)?.cast<String, dynamic>(),
      password: json['password'] as String?,
      expiresAt: json['expiresAt'] as String?,
      maxClicks: json['maxClicks'] as int?,
      tags: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      domain: (json['domain'] as Map?)?.cast<String, dynamic>(),
      rules: (json['rules'] as List?)
              ?.map((item) => (item as Map).cast<String, dynamic>())
              .toList() ??
          [],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
    );
  }

  @override
  String toString() =>
      'LinkModel(id: $id, slug: $slug, shortUrl: $shortUrl, defaultUrl: $defaultUrl, isActive: $isActive, clickCount: $clickCount)';
}
