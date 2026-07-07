import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:wildlinks_flutter_sdk/wildlinks_flutter_sdk.dart';

void main() {
  tearDown(() {
    WildlinksSdk.reset();
  });

  test('handleIncomingUri resolves matching domain via backend', () async {
    final mockClient = MockClient((request) async {
      expect(request.url.path, '/api/v1/resolve');
      expect(request.url.queryParameters['domain'], 'go.yourbrand.com');
      expect(request.url.queryParameters['slug'], 'promo');
      expect(request.url.queryParameters['platform'], isNotNull);

      return http.Response(
        jsonEncode({
          'matched': true,
          'title': 'Promo',
          'destinationUrl': 'https://example.com/promo',
          'defaultUrl': 'https://example.com/promo',
          'shortUrl': 'https://go.yourbrand.com/promo',
          'clickCount': 0,
          'isActive': true,
          'deepLinkPayload': {'screen': 'offer', 'offerId': 'spring24'},
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    WildlinksSdk.init(const WildlinksConfig(
      baseUrl: 'https://api.yourservice.in',
      domains: ['go.yourbrand.com'],
    ));
    WildlinksSdk.setHttpClient(mockClient);

    final resolved = await WildlinksSdk.handleIncomingUri(Uri.parse('https://go.yourbrand.com/promo'));

    expect(resolved.matched, isTrue);
    expect(resolved.deepLinkPayload, {'screen': 'offer', 'offerId': 'spring24'});
    expect(resolved.destinationUrl, 'https://example.com/promo');
  });

  test('createLink sends API key header and returns LinkModel', () async {
    final mockClient = MockClient((request) async {
      expect(request.url.path, '/api/v1/links');
      expect(request.headers['authorization'], 'ApiKey dlk_xxx');
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      expect(body['defaultUrl'], 'https://example.com/promo');
      expect(body['title'], 'Launch Offer');
      expect(body['deepLinkPayload'], {'screen': 'offer', 'offerId': 'spring24'});

      return http.Response(
        jsonEncode({
          '_id': 'link_123',
          'slug': 'promo',
          'title': 'Launch Offer',
          'defaultUrl': 'https://example.com/promo',
          'shortUrl': 'https://go.yourbrand.com/promo',
          'clickCount': 0,
          'isActive': true,
          'deepLinkPayload': {'screen': 'offer', 'offerId': 'spring24'},
        }),
        201,
        headers: {'content-type': 'application/json'},
      );
    });

    WildlinksSdk.init(const WildlinksConfig(
      baseUrl: 'https://api.yourservice.in',
      domains: ['go.yourbrand.com'],
      apiKey: 'dlk_xxx',
    ));
    WildlinksSdk.setHttpClient(mockClient);

    final result = await WildlinksSdk.createLink(
      defaultUrl: 'https://example.com/promo',
      title: 'Launch Offer',
      deepLinkPayload: {'screen': 'offer', 'offerId': 'spring24'},
    );

    expect(result.id, 'link_123');
    expect(result.shortUrl, 'https://go.yourbrand.com/promo');
    expect(result.deepLinkPayload, {'screen': 'offer', 'offerId': 'spring24'});
  });
}
