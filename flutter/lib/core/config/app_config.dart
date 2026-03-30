import 'package:flutter/services.dart';

class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.assetBaseUrl,
    required this.useMockData,
    required this.googleServerClientId,
  });

  static const String _defaultApiBaseUrl = 'http://192.168.123.5:8080';

  static Future<AppConfig> load() async {
    final env = await _loadDotEnv();

    const apiBaseUrlOverride = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: '',
    );
    const assetBaseUrlOverride = String.fromEnvironment(
      'ASSET_BASE_URL',
      defaultValue: '',
    );
    const useMockDataOverride = String.fromEnvironment(
      'USE_MOCK_DATA',
      defaultValue: '',
    );
    const googleServerClientIdOverride = String.fromEnvironment(
      'GOOGLE_SERVER_CLIENT_ID',
      defaultValue: '',
    );

    final apiBaseUrl = _pickFirstNonEmpty(
      apiBaseUrlOverride,
      env['VITE_API_BASE_URL'],
      _defaultApiBaseUrl,
    );
    final assetBaseUrl = _pickFirstNonEmpty(
      assetBaseUrlOverride,
      env['VITE_ASSET_BASE_URL'],
      apiBaseUrl,
    );

    return AppConfig(
      apiBaseUrl: apiBaseUrl,
      assetBaseUrl: assetBaseUrl,
      useMockData: _parseBool(
        _pickFirstNonEmpty(
          useMockDataOverride,
          env['USE_MOCK_DATA'],
          'false',
        ),
      ),
      googleServerClientId: _pickFirstNonEmpty(
        googleServerClientIdOverride,
        env['VITE_GOOGLE_CLIENT_ID'],
        '',
      ),
    );
  }

  final String apiBaseUrl;
  final String assetBaseUrl;
  final bool useMockData;
  final String googleServerClientId;

  String get defaultReturnUrl => '$normalizedBaseUrl/checkout/success';

  String get defaultCancelUrl => '$normalizedBaseUrl/checkout/cancel';

  String get normalizedBaseUrl {
    if (apiBaseUrl.endsWith('/')) {
      return apiBaseUrl.substring(0, apiBaseUrl.length - 1);
    }
    return apiBaseUrl;
  }

  String get normalizedAssetBaseUrl {
    if (assetBaseUrl.endsWith('/')) {
      return assetBaseUrl.substring(0, assetBaseUrl.length - 1);
    }
    return assetBaseUrl;
  }

  Uri buildUri(String path, [Map<String, String?> query = const {}]) {
    final filteredQuery = <String, String>{};
    for (final entry in query.entries) {
      final value = entry.value;
      if (value != null && value.isNotEmpty) {
        filteredQuery[entry.key] = value;
      }
    }

    final normalizedPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$normalizedBaseUrl$normalizedPath').replace(
      queryParameters: filteredQuery.isEmpty ? null : filteredQuery,
    );
  }

  String? resolveImageUrl(String? imagePath) {
    if (imagePath == null || imagePath.isEmpty) {
      return null;
    }
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    final normalizedPath = imagePath.startsWith('/') ? imagePath : '/$imagePath';
    return '$normalizedAssetBaseUrl$normalizedPath';
  }

  static Future<Map<String, String>> _loadDotEnv() async {
    try {
      final raw = await rootBundle.loadString('.env');
      return _parseDotEnv(raw);
    } catch (_) {
      return const {};
    }
  }

  static Map<String, String> _parseDotEnv(String raw) {
    final values = <String, String>{};
    for (final line in raw.split(RegExp(r'\r?\n'))) {
      final trimmed = line.trim();
      if (trimmed.isEmpty || trimmed.startsWith('#')) {
        continue;
      }

      final separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      final key = trimmed.substring(0, separatorIndex).trim();
      var value = trimmed.substring(separatorIndex + 1).trim();
      if (value.length >= 2) {
        final startsWithQuote = value.startsWith('"') || value.startsWith("'");
        final endsWithQuote = value.endsWith('"') || value.endsWith("'");
        if (startsWithQuote && endsWithQuote) {
          value = value.substring(1, value.length - 1);
        }
      }

      if (key.isNotEmpty) {
        values[key] = value;
      }
    }
    return values;
  }

  static String _pickFirstNonEmpty(String first, String? second, String fallback) {
    if (first.trim().isNotEmpty) {
      return first.trim();
    }
    if ((second ?? '').trim().isNotEmpty) {
      return second!.trim();
    }
    return fallback;
  }

  static bool _parseBool(String value) {
    switch (value.trim().toLowerCase()) {
      case '1':
      case 'true':
      case 'yes':
      case 'on':
        return true;
      case '0':
      case 'false':
      case 'no':
      case 'off':
        return false;
      default:
        return false;
    }
  }
}
