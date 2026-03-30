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

class ApiService {
  ApiService({
    required this.config,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final AppConfig config;
  final http.Client _client;

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

  Future<AdminDashboard> getAdminDashboard(String token) async {
    final json = await _request('GET', '/api/admin/dashboard', token: token) as JsonMap;
    return AdminDashboard.fromJson(json);
  }

  Future<AdminSummary> getAdminSummary(String token) async {
    final json = await _request('GET', '/api/admin/summary', token: token) as JsonMap;
    return AdminSummary.fromJson(json);
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
    String deliveryType = 'IMMEDIATE',
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
      throw ApiException(
        _extractErrorMessage(decoded) ?? 'Request failed with status ${response.statusCode}.',
        statusCode: response.statusCode,
      );
    }

    return decoded ?? const {};
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
