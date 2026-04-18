import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

class SessionStore {
  SessionStore(this._prefs);

  final SharedPreferences _prefs;

  static const _sessionKey = 'kamatcha.session';
  static const _mockCartKey = 'kamatcha.mock_cart';
  static const _pendingOrderQrTokenKey = 'kamatcha.pending_order_qr_token';
  static const _orderProofRecordsKey = 'kamatcha.order_proof_records';

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

  Cart loadLocalCart() {
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

  Future<void> saveLocalCart(Cart cart) {
    return _prefs.setString(_mockCartKey, jsonEncode(cart.toJson()));
  }

  Future<void> clearLocalCart() {
    return _prefs.remove(_mockCartKey);
  }

  Cart loadMockCart() {
    return loadLocalCart();
  }

  Future<void> saveMockCart(Cart cart) {
    return saveLocalCart(cart);
  }

  Future<void> clearMockCart() {
    return clearLocalCart();
  }

  String? loadPendingOrderQrToken() {
    final raw = _prefs.getString(_pendingOrderQrTokenKey);
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }
    return raw.trim();
  }

  Future<void> savePendingOrderQrToken(String token) {
    return _prefs.setString(_pendingOrderQrTokenKey, token);
  }

  Future<void> clearPendingOrderQrToken() {
    return _prefs.remove(_pendingOrderQrTokenKey);
  }

  List<OrderProofRecord> loadOrderProofRecords() {
    final raw = _prefs.getString(_orderProofRecordsKey);
    if (raw == null || raw.isEmpty) {
      return const [];
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        return const [];
      }
      return decoded
          .whereType<Map>()
          .map((item) => OrderProofRecord.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> saveOrderProofRecords(List<OrderProofRecord> records) {
    return _prefs.setString(
      _orderProofRecordsKey,
      jsonEncode(records.map((record) => record.toJson()).toList()),
    );
  }
}
