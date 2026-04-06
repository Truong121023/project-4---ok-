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

class AiChatResponse {
  const AiChatResponse({
    required this.answer,
    required this.references,
    required this.currentUserStatus,
    required this.model,
  });

  factory AiChatResponse.fromJson(JsonMap json) {
    return AiChatResponse(
      answer: asString(json['answer']),
      references: asObjectList(json['references'], AiChatReference.fromJson),
      currentUserStatus: json['currentUserStatus'] is Map
          ? AiChatCurrentUserStatus.fromJson(
              Map<String, dynamic>.from(json['currentUserStatus'] as Map),
            )
          : null,
      model: asNullableString(json['model']),
    );
  }

  final String answer;
  final List<AiChatReference> references;
  final AiChatCurrentUserStatus? currentUserStatus;
  final String? model;
}
