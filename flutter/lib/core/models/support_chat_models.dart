import 'common_models.dart';

class SupportChatMessage {
  const SupportChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    required this.content,
    required this.createdAt,
  });

  factory SupportChatMessage.fromJson(JsonMap json) {
    return SupportChatMessage(
      id: asString(json['id']),
      senderId: asNullableInt(json['senderId']),
      senderName: asString(json['senderName']),
      senderRole: asString(json['senderRole']),
      content: asString(json['content']),
      createdAt: asDateTime(json['createdAt']),
    );
  }

  final String id;
  final int? senderId;
  final String senderName;
  final String senderRole;
  final String content;
  final DateTime? createdAt;
}

class UserSupportChatState {
  const UserSupportChatState({
    required this.id,
    required this.storeId,
    required this.storeName,
    required this.assignedAdminId,
    required this.assignedAdminName,
    required this.messages,
  });

  factory UserSupportChatState.fromJson(JsonMap json) {
    return UserSupportChatState(
      id: asString(json['id']),
      storeId: asInt(json['storeId']),
      storeName: asString(json['storeName']),
      assignedAdminId: asNullableInt(json['assignedAdminId']),
      assignedAdminName: asNullableString(json['assignedAdminName']),
      messages: asObjectList(json['messages'], SupportChatMessage.fromJson),
    );
  }

  final String id;
  final int storeId;
  final String storeName;
  final int? assignedAdminId;
  final String? assignedAdminName;
  final List<SupportChatMessage> messages;
}

class AdminSupportChatSession {
  const AdminSupportChatSession({
    required this.id,
    required this.storeId,
    required this.storeName,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.waitingForAdmin,
    required this.assignedAdminId,
    required this.assignedAdminName,
    required this.messages,
  });

  factory AdminSupportChatSession.fromJson(JsonMap json) {
    return AdminSupportChatSession(
      id: asString(json['id']),
      storeId: asInt(json['storeId']),
      storeName: asString(json['storeName']),
      userId: asNullableInt(json['userId']),
      userName: asString(json['userName']),
      userEmail: asString(json['userEmail']),
      waitingForAdmin: asBool(json['waitingForAdmin']),
      assignedAdminId: asNullableInt(json['assignedAdminId']),
      assignedAdminName: asNullableString(json['assignedAdminName']),
      messages: asObjectList(json['messages'], SupportChatMessage.fromJson),
    );
  }

  final String id;
  final int storeId;
  final String storeName;
  final int? userId;
  final String userName;
  final String userEmail;
  final bool waitingForAdmin;
  final int? assignedAdminId;
  final String? assignedAdminName;
  final List<SupportChatMessage> messages;
}
