import 'package:flutter/material.dart';
import 'package:deeplink_flutter_sdk/deeplink_flutter_sdk.dart';

void main() {
  // Call this once, before runApp. Replace with your own API base URL and the
  // branded domain(s) you configured in the Deeplink dashboard's Domains page.
  DeeplinkSdk.init(const DeeplinkConfig(
    baseUrl: 'https://api.yourservice.in',
    domains: ['go.yourbrand.com'],
  ));

  runApp(const ExampleApp());
}

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Deeplink SDK Example',
      theme: ThemeData(colorSchemeSeed: const Color(0xFFF5A623), useMaterial3: true),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final DeeplinkListener _listener = DeeplinkListener();
  ResolvedLink? _lastResolved;
  String _status = 'Waiting for a smart link…';

  @override
  void initState() {
    super.initState();

    // Fires whenever an incoming Universal Link/App Link is resolved, or when a
    // deferred install match is found on first launch.
    _listener.stream.listen((resolved) {
      setState(() {
        _lastResolved = resolved;
        _status = resolved.matched ? 'Matched a smart link!' : 'No match (${resolved.error ?? 'n/a'})';
      });

      if (resolved.matched && resolved.deepLinkPayload != null) {
        // In a real app, route based on the payload, e.g.:
        // Navigator.of(context).pushNamed(resolved.deepLinkPayload!['screen'] as String);
        debugPrint('Deep link payload: ${resolved.deepLinkPayload}');
      }
    });

    _listener.start();
  }

  @override
  void dispose() {
    _listener.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Deeplink SDK Example')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_status, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              if (_lastResolved != null) ...[
                Text('Destination: ${_lastResolved!.destinationUrl ?? '—'}'),
                const SizedBox(height: 8),
                Text('Payload: ${_lastResolved!.deepLinkPayload ?? '—'}'),
              ],
              const SizedBox(height: 32),
              const Text(
                'Tap a smart link from the Deeplink dashboard (or paste a matchToken '
                'onto your clipboard, formatted as dl_match_token=<token>) to see it resolved here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
