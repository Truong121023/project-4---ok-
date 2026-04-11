import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/app_config.dart';
import '../models/models.dart';

enum SupportChatSocketMode {
  user,
  backoffice,
}

class SupportChatSocketService extends ChangeNotifier {
  SupportChatSocketService({
    required this.config,
    required this.accessToken,
    required this.currentUser,
    this.useMockData = false,
  });

  final AppConfig config;
  final String accessToken;
  final AppUser currentUser;
  final bool useMockData;

  io.Socket? _socket;
  SupportChatSocketMode? _mode;
  int? _activeStoreId;

  bool connecting = false;
  bool connected = false;
  String? errorMessage;
  UserSupportChatState? userState;
  List<AdminSupportChatSession> adminSessions = const [];

  String get connectionLabel {
    if (useMockData) {
      return 'Demo mode';
    }
    if (connected) {
      return 'Da ket noi';
    }
    if (connecting) {
      return 'Dang ket noi';
    }
    return 'Chua ket noi';
  }

  AdminSupportChatSession? findAdminSession(String sessionId) {
    for (final session in adminSessions) {
      if (session.id == sessionId) {
        return session;
      }
    }
    return null;
  }

  Future<void> connectForUser({
    required int storeId,
    required String storeName,
  }) async {
    _mode = SupportChatSocketMode.user;
    _activeStoreId = storeId;
    if (useMockData) {
      _seedMockUserState(storeId: storeId, storeName: storeName);
      return;
    }
    _ensureSocket();
    _connectSocket();
    if (connected) {
      _emitUserSessionStart();
    }
  }

  Future<void> connectForBackoffice() async {
    _mode = SupportChatSocketMode.backoffice;
    if (useMockData) {
      _seedMockBackofficeSessions();
      return;
    }
    _ensureSocket();
    _connectSocket();
  }

  void sendUserMessage(String content) {
    final trimmed = content.trim();
    if (trimmed.isEmpty) {
      return;
    }
    if (useMockData) {
      final current = userState;
      if (current == null) {
        return;
      }
      final nextMessages = [
        ...current.messages,
        SupportChatMessage(
          id: 'demo-${DateTime.now().millisecondsSinceEpoch}',
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          senderRole: currentUser.role,
          content: trimmed,
          createdAt: DateTime.now(),
        ),
      ];
      userState = UserSupportChatState(
        id: current.id,
        storeId: current.storeId,
        storeName: current.storeName,
        assignedAdminId: current.assignedAdminId,
        assignedAdminName: current.assignedAdminName,
        messages: nextMessages,
      );
      notifyListeners();
      return;
    }
    if (!connected) {
      errorMessage = 'Chua ket noi den ho tro truc tiep.';
      notifyListeners();
      return;
    }
    _socket?.emit('support:message:send', {'content': trimmed});
  }

  void sendBackofficeMessage({
    required String sessionId,
    required String content,
  }) {
    final trimmed = content.trim();
    if (trimmed.isEmpty) {
      return;
    }
    if (useMockData) {
      adminSessions = adminSessions
          .map(
            (session) => session.id == sessionId
                ? AdminSupportChatSession(
                    id: session.id,
                    storeId: session.storeId,
                    storeName: session.storeName,
                    userId: session.userId,
                    userName: session.userName,
                    userEmail: session.userEmail,
                    waitingForAdmin: false,
                    assignedAdminId: currentUser.id,
                    assignedAdminName: currentUser.fullName,
                    messages: [
                      ...session.messages,
                      SupportChatMessage(
                        id: 'demo-${DateTime.now().millisecondsSinceEpoch}',
                        senderId: currentUser.id,
                        senderName: currentUser.fullName,
                        senderRole: currentUser.role,
                        content: trimmed,
                        createdAt: DateTime.now(),
                      ),
                    ],
                  )
                : session,
          )
          .toList();
      notifyListeners();
      return;
    }
    if (!connected) {
      errorMessage = 'Chua ket noi den ho tro truc tiep.';
      notifyListeners();
      return;
    }
    _socket?.emit('support:message:send', {
      'sessionId': sessionId,
      'content': trimmed,
    });
  }

  void retry() {
    if (useMockData) {
      notifyListeners();
      return;
    }
    _connectSocket(forceReconnect: true);
  }

  void _seedMockUserState({
    required int storeId,
    required String storeName,
  }) {
    connecting = false;
    connected = true;
    errorMessage = null;
    userState = UserSupportChatState(
      id: 'demo-user-$storeId',
      storeId: storeId,
      storeName: storeName,
      assignedAdminId: 1,
      assignedAdminName: 'Kamatcha Support',
      messages: const [
        SupportChatMessage(
          id: 'demo-welcome',
          senderId: 1,
          senderName: 'Kamatcha Support',
          senderRole: 'ADMIN',
          content: 'Xin chao, ben minh dang online. Ban can ho tro gi cho don hang nay?',
          createdAt: null,
        ),
      ],
    );
    notifyListeners();
  }

  void _seedMockBackofficeSessions() {
    connecting = false;
    connected = true;
    errorMessage = null;
    adminSessions = const [
      AdminSupportChatSession(
        id: 'demo-chat-1',
        storeId: 1,
        storeName: 'Tea House Q1',
        userId: 101,
        userName: 'Nguyen Van A',
        userEmail: 'a@example.com',
        waitingForAdmin: true,
        assignedAdminId: null,
        assignedAdminName: null,
        messages: [
          SupportChatMessage(
            id: 'demo-msg-1',
            senderId: 101,
            senderName: 'Nguyen Van A',
            senderRole: 'USER',
            content: 'Em can ho tro kiem tra don #701.',
            createdAt: null,
          ),
        ],
      ),
    ];
    notifyListeners();
  }

  void _ensureSocket() {
    if (_socket != null) {
      return;
    }
    final socket = io.io(
      config.normalizedBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setPath('/socket.io')
          .setAuth({
            'token': accessToken,
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
      if (_mode == SupportChatSocketMode.user) {
        _emitUserSessionStart();
      }
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
    socket.on('support:user_state', (dynamic data) {
      if (data is Map) {
        userState = UserSupportChatState.fromJson(Map<String, dynamic>.from(data));
        errorMessage = null;
        notifyListeners();
      }
    });
    socket.on('support:admin_state', (dynamic data) {
      if (data is List) {
        adminSessions = data
            .whereType<Map>()
            .map((item) => AdminSupportChatSession.fromJson(Map<String, dynamic>.from(item)))
            .toList()
          ..sort((left, right) {
            final leftTime = left.messages.isEmpty ? DateTime.fromMillisecondsSinceEpoch(0) : left.messages.last.createdAt;
            final rightTime = right.messages.isEmpty ? DateTime.fromMillisecondsSinceEpoch(0) : right.messages.last.createdAt;
            return (rightTime ?? DateTime.fromMillisecondsSinceEpoch(0))
                .compareTo(leftTime ?? DateTime.fromMillisecondsSinceEpoch(0));
          });
        errorMessage = null;
        notifyListeners();
      }
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

  void _emitUserSessionStart() {
    if (_activeStoreId == null || !connected) {
      return;
    }
    _socket?.emit('support:user_session:start', {'storeId': _activeStoreId});
  }

  String _extractSocketError(dynamic data) {
    if (data is Map) {
      final map = Map<String, dynamic>.from(data);
      final message = asString(map['message']).trim();
      if (message.isNotEmpty) {
        return message;
      }
      final error = asString(map['error']).trim();
      if (error.isNotEmpty) {
        return error;
      }
    }
    final text = asString(data).trim();
    if (text.isNotEmpty) {
      return text;
    }
    return 'Khong ket noi duoc den support chat.';
  }

  @override
  void dispose() {
    _socket?.dispose();
    _socket = null;
    super.dispose();
  }
}
