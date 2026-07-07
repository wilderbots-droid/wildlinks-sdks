import 'dart:async';

import 'package:app_links/app_links.dart';

import 'deeplink_client.dart';
import 'models.dart';

/// Convenience wrapper around the `app_links` package that automatically resolves
/// every incoming Universal Link / App Link against the Deeplink API, and checks
/// for a deferred install match on first use if the app was launched cold with no
/// link at all.
///
/// Usage:
/// ```dart
/// final listener = DeeplinkListener();
/// listener.stream.listen((resolved) {
///   if (resolved.matched) {
///     // navigate using resolved.deepLinkPayload
///   }
/// });
/// await listener.start();
/// ```
class DeeplinkListener {
  final AppLinks _appLinks = AppLinks();
  final StreamController<ResolvedLink> _controller = StreamController<ResolvedLink>.broadcast();
  StreamSubscription<Uri>? _subscription;
  bool _checkedDeferred = false;

  Stream<ResolvedLink> get stream => _controller.stream;

  /// Call once, after [DeeplinkSdk.init]. Checks the initial link (cold start),
  /// falls back to a deferred-install check if there wasn't one, then subscribes
  /// to further links tapped while the app is running.
  Future<void> start() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        final resolved = await DeeplinkSdk.handleIncomingUri(initialUri);
        if (resolved.matched) _controller.add(resolved);
      } else if (!_checkedDeferred) {
        _checkedDeferred = true;
        final deferred = await DeeplinkSdk.checkDeferredInstall();
        if (deferred.matched) _controller.add(deferred);
      }
    } catch (err) {
      _controller.add(ResolvedLink.notMatched(err.toString()));
    }

    _subscription = _appLinks.uriLinkStream.listen((uri) async {
      final resolved = await DeeplinkSdk.handleIncomingUri(uri);
      if (resolved.matched) _controller.add(resolved);
    });
  }

  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}
