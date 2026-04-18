import 'package:google_sign_in/google_sign_in.dart';

import '../config/app_config.dart';

class GoogleAuthFailure implements Exception {
  const GoogleAuthFailure({
    required this.message,
    this.code,
    this.description,
  });

  final String message;
  final String? code;
  final String? description;

  @override
  String toString() => message;
}

class GoogleAuthService {
  GoogleAuthService._();

  static final GoogleAuthService instance = GoogleAuthService._();

  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  Future<void>? _initializeFuture;

  bool get isAvailable => _googleSignIn.supportsAuthenticate();

  Future<void> ensureInitialized(AppConfig config) {
    _initializeFuture ??= _googleSignIn.initialize(
      serverClientId: config.googleServerClientId.trim().isEmpty
          ? null
          : config.googleServerClientId.trim(),
    );
    return _initializeFuture!;
  }

  Future<String> authenticateAndGetIdToken(AppConfig config) async {
    if (!config.useMockData && config.googleServerClientId.trim().isEmpty) {
      throw const GoogleAuthFailure(
        message:
            'Missing Google client ID. Add VITE_GOOGLE_CLIENT_ID to .env or pass --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id> when running the app.',
      );
    }

    await ensureInitialized(config);

    if (!_googleSignIn.supportsAuthenticate()) {
      throw const GoogleAuthFailure(
        message: 'This device does not support Google Sign-In.',
      );
    }

    try {
      // The plugin recommends signing out before re-authenticating so account
      // switching works predictably across platforms.
      await _googleSignIn.signOut();
    } catch (_) {
      // Ignore stale session cleanup issues and continue with a fresh prompt.
    }

    try {
      final account = await _googleSignIn.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw GoogleAuthFailure(
          message:
              'Google Sign-In selected ${account.email} but did not return an idToken. Check the Google OAuth consent screen, Android package/SHA-1, and VITE_GOOGLE_CLIENT_ID.',
          code: 'missing_id_token',
        );
      }
      return idToken;
    } on GoogleSignInException catch (error) {
      final description = error.description?.trim();
      throw GoogleAuthFailure(
        message: _messageForGoogleException(error),
        code: error.code.name,
        description: description?.isEmpty == true ? null : description,
      );
    }
  }

  String _messageForGoogleException(GoogleSignInException error) {
    final details = error.description?.trim();
    final normalizedDetails = details?.toLowerCase() ?? '';

    if (normalizedDetails.contains('account reauth failed')) {
      return 'This Google account on the device needs re-authentication. This is a device account issue before the app backend is reached. Open Gmail or Play Store with that account to re-authenticate, or go to Settings > Accounts > Google, remove and add the account again, then try signing in once more. (code: ${error.code.name}${details == null || details.isEmpty ? '' : ', details: $details'})';
    }

    final base = switch (error.code) {
      GoogleSignInExceptionCode.canceled =>
        'Google sign-in was closed or not completed. If other accounts also cannot sign in, the OAuth consent screen may still be in Testing and this Gmail account may not be listed in Test users.',
      GoogleSignInExceptionCode.clientConfigurationError =>
        'Google Sign-In is not configured correctly on Android. Check the package name, SHA-1, and web/server client ID.',
      GoogleSignInExceptionCode.providerConfigurationError =>
        'Google Play Services or the Google provider on this device is not ready.',
      GoogleSignInExceptionCode.uiUnavailable =>
        'The Google Sign-In interface could not be opened right now.',
      GoogleSignInExceptionCode.interrupted =>
        'Google Sign-In was interrupted. Please try again in a few seconds.',
      _ => 'Google Sign-In failed.',
    };

    if (details == null || details.isEmpty) {
      return '$base (code: ${error.code.name})';
    }
    return '$base (code: ${error.code.name}, details: $details)';
  }
}
