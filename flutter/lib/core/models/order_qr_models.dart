import 'common_models.dart';

class MobileOrderQrResolveResponse {
  const MobileOrderQrResolveResponse({
    required this.resolvedRole,
    required this.targetScreen,
    required this.actionExecuted,
    required this.message,
    required this.executedAction,
    required this.claimedByUserId,
    required this.claimedByUserName,
    required this.claimedByUserRole,
    required this.order,
  });

  factory MobileOrderQrResolveResponse.fromJson(JsonMap json) {
    return MobileOrderQrResolveResponse(
      resolvedRole: asString(json['resolvedRole']),
      targetScreen: asString(json['targetScreen']),
      actionExecuted: asBool(json['actionExecuted']),
      message: asString(json['message']),
      executedAction: asNullableString(json['executedAction']),
      claimedByUserId: asNullableInt(json['claimedByUserId']),
      claimedByUserName: asNullableString(json['claimedByUserName']),
      claimedByUserRole: asNullableString(json['claimedByUserRole']),
      order: Map<String, dynamic>.from(json['order'] as Map? ?? const {}),
    );
  }

  final String resolvedRole;
  final String targetScreen;
  final bool actionExecuted;
  final String message;
  final String? executedAction;
  final int? claimedByUserId;
  final String? claimedByUserName;
  final String? claimedByUserRole;
  final JsonMap order;
}

class OrderProofRecord {
  const OrderProofRecord({
    required this.orderId,
    required this.userId,
    required this.role,
    required this.completedAt,
    required this.orderSnapshot,
    this.photoPath,
  });

  factory OrderProofRecord.fromJson(JsonMap json) {
    return OrderProofRecord(
      orderId: asInt(json['orderId']),
      userId: asInt(json['userId']),
      role: asString(json['role']),
      completedAt: asDateTime(json['completedAt']) ?? DateTime.fromMillisecondsSinceEpoch(0),
      orderSnapshot: Map<String, dynamic>.from(json['orderSnapshot'] as Map? ?? const {}),
      photoPath: asNullableString(json['photoPath']),
    );
  }

  final int orderId;
  final int userId;
  final String role;
  final DateTime completedAt;
  final JsonMap orderSnapshot;
  final String? photoPath;

  OrderProofRecord copyWith({
    int? orderId,
    int? userId,
    String? role,
    DateTime? completedAt,
    JsonMap? orderSnapshot,
    String? photoPath,
  }) {
    return OrderProofRecord(
      orderId: orderId ?? this.orderId,
      userId: userId ?? this.userId,
      role: role ?? this.role,
      completedAt: completedAt ?? this.completedAt,
      orderSnapshot: orderSnapshot ?? this.orderSnapshot,
      photoPath: photoPath ?? this.photoPath,
    );
  }

  JsonMap toJson() {
    return {
      'orderId': orderId,
      'userId': userId,
      'role': role,
      'completedAt': completedAt.toIso8601String(),
      'orderSnapshot': orderSnapshot,
      'photoPath': photoPath,
    };
  }
}
