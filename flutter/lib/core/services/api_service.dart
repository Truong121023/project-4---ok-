import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/models.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiUnauthorizedSignal {
  const ApiUnauthorizedSignal({
    required this.message,
    required this.path,
    required this.hadToken,
  });

  final String message;
  final String path;
  final bool hadToken;
}

class ApiService {
  ApiService({
    required this.config,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final AppConfig config;
  final http.Client _client;
  Future<void> Function(ApiUnauthorizedSignal signal)? onUnauthorized;

  Future<HomeBundle> getHome() async {
    final json = await _request('GET', '/api/public/home') as JsonMap;
    return HomeBundle.fromJson(json);
  }

  Future<List<StoreCard>> getStores({
    String search = '',
    String sort = 'rating_desc',
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/public/stores',
      query: {
        'search': search,
        'sort': sort,
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<StoreCard>.fromJson(json, StoreCard.fromJson).items;
  }

  Future<StoreDetail> getStoreDetail(String storeKey) async {
    final json = await _request('GET', '/api/public/stores/$storeKey') as JsonMap;
    return StoreDetail.fromJson(json);
  }

  Future<AiChatResponse> queryAiChat({
    required String token,
    required String message,
    List<AiChatHistoryEntry> history = const [],
  }) async {
    final json = await _request(
      'POST',
      '/api/ai/chat/query',
      token: token,
      body: {
        'message': message,
        'history': history.map((entry) => entry.toJson()).toList(),
      },
    ) as JsonMap;
    return AiChatResponse.fromJson(json);
  }

  Future<List<DishCard>> getDishes({
    String search = '',
    String sort = 'top_rated',
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/public/dishes',
      query: {
        'search': search,
        'sort': sort,
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<DishCard>.fromJson(json, DishCard.fromJson).items;
  }

  Future<DishDetail> getDishDetail(int dishId) async {
    final json = await _request('GET', '/api/public/dishes/$dishId') as JsonMap;
    return DishDetail.fromJson(json);
  }

  Future<List<NewsCard>> getNews({
    String search = '',
    bool? featured,
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/public/news',
      query: {
        'search': search,
        'featured': featured == null ? null : '$featured',
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<NewsCard>.fromJson(json, NewsCard.fromJson).items;
  }

  Future<NewsDetail> getNewsDetail(String newsKey) async {
    final json = await _request('GET', '/api/public/news/$newsKey') as JsonMap;
    return NewsDetail.fromJson(json);
  }

  Future<List<EventCard>> getEvents({
    String search = '',
    String sort = 'date_asc',
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/public/events',
      query: {
        'search': search,
        'sort': sort,
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<EventCard>.fromJson(json, EventCard.fromJson).items;
  }

  Future<EventDetail> getEventDetail(String eventKey) async {
    final json = await _request('GET', '/api/public/events/$eventKey') as JsonMap;
    return EventDetail.fromJson(json);
  }

  Future<UserSession> login({
    required String email,
    required String password,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/login',
      body: {
        'email': email,
        'password': password,
      },
    ) as JsonMap;
    return UserSession.fromLoginJson(json);
  }

  Future<UserSession> googleLogin({
    required String idToken,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/google/login',
      body: {
        'idToken': idToken,
      },
    ) as JsonMap;
    return UserSession.fromLoginJson(json);
  }

  Future<RegisterResult> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/register',
      body: {
        'fullName': fullName,
        'email': email,
        'password': password,
      },
    ) as JsonMap;
    return RegisterResult.fromJson(json);
  }

  Future<VerifyOtpResult> verifyOtp({
    required String email,
    required String otp,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/verify-otp',
      body: {
        'email': email,
        'otp': otp,
      },
    ) as JsonMap;
    return VerifyOtpResult.fromJson(json);
  }

  Future<PasswordResetOtpResult> requestPasswordResetOtp(String email) async {
    final json = await _request(
      'POST',
      '/api/auth/password/request-otp',
      body: {
        'email': email,
      },
    ) as JsonMap;
    return PasswordResetOtpResult.fromJson(json);
  }

  Future<MessageResponse> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/password/reset',
      body: {
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
      },
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<GoogleCompleteProfileResult> completeGoogleProfile({
    required String token,
    required String fullName,
    required String password,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/google/complete-profile',
      token: token,
      body: {
        'fullName': fullName,
        'password': password,
      },
    ) as JsonMap;
    return GoogleCompleteProfileResult.fromJson(json);
  }

  Future<AppUser> getCurrentUser(String token) async {
    final json = await _request('GET', '/api/auth/me', token: token) as JsonMap;
    return AppUser.fromJson(Map<String, dynamic>.from(json['user'] as Map? ?? const {}));
  }

  Future<AdminDashboard> getAdminDashboard(
    String token, {
    int? storeId,
  }) async {
    final json = await _request(
      'GET',
      '/api/admin/dashboard',
      token: token,
      query: {
        'storeId': storeId == null ? null : '$storeId',
      },
    ) as JsonMap;
    return AdminDashboard.fromJson(json);
  }

  Future<AdminSummary> getAdminSummary(
    String token, {
    int? storeId,
  }) async {
    final json = await _request(
      'GET',
      '/api/admin/summary',
      token: token,
      query: {
        'storeId': storeId == null ? null : '$storeId',
      },
    ) as JsonMap;
    return AdminSummary.fromJson(json);
  }

  Future<AdminAiFormDraft> generateAdminAiFormDraft({
    required String token,
    required String formType,
    required String prompt,
    int? storeId,
    JsonMap currentForm = const {},
  }) async {
    final json = await _request(
      'POST',
      '/api/admin/ai/form-drafts/$formType',
      token: token,
      body: {
        'prompt': prompt,
        if (storeId != null) 'storeId': storeId,
        'currentForm': currentForm,
      },
    ) as JsonMap;
    return AdminAiFormDraft.fromJson(json);
  }

  Future<AdminListResult> getAdminCollection({
    required String token,
    required String path,
    bool paged = true,
    String search = '',
    int page = 0,
    int size = 20,
    Map<String, String?> query = const {},
  }) async {
    final mergedQuery = <String, String?>{
      ...query,
      if (search.isNotEmpty) 'search': search,
      if (paged) 'page': '$page',
      if (paged) 'size': '$size',
    };
    final json = await _request(
      'GET',
      path,
      token: token,
      query: mergedQuery,
    );
    if (paged) {
      return AdminListResult.fromPagedJson(json as JsonMap);
    }
    return AdminListResult.fromListJson(json as List<dynamic>);
  }

  Future<JsonMap> getAdminResource({
    required String token,
    required String path,
    Map<String, String?> query = const {},
  }) async {
    final json = await _request(
      'GET',
      path,
      token: token,
      query: query,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<AdminListResult> getEmployeeOrders({
    required String token,
    String search = '',
    int page = 0,
    int size = 20,
    bool? mine,
  }) async {
    final json = await _request(
      'GET',
      '/api/employee/orders',
      token: token,
      query: {
        'search': search,
        'page': '$page',
        'size': '$size',
        'mine': mine == null ? null : '$mine',
      },
    ) as JsonMap;
    return AdminListResult.fromPagedJson(json);
  }

  Future<JsonMap> getEmployeeOrderDetail({
    required String token,
    required int orderId,
  }) async {
    final json = await _request(
      'GET',
      '/api/employee/orders/$orderId',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap> runEmployeeOrderAction({
    required String token,
    required int orderId,
    required String action,
  }) async {
    final json = await _request(
      'POST',
      '/api/employee/orders/$orderId/$action',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<MobileOrderQrResolveResponse> resolveMobileOrderQr({
    required String token,
    required String qrToken,
  }) async {
    final json = await _request(
      'GET',
      '/api/mobile/order-qr/$qrToken',
      token: token,
    ) as JsonMap;
    return MobileOrderQrResolveResponse.fromJson(json);
  }

  Future<JsonMap> getEmployeeTodaySchedule(String token) async {
    final json = await _request(
      'GET',
      '/api/employee/work-schedules/today',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap> getEmployeeMonthlySchedule({
    required String token,
    required String month,
  }) async {
    final json = await _request(
      'GET',
      '/api/employee/work-schedules/monthly',
      token: token,
      query: {
        'month': month,
      },
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap> getEmployeeTodayAttendance(String token) async {
    final json = await _request(
      'GET',
      '/api/employee/attendance/today',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap> employeeCheckIn(String token) async {
    final json = await _request(
      'POST',
      '/api/employee/attendance/check-in',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap> employeeCheckOut(String token) async {
    final json = await _request(
      'POST',
      '/api/employee/attendance/check-out',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<AdminListResult> getEmployeeAttendanceHistory({
    required String token,
    required String fromDate,
    required String toDate,
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/employee/attendance/history',
      token: token,
      query: {
        'fromDate': fromDate,
        'toDate': toDate,
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return AdminListResult.fromPagedJson(json);
  }

  Future<AdminListResult> getEmployeeNotifications({
    required String token,
    int page = 0,
    int size = 20,
    bool? read,
  }) async {
    final json = await _request(
      'GET',
      '/api/employee/notifications',
      token: token,
      query: {
        'page': '$page',
        'size': '$size',
        'read': read == null ? null : '$read',
      },
    ) as JsonMap;
    return AdminListResult.fromPagedJson(json);
  }

  Future<int> getEmployeeNotificationUnreadCount(String token) async {
    final json = await _request(
      'GET',
      '/api/employee/notifications/unread-count',
      token: token,
    ) as JsonMap;
    return asInt(json['unreadCount']);
  }

  Future<JsonMap> markEmployeeNotification({
    required String token,
    required int notificationId,
    required bool read,
  }) async {
    final action = read ? 'read' : 'unread';
    final json = await _request(
      'PUT',
      '/api/employee/notifications/$notificationId/$action',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<MessageResponse> markAllEmployeeNotificationsRead(String token) async {
    final json = await _request(
      'PUT',
      '/api/employee/notifications/read-all',
      token: token,
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<List<UserNotificationItem>> getAdminNotifications({
    required String token,
    bool? read,
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/admin/notifications',
      token: token,
      query: {
        'read': read == null ? null : '$read',
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<UserNotificationItem>.fromJson(json, UserNotificationItem.fromJson).items;
  }

  Future<int> getAdminNotificationUnreadCount(String token) async {
    final json = await _request(
      'GET',
      '/api/admin/notifications/unread-count',
      token: token,
    ) as JsonMap;
    return asInt(json['unreadCount']);
  }

  Future<UserNotificationItem> markAdminNotification({
    required String token,
    required int notificationId,
    required bool read,
  }) async {
    final action = read ? 'read' : 'unread';
    final json = await _request(
      'PUT',
      '/api/admin/notifications/$notificationId/$action',
      token: token,
    ) as JsonMap;
    return UserNotificationItem.fromJson(json);
  }

  Future<MessageResponse> markAllAdminNotificationsRead(String token) async {
    final json = await _request(
      'PUT',
      '/api/admin/notifications/read-all',
      token: token,
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<JsonMap> createAdminResource({
    required String token,
    required String path,
    required JsonMap body,
  }) async {
    final json = await _request(
      'POST',
      path,
      token: token,
      body: body,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap> updateAdminResource({
    required String token,
    required String path,
    required JsonMap body,
  }) async {
    final json = await _request(
      'PUT',
      path,
      token: token,
      body: body,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<MessageResponse> deleteAdminResource({
    required String token,
    required String path,
  }) async {
    final json = await _request(
      'DELETE',
      path,
      token: token,
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<JsonMap> updateAdminUserVerification({
    required String token,
    required int userId,
    required bool verified,
  }) async {
    final json = await _request(
      'PUT',
      '/api/admin/users/$userId/verification',
      token: token,
      body: {
        'verified': verified,
      },
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap> updateAdminOrderStatus({
    required String token,
    required int orderId,
    required JsonMap body,
  }) async {
    final json = await _request(
      'PUT',
      '/api/admin/orders/$orderId/status',
      token: token,
      body: body,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<JsonMap?> getAdminFeedbackReply({
    required String token,
    required int feedbackId,
  }) async {
    try {
      final json = await _request(
        'GET',
        '/api/admin/feedbacks/$feedbackId/reply',
        token: token,
      ) as JsonMap;
      return Map<String, dynamic>.from(json);
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  Future<JsonMap> upsertAdminFeedbackReply({
    required String token,
    required int feedbackId,
    required String replyMessage,
  }) async {
    final json = await _request(
      'PUT',
      '/api/admin/feedbacks/$feedbackId/reply',
      token: token,
      body: {
        'replyMessage': replyMessage,
      },
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<MessageResponse> deleteAdminFeedbackReply({
    required String token,
    required int feedbackId,
  }) async {
    final json = await _request(
      'DELETE',
      '/api/admin/feedbacks/$feedbackId/reply',
      token: token,
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<List<String>> uploadAdminImages({
    required String token,
    required List<String> filePaths,
    String? folder,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      config.buildUri('/api/admin/uploads/images'),
    );
    request.headers.addAll({
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    });
    if ((folder ?? '').trim().isNotEmpty) {
      request.fields['folder'] = folder!.trim();
    }
    for (final path in filePaths) {
      request.files.add(await http.MultipartFile.fromPath('files', path));
    }
    final response = await _sendMultipart(request);
    return asStringList(response['paths']);
  }

  Future<JsonMap?> uploadEmployeeDeliveryProof({
    required String token,
    required int orderId,
    required String filePath,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      config.buildUri('/api/employee/orders/$orderId/delivery-proof'),
    );
    request.headers.addAll({
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    });
    request.files.add(await http.MultipartFile.fromPath('file', filePath));
    try {
      final response = await _sendMultipart(request);
      return response;
    } on ApiException catch (error) {
      if (error.statusCode == 404 || error.statusCode == 405 || error.statusCode == 501) {
        return null;
      }
      rethrow;
    }
  }

  Future<void> logout(String token) async {
    await _request('POST', '/api/auth/logout', token: token);
  }

  Future<Cart> getCart(String token) async {
    final json = await _request('GET', '/api/user/cart', token: token) as JsonMap;
    return Cart.fromJson(json);
  }

  Future<Cart> addCartItem({
    required String token,
    required int storeId,
    required int dishId,
    required int quantity,
  }) async {
    final json = await _request(
      'POST',
      '/api/user/cart/items',
      token: token,
      body: {
        'storeId': storeId,
        'dishId': dishId,
        'quantity': quantity,
      },
    ) as JsonMap;
    return Cart.fromJson(json);
  }

  Future<Cart> updateCartItem({
    required String token,
    required int cartItemId,
    required int storeId,
    required int dishId,
    required int quantity,
  }) async {
    final json = await _request(
      'PUT',
      '/api/user/cart/items/$cartItemId',
      token: token,
      body: {
        'storeId': storeId,
        'dishId': dishId,
        'quantity': quantity,
      },
    ) as JsonMap;
    return Cart.fromJson(json);
  }

  Future<Cart> removeCartItem({
    required String token,
    required int cartItemId,
  }) async {
    final json = await _request(
      'DELETE',
      '/api/user/cart/items/$cartItemId',
      token: token,
    ) as JsonMap;
    return Cart.fromJson(json);
  }

  Future<void> clearCart(String token) async {
    await _request('DELETE', '/api/user/cart', token: token);
  }

  Future<List<OrderSummary>> getOrders(String token) async {
    final json = await _request(
      'GET',
      '/api/user/orders',
      token: token,
      query: const {
        'page': '0',
        'size': '20',
      },
    ) as JsonMap;
    return PageResponse<OrderSummary>.fromJson(json, OrderSummary.fromJson).items;
  }

  Future<OrderDetail> getOrderDetail({
    required String token,
    required int orderId,
  }) async {
    final json = await _request(
      'GET',
      '/api/user/orders/$orderId',
      token: token,
    ) as JsonMap;
    return OrderDetail.fromJson(json);
  }

  Future<OrderDetail> refreshOrderPayment({
    required String token,
    required int orderId,
  }) async {
    final json = await _request(
      'POST',
      '/api/user/orders/$orderId/refresh-payment',
      token: token,
    ) as JsonMap;
    return OrderDetail.fromJson(json);
  }

  Future<JsonMap> getOrderInvoice({
    required String token,
    required int orderId,
  }) async {
    final json = await _request(
      'GET',
      '/api/user/orders/$orderId/invoice',
      token: token,
    ) as JsonMap;
    return Map<String, dynamic>.from(json);
  }

  Future<List<FavoriteItem>> getFavorites({
    required String token,
    String? targetType,
    bool? purchasedOnly,
  }) async {
    final json = await _request(
      'GET',
      '/api/user/favorites',
      token: token,
      query: {
        'targetType': targetType,
        'purchasedOnly': purchasedOnly == null ? null : '$purchasedOnly',
      },
    );
    if (json is List) {
      return json
          .whereType<Map>()
          .map((item) => FavoriteItem.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
    return const [];
  }

  Future<FavoriteItem> addFavorite({
    required String token,
    required String targetType,
    required int targetId,
  }) async {
    final json = await _request(
      'POST',
      '/api/user/favorites',
      token: token,
      body: {
        'targetType': targetType,
        'targetId': targetId,
      },
    ) as JsonMap;
    return FavoriteItem.fromJson(json);
  }

  Future<MessageResponse> removeFavorite({
    required String token,
    required String targetType,
    required int targetId,
  }) async {
    final json = await _request(
      'DELETE',
      '/api/user/favorites',
      token: token,
      body: {
        'targetType': targetType,
        'targetId': targetId,
      },
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<List<UserLevel>> getUserLevels({
    required String token,
    int? storeId,
  }) async {
    final json = await _request(
      'GET',
      '/api/user/levels/current',
      token: token,
      query: {
        'storeId': storeId == null ? null : '$storeId',
      },
    );
    if (json is List) {
      return json
          .whereType<Map>()
          .map((item) => UserLevel.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
    return const [];
  }

  Future<List<UserReview>> getUserReviews({
    required String token,
    String? targetType,
    String sort = 'date_desc',
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/user/reviews',
      token: token,
      query: {
        'targetType': targetType,
        'sort': sort,
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<UserReview>.fromJson(json, UserReview.fromJson).items;
  }

  Future<UserReview> createUserReview({
    required String token,
    required String targetType,
    required int targetId,
    required double rating,
    required String title,
    required String comment,
  }) async {
    final json = await _request(
      'POST',
      '/api/user/reviews',
      token: token,
      body: {
        'targetType': targetType,
        'targetId': targetId,
        'rating': rating,
        'title': title,
        'comment': comment,
      },
    ) as JsonMap;
    return UserReview.fromJson(json);
  }

  Future<UserReview> updateUserReview({
    required String token,
    required int reviewId,
    required String targetType,
    required int targetId,
    required double rating,
    required String title,
    required String comment,
  }) async {
    final json = await _request(
      'PUT',
      '/api/user/reviews/$reviewId',
      token: token,
      body: {
        'targetType': targetType,
        'targetId': targetId,
        'rating': rating,
        'title': title,
        'comment': comment,
      },
    ) as JsonMap;
    return UserReview.fromJson(json);
  }

  Future<MessageResponse> deleteUserReview({
    required String token,
    required int reviewId,
  }) async {
    final json = await _request(
      'DELETE',
      '/api/user/reviews/$reviewId',
      token: token,
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<List<CustomerFeedback>> getUserFeedbacks({
    required String token,
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/user/feedbacks',
      token: token,
      query: {
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<CustomerFeedback>.fromJson(json, CustomerFeedback.fromJson).items;
  }

  Future<CustomerFeedback> createUserFeedback({
    required String token,
    required String category,
    int? relatedStoreId,
    int? relatedOrderId,
    required String subject,
    required String message,
  }) async {
    final json = await _request(
      'POST',
      '/api/user/feedbacks',
      token: token,
      body: {
        'category': category,
        if (relatedStoreId != null) 'relatedStoreId': relatedStoreId,
        if (relatedOrderId != null) 'relatedOrderId': relatedOrderId,
        'subject': subject,
        'message': message,
      },
    ) as JsonMap;
    return CustomerFeedback.fromJson(json);
  }

  Future<MessageResponse> deleteUserFeedback({
    required String token,
    required int feedbackId,
  }) async {
    final json = await _request(
      'DELETE',
      '/api/user/feedbacks/$feedbackId',
      token: token,
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<List<UserNotificationItem>> getUserNotifications({
    required String token,
    bool? read,
    int page = 0,
    int size = 20,
  }) async {
    final json = await _request(
      'GET',
      '/api/user/notifications',
      token: token,
      query: {
        'read': read == null ? null : '$read',
        'page': '$page',
        'size': '$size',
      },
    ) as JsonMap;
    return PageResponse<UserNotificationItem>.fromJson(json, UserNotificationItem.fromJson).items;
  }

  Future<int> getUserNotificationUnreadCount(String token) async {
    final json = await _request(
      'GET',
      '/api/user/notifications/unread-count',
      token: token,
    ) as JsonMap;
    return asInt(json['unreadCount']);
  }

  Future<UserNotificationItem> markUserNotification({
    required String token,
    required int notificationId,
    required bool read,
  }) async {
    final action = read ? 'read' : 'unread';
    final json = await _request(
      'PUT',
      '/api/user/notifications/$notificationId/$action',
      token: token,
    ) as JsonMap;
    return UserNotificationItem.fromJson(json);
  }

  Future<MessageResponse> markAllUserNotificationsRead(String token) async {
    final json = await _request(
      'PUT',
      '/api/user/notifications/read-all',
      token: token,
    ) as JsonMap;
    return MessageResponse.fromJson(json);
  }

  Future<List<SupportStore>> getSupportStores(String token) async {
    final json = await _request(
      'GET',
      '/api/support-chat/stores',
      token: token,
    ) as JsonMap;
    return asObjectList(json['items'], SupportStore.fromJson);
  }

  Future<List<DeliveryAddress>> getDeliveryAddresses(String token) async {
    final json = await _request('GET', '/api/user/delivery-addresses', token: token);
    if (json is List) {
      return json
          .whereType<Map>()
          .map((item) => DeliveryAddress.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
    return const [];
  }

  Future<DeliveryAddress> createDeliveryAddress({
    required String token,
    required String fullName,
    required String phoneNumber,
    required String deliveryAddress,
    bool primary = false,
  }) async {
    final json = await _request(
      'POST',
      '/api/user/delivery-addresses',
      token: token,
      body: {
        'fullName': fullName,
        'phoneNumber': phoneNumber,
        'deliveryAddress': deliveryAddress,
        'primary': primary,
      },
    ) as JsonMap;
    return DeliveryAddress.fromJson(json);
  }

  Future<DeliveryAddress> updateDeliveryAddress({
    required String token,
    required int addressId,
    required String fullName,
    required String phoneNumber,
    required String deliveryAddress,
    bool primary = false,
  }) async {
    final json = await _request(
      'PUT',
      '/api/user/delivery-addresses/$addressId',
      token: token,
      body: {
        'fullName': fullName,
        'phoneNumber': phoneNumber,
        'deliveryAddress': deliveryAddress,
        'primary': primary,
      },
    ) as JsonMap;
    return DeliveryAddress.fromJson(json);
  }

  Future<DeliveryAddress> setPrimaryDeliveryAddress({
    required String token,
    required int addressId,
  }) async {
    final json = await _request(
      'PUT',
      '/api/user/delivery-addresses/$addressId/primary',
      token: token,
    ) as JsonMap;
    return DeliveryAddress.fromJson(json);
  }

  Future<void> deleteDeliveryAddress({
    required String token,
    required int addressId,
  }) async {
    await _request(
      'DELETE',
      '/api/user/delivery-addresses/$addressId',
      token: token,
    );
  }

  Future<CheckoutResult> checkout({
    required String token,
    required int deliveryAddressId,
    required String returnUrl,
    required String cancelUrl,
    String deliveryType = 'DELIVERY',
    String promotionCode = '',
    DateTime? scheduledDeliveryAt,
  }) async {
    final body = <String, dynamic>{
      'deliveryAddressId': deliveryAddressId,
      'deliveryType': deliveryType,
      'returnUrl': returnUrl,
      'cancelUrl': cancelUrl,
    };
    if (promotionCode.isNotEmpty) {
      body['promotionCode'] = promotionCode;
    }
    if (scheduledDeliveryAt != null) {
      body['scheduledDeliveryAt'] = scheduledDeliveryAt.toUtc().toIso8601String();
    }

    final json = await _request(
      'POST',
      '/api/user/cart/checkout',
      token: token,
      body: body,
    ) as JsonMap;
    return CheckoutResult.fromJson(json);
  }

  Future<dynamic> _request(
    String method,
    String path, {
    String? token,
    Map<String, String?> query = const {},
    Object? body,
  }) async {
    final request = http.Request(method, config.buildUri(path, query));
    request.headers.addAll({
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    });
    if (body != null) {
      request.body = jsonEncode(body);
    }

    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);

    dynamic decoded;
    if (response.body.isNotEmpty) {
      decoded = jsonDecode(response.body);
    }

    if (response.statusCode >= 400) {
      final message = _extractErrorMessage(decoded) ?? 'Request failed with status ${response.statusCode}.';
      if (response.statusCode == 401 && onUnauthorized != null) {
        await onUnauthorized!(
          ApiUnauthorizedSignal(
            message: message,
            path: path,
            hadToken: token != null && token.isNotEmpty,
          ),
        );
      }
      throw ApiException(
        message,
        statusCode: response.statusCode,
      );
    }

    return decoded ?? const {};
  }

  Future<JsonMap> _sendMultipart(http.MultipartRequest request) async {
    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);

    dynamic decoded;
    if (response.body.isNotEmpty) {
      decoded = jsonDecode(response.body);
    }

    if (response.statusCode >= 400) {
      final message = _extractErrorMessage(decoded) ?? 'Request failed with status ${response.statusCode}.';
      if (response.statusCode == 401 && onUnauthorized != null) {
        await onUnauthorized!(
          ApiUnauthorizedSignal(
            message: message,
            path: request.url.path,
            hadToken: request.headers.containsKey('Authorization'),
          ),
        );
      }
      throw ApiException(
        message,
        statusCode: response.statusCode,
      );
    }

    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    if (decoded is Map) {
      return Map<String, dynamic>.from(decoded);
    }
    return const {};
  }

  String? _extractErrorMessage(dynamic decoded) {
    if (decoded is Map<String, dynamic>) {
      final message = decoded['message'];
      if (message is String && message.isNotEmpty) {
        return message;
      }
      final error = decoded['error'];
      if (error is String && error.isNotEmpty) {
        return error;
      }
    }
    return null;
  }
}
