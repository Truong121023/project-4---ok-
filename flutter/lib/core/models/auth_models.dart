import 'common_models.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    this.workingStoreId,
    this.workingStoreName,
    this.workingStoreAddress,
    this.verified = false,
    this.profileCompleted = true,
    this.createdAt,
    this.verifiedAt,
  });

  factory AppUser.fromJson(JsonMap json) {
    return AppUser(
      id: asInt(json['id']),
      fullName: asString(json['fullName']),
      email: asString(json['email']),
      role: asString(json['role'], 'USER'),
      workingStoreId: json['workingStoreId'] == null ? null : asInt(json['workingStoreId']),
      workingStoreName: asString(json['workingStoreName']).isEmpty ? null : asString(json['workingStoreName']),
      workingStoreAddress:
          asString(json['workingStoreAddress']).isEmpty ? null : asString(json['workingStoreAddress']),
      verified: asBool(json['verified']),
      profileCompleted: json.containsKey('profileCompleted')
          ? asBool(json['profileCompleted'], true)
          : true,
      createdAt: asDateTime(json['createdAt']),
      verifiedAt: asDateTime(json['verifiedAt']),
    );
  }

  final int id;
  final String fullName;
  final String email;
  final String role;
  final int? workingStoreId;
  final String? workingStoreName;
  final String? workingStoreAddress;
  final bool verified;
  final bool profileCompleted;
  final DateTime? createdAt;
  final DateTime? verifiedAt;

  AppUser copyWith({
    int? id,
    String? fullName,
    String? email,
    String? role,
    int? workingStoreId,
    String? workingStoreName,
    String? workingStoreAddress,
    bool? verified,
    bool? profileCompleted,
    DateTime? createdAt,
    DateTime? verifiedAt,
  }) {
    return AppUser(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      role: role ?? this.role,
      workingStoreId: workingStoreId ?? this.workingStoreId,
      workingStoreName: workingStoreName ?? this.workingStoreName,
      workingStoreAddress: workingStoreAddress ?? this.workingStoreAddress,
      verified: verified ?? this.verified,
      profileCompleted: profileCompleted ?? this.profileCompleted,
      createdAt: createdAt ?? this.createdAt,
      verifiedAt: verifiedAt ?? this.verifiedAt,
    );
  }

  JsonMap toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'email': email,
      'role': role,
      'workingStoreId': workingStoreId,
      'workingStoreName': workingStoreName,
      'workingStoreAddress': workingStoreAddress,
      'verified': verified,
      'profileCompleted': profileCompleted,
      'createdAt': createdAt?.toIso8601String(),
      'verifiedAt': verifiedAt?.toIso8601String(),
    };
  }
}

class UserSession {
  const UserSession({
    required this.accessToken,
    required this.tokenType,
    required this.user,
    this.expiresAt,
  });

  factory UserSession.fromLoginJson(JsonMap json) {
    return UserSession(
      accessToken: asString(json['accessToken']),
      tokenType: asString(json['tokenType'], 'Bearer'),
      expiresAt: asDateTime(json['expiresAt']),
      user: AppUser.fromJson(Map<String, dynamic>.from(json['user'] as Map? ?? const {})),
    );
  }

  factory UserSession.fromJson(JsonMap json) {
    return UserSession(
      accessToken: asString(json['accessToken']),
      tokenType: asString(json['tokenType'], 'Bearer'),
      expiresAt: asDateTime(json['expiresAt']),
      user: AppUser.fromJson(Map<String, dynamic>.from(json['user'] as Map? ?? const {})),
    );
  }

  final String accessToken;
  final String tokenType;
  final DateTime? expiresAt;
  final AppUser user;

  UserSession copyWith({
    String? accessToken,
    String? tokenType,
    DateTime? expiresAt,
    AppUser? user,
  }) {
    return UserSession(
      accessToken: accessToken ?? this.accessToken,
      tokenType: tokenType ?? this.tokenType,
      expiresAt: expiresAt ?? this.expiresAt,
      user: user ?? this.user,
    );
  }

  JsonMap toJson() {
    return {
      'accessToken': accessToken,
      'tokenType': tokenType,
      'expiresAt': expiresAt?.toIso8601String(),
      'user': user.toJson(),
    };
  }
}

enum SessionInterruptionKind {
  replaced,
  expired,
  loginRequired,
}

class SessionInterruptionNotice {
  const SessionInterruptionNotice({
    required this.kind,
    required this.title,
    required this.message,
    required this.primaryActionLabel,
    this.secondaryActionLabel,
    this.email,
  });

  final SessionInterruptionKind kind;
  final String title;
  final String message;
  final String primaryActionLabel;
  final String? secondaryActionLabel;
  final String? email;

  bool get supportsPasswordReset => secondaryActionLabel != null && secondaryActionLabel!.trim().isNotEmpty;
}

class RegisterResult {
  const RegisterResult({
    required this.message,
    required this.userId,
    required this.email,
    required this.role,
    this.otpExpiresAt,
  });

  factory RegisterResult.fromJson(JsonMap json) {
    return RegisterResult(
      message: asString(json['message']),
      userId: asInt(json['userId']),
      email: asString(json['email']),
      role: asString(json['role'], 'USER'),
      otpExpiresAt: asDateTime(json['otpExpiresAt']),
    );
  }

  final String message;
  final int userId;
  final String email;
  final String role;
  final DateTime? otpExpiresAt;
}

class VerifyOtpResult {
  const VerifyOtpResult({
    required this.message,
    required this.user,
  });

  factory VerifyOtpResult.fromJson(JsonMap json) {
    return VerifyOtpResult(
      message: asString(json['message']),
      user: AppUser.fromJson(Map<String, dynamic>.from(json['user'] as Map? ?? const {})),
    );
  }

  final String message;
  final AppUser user;
}

class PasswordResetOtpResult {
  const PasswordResetOtpResult({
    required this.message,
    required this.email,
    this.otpExpiresAt,
  });

  factory PasswordResetOtpResult.fromJson(JsonMap json) {
    return PasswordResetOtpResult(
      message: asString(json['message']),
      email: asString(json['email']),
      otpExpiresAt: asDateTime(json['otpExpiresAt']),
    );
  }

  final String message;
  final String email;
  final DateTime? otpExpiresAt;
}

class GoogleCompleteProfileResult {
  const GoogleCompleteProfileResult({
    required this.message,
    required this.user,
  });

  factory GoogleCompleteProfileResult.fromJson(JsonMap json) {
    return GoogleCompleteProfileResult(
      message: asString(json['message']),
      user: AppUser.fromJson(Map<String, dynamic>.from(json['user'] as Map? ?? const {})),
    );
  }

  final String message;
  final AppUser user;
}
