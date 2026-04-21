import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/app_config.dart';

class AppRealtimeSocketService extends ChangeNotifier {
  AppRealtimeSocketService({
    required this.config,
    this.useMockData = false,
  });

  final AppConfig config;
  final bool useMockData;

  io.Socket? _socket;
  String _accessToken = '';

  bool connecting = false;
  bool connected = false;
  String? errorMessage;
  int orderEventVersion = 0;
  int notificationEventVersion = 0;
  Map<String, dynamic>? lastOrderEvent;
  Map<String, dynamic>? lastNotificationEvent;

  Future<void> connect({
    required String accessToken,
  }) async {
    final trimmedToken = accessToken.trim();
    if (trimmedToken.isEmpty) {
      disconnect();
      return;
    }

    if (useMockData) {
      _accessToken = trimmedToken;
      connecting = false;
      connected = true;
      errorMessage = null;
      notifyListeners();
      return;
    }

    if (_socket != null && _accessToken == trimmedToken) {
      _connectSocket();
      return;
    }

    _disposeSocket();
    _accessToken = trimmedToken;
    _ensureSocket();
    _connectSocket();
  }

  void disconnect() {
    _accessToken = '';
    connecting = false;
    connected = false;
    errorMessage = null;
    lastOrderEvent = null;
    lastNotificationEvent = null;
    _disposeSocket();
    notifyListeners();
  }

  void retry() {
    if (useMockData) {
      notifyListeners();
      return;
    }
    _connectSocket(forceReconnect: true);
  }

  void _ensureSocket() {
    if (_socket != null || _accessToken.isEmpty) {
      return;
    }

    final socket = io.io(
      '${config.normalizedBaseUrl}/app',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setPath('/socket.io')
          .setAuth({
            'token': _accessToken,
            'tokenType': 'Bearer',
          })
          .disableAutoConnect()
          .enableForceNewConnection()
          .enableReconnection()
          .build(),
    );

    socket.onConnect((_) {
      connecting = false;
      connected = true;
      errorMessage = null;
      notifyListeners();
    });

    socket.onDisconnect((_) {
      connecting = false;
      connected = false;
      notifyListeners();
    });

    socket.onConnectError((dynamic data) {
      connecting = false;
      connected = false;
      errorMessage = _extractSocketError(data);
      notifyListeners();
    });

    socket.onError((dynamic data) {
      errorMessage = _extractSocketError(data);
      notifyListeners();
    });

    socket.on('app:order:update', (dynamic data) {
      lastOrderEvent = _normalizePayload(data);
      orderEventVersion += 1;
      notifyListeners();
    });

    socket.on('app:notification:update', (dynamic data) {
      lastNotificationEvent = _normalizePayload(data);
      notificationEventVersion += 1;
      notifyListeners();
    });

    _socket = socket;
  }

  void _connectSocket({bool forceReconnect = false}) {
    final socket = _socket;
    if (socket == null) {
      return;
    }

    if (socket.connected && !forceReconnect) {
      connected = true;
      connecting = false;
      notifyListeners();
      return;
    }

    if (forceReconnect) {
      socket.disconnect();
    }

    connecting = true;
    errorMessage = null;
    notifyListeners();
    socket.connect();
  }

  Map<String, dynamic>? _normalizePayload(dynamic data) {
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return null;
  }

  String _extractSocketError(dynamic data) {
    if (data is Map) {
      final map = Map<String, dynamic>.from(data);
      final message = '${map['message'] ?? ''}'.trim();
      if (message.isNotEmpty) {
        return message;
      }
      final error = '${map['error'] ?? ''}'.trim();
      if (error.isNotEmpty) {
        return error;
      }
    }

    final text = '$data'.trim();
    if (text.isNotEmpty && text != 'null') {
      return text;
    }
    return 'Unable to connect to realtime updates.';
  }

  void _disposeSocket() {
    _socket?.dispose();
    _socket = null;
  }

  @override
  void dispose() {
    _disposeSocket();
    super.dispose();
  }
}
