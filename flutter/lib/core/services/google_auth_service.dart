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
            'Thieu Google client ID. Them VITE_GOOGLE_CLIENT_ID vao .env hoac --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id> khi chay app.',
      );
    }

    await ensureInitialized(config);

    if (!_googleSignIn.supportsAuthenticate()) {
      throw const GoogleAuthFailure(
        message: 'Thiet bi hien tai khong ho tro Google Sign-In.',
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
              'Google Sign-In da chon tai khoan ${account.email} nhung khong tra ve idToken. Kiem tra Google OAuth consent screen, Android package/SHA-1 va VITE_GOOGLE_CLIENT_ID.',
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
      return 'Tai khoan Google nay tren dien thoai dang can dang nhap lai. Day la loi tai khoan tren thiet bi, chua toi backend cua app. Hay mo Gmail/Play Store voi tai khoan do de xac thuc lai, hoac vao Settings > Accounts > Google, xoa roi them lai tai khoan, sau do thu dang nhap lai. (code: ${error.code.name}${details == null || details.isEmpty ? '' : ', details: $details'})';
    }

    final base = switch (error.code) {
      GoogleSignInExceptionCode.canceled =>
        'Google login bi dong hoac khong hoan tat. Neu tai khoan khac khong vao duoc, rat co the OAuth consent screen dang o Testing va Gmail nay chua nam trong Test users.',
      GoogleSignInExceptionCode.clientConfigurationError =>
        'Google Sign-In chua duoc cau hinh dung tren Android. Kiem tra package name, SHA-1 va web/server client ID.',
      GoogleSignInExceptionCode.providerConfigurationError =>
        'Google Play Services hoac Google provider tren thiet bi chua san sang.',
      GoogleSignInExceptionCode.uiUnavailable =>
        'Khong mo duoc giao dien Google Sign-In luc nay.',
      GoogleSignInExceptionCode.interrupted =>
        'Google Sign-In bi gian doan giua chung. Thu lai sau vai giay.',
      _ => 'Google Sign-In that bai.',
    };

    if (details == null || details.isEmpty) {
      return '$base (code: ${error.code.name})';
    }
    return '$base (code: ${error.code.name}, details: $details)';
  }
}
