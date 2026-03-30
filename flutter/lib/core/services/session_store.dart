import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

class SessionStore {
  SessionStore(this._prefs);

  final SharedPreferences _prefs;

  static const _sessionKey = 'tea_matcha.session';
  static const _mockCartKey = 'tea_matcha.mock_cart';

  UserSession? loadSession() {
    final raw = _prefs.getString(_sessionKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return UserSession.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveSession(UserSession session) {
    return _prefs.setString(_sessionKey, jsonEncode(session.toJson()));
  }

  Future<void> clearSession() {
    return _prefs.remove(_sessionKey);
  }

  Cart loadMockCart() {
    final raw = _prefs.getString(_mockCartKey);
    if (raw == null || raw.isEmpty) {
      return Cart.empty();
    }
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return Cart.fromJson(json);
    } catch (_) {
      return Cart.empty();
    }
  }

  Future<void> saveMockCart(Cart cart) {
    return _prefs.setString(_mockCartKey, jsonEncode(cart.toJson()));
  }

  Future<void> clearMockCart() {
    return _prefs.remove(_mockCartKey);
  }
}
