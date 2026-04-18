import 'common_models.dart';

class AiChatHistoryEntry {
  const AiChatHistoryEntry({
    required this.role,
    required this.content,
  });

  factory AiChatHistoryEntry.fromJson(JsonMap json) {
    return AiChatHistoryEntry(
      role: asString(json['role']),
      content: asString(json['content']),
    );
  }

  final String role;
  final String content;

  JsonMap toJson() {
    return {
      'role': role,
      'content': content,
    };
  }
}

class AiChatReference {
  const AiChatReference({
    required this.referenceKey,
    required this.entityType,
    required this.tableName,
    required this.id,
    required this.slug,
    required this.title,
    required this.subtitle,
    required this.imagePath,
    required this.publicApiPath,
    required this.adminApiPath,
    required this.userApiPath,
  });

  factory AiChatReference.fromJson(JsonMap json) {
    return AiChatReference(
      referenceKey: asString(json['referenceKey']),
      entityType: asString(json['entityType']),
      tableName: asString(json['tableName']),
      id: asNullableInt(json['id']),
      slug: asNullableString(json['slug']),
      title: asString(json['title']),
      subtitle: asNullableString(json['subtitle']),
      imagePath: asNullableString(json['imagePath']),
      publicApiPath: asNullableString(json['publicApiPath']),
      adminApiPath: asNullableString(json['adminApiPath']),
      userApiPath: asNullableString(json['userApiPath']),
    );
  }

  final String referenceKey;
  final String entityType;
  final String tableName;
  final int? id;
  final String? slug;
  final String title;
  final String? subtitle;
  final String? imagePath;
  final String? publicApiPath;
  final String? adminApiPath;
  final String? userApiPath;
}

class AiChatAction {
  const AiChatAction({
    required this.actionKey,
    required this.actionType,
    required this.label,
    required this.description,
    required this.method,
    required this.apiPath,
    required this.referenceKey,
    required this.payload,
  });

  factory AiChatAction.fromJson(JsonMap json) {
    return AiChatAction(
      actionKey: asString(json['actionKey']),
      actionType: asString(json['actionType']),
      label: asString(json['label']),
      description: asNullableString(json['description']),
      method: asNullableString(json['method']),
      apiPath: asNullableString(json['apiPath']),
      referenceKey: asNullableString(json['referenceKey']),
      payload: json['payload'] is Map
          ? Map<String, dynamic>.from(json['payload'] as Map)
          : null,
    );
  }

  final String actionKey;
  final String actionType;
  final String label;
  final String? description;
  final String? method;
  final String? apiPath;
  final String? referenceKey;
  final JsonMap? payload;
}

class AiChatCurrentUserStatus {
  const AiChatCurrentUserStatus({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    required this.enabled,
    required this.verified,
    required this.profileCompleted,
    required this.workingStoreId,
    required this.workingStoreName,
  });

  factory AiChatCurrentUserStatus.fromJson(JsonMap json) {
    return AiChatCurrentUserStatus(
      id: asInt(json['id']),
      fullName: asString(json['fullName']),
      email: asString(json['email']),
      role: asString(json['role']),
      enabled: asBool(json['enabled'], true),
      verified: asBool(json['verified']),
      profileCompleted: asBool(json['profileCompleted'], true),
      workingStoreId: asNullableInt(json['workingStoreId']),
      workingStoreName: asNullableString(json['workingStoreName']),
    );
  }

  final int id;
  final String fullName;
  final String email;
  final String role;
  final bool enabled;
  final bool verified;
  final bool profileCompleted;
  final int? workingStoreId;
  final String? workingStoreName;
}

class AiChatStoredMessage {
  const AiChatStoredMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.references,
    required this.actions,
    required this.model,
    required this.createdAt,
  });

  factory AiChatStoredMessage.fromJson(JsonMap json) {
    return AiChatStoredMessage(
      id: asNullableInt(json['id']),
      role: asString(json['role']),
      content: asString(json['content']),
      references: asObjectList(json['references'], AiChatReference.fromJson),
      actions: asObjectList(json['actions'], AiChatAction.fromJson),
      model: asNullableString(json['model']),
      createdAt: asDateTime(json['createdAt']),
    );
  }

  final int? id;
  final String role;
  final String content;
  final List<AiChatReference> references;
  final List<AiChatAction> actions;
  final String? model;
  final DateTime? createdAt;
}

class AiChatThreadSummary {
  const AiChatThreadSummary({
    required this.threadId,
    required this.title,
    required this.messageCount,
    required this.lastMessageRole,
    required this.lastMessagePreview,
    required this.lastMessageAt,
    required this.updatedAt,
  });

  factory AiChatThreadSummary.fromJson(JsonMap json) {
    return AiChatThreadSummary(
      threadId: asInt(json['threadId']),
      title: asString(json['title']),
      messageCount: asInt(json['messageCount']),
      lastMessageRole: asString(json['lastMessageRole']),
      lastMessagePreview: asString(json['lastMessagePreview']),
      lastMessageAt: asDateTime(json['lastMessageAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int threadId;
  final String title;
  final int messageCount;
  final String lastMessageRole;
  final String lastMessagePreview;
  final DateTime? lastMessageAt;
  final DateTime? updatedAt;
}

class AiChatThreadDetail {
  const AiChatThreadDetail({
    required this.threadId,
    required this.title,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AiChatThreadDetail.fromJson(JsonMap json) {
    return AiChatThreadDetail(
      threadId: asInt(json['threadId']),
      title: asString(json['title']),
      messages: asObjectList(json['messages'], AiChatStoredMessage.fromJson),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int threadId;
  final String title;
  final List<AiChatStoredMessage> messages;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

class AiChatResponse {
  const AiChatResponse({
    required this.threadId,
    required this.threadTitle,
    required this.answer,
    required this.references,
    required this.actions,
    required this.currentUserStatus,
    required this.model,
  });

  factory AiChatResponse.fromJson(JsonMap json) {
    return AiChatResponse(
      threadId: asNullableInt(json['threadId']),
      threadTitle: asNullableString(json['threadTitle']),
      answer: asString(json['answer']),
      references: asObjectList(json['references'], AiChatReference.fromJson),
      actions: asObjectList(json['actions'], AiChatAction.fromJson),
      currentUserStatus: json['currentUserStatus'] is Map
          ? AiChatCurrentUserStatus.fromJson(
              Map<String, dynamic>.from(json['currentUserStatus'] as Map),
            )
          : null,
      model: asNullableString(json['model']),
    );
  }

  final int? threadId;
  final String? threadTitle;
  final String answer;
  final List<AiChatReference> references;
  final List<AiChatAction> actions;
  final AiChatCurrentUserStatus? currentUserStatus;
  final String? model;
}
