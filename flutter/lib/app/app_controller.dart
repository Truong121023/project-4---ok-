import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/config/app_config.dart';
import '../core/models/models.dart';
import '../core/services/api_service.dart';
import '../core/services/mock_data.dart';
import '../core/services/session_store.dart';

class AppController extends ChangeNotifier {
  AppController._({
    required this.config,
    required this.api,
    required this.sessionStore,
  });

  static Future<AppController> create() async {
    final prefs = await SharedPreferences.getInstance();
    final config = await AppConfig.load();
    final controller = AppController._(
      config: config,
      api: ApiService(config: config),
      sessionStore: SessionStore(prefs),
    );
    controller.api.onUnauthorized = controller._handleUnauthorizedSignal;
    await controller.bootstrap();
    return controller;
  }

  final AppConfig config;
  final ApiService api;
  final SessionStore sessionStore;

  UserSession? session;
  Cart cart = Cart.empty();
  List<OrderSummary> orders = const [];
  List<DeliveryAddress> deliveryAddresses = const [];
  List<OrderProofRecord> orderProofRecords = const [];
  List<FavoriteItem> favoriteItems = const [];
  CheckoutResult? lastCheckout;
  String? pendingOrderQrToken;
  int userNotificationUnreadCount = 0;

  bool initialized = false;
  bool authBusy = false;
  bool cartBusy = false;
  bool addressBusy = false;
  bool checkoutBusy = false;
  bool hadAuthenticatedSession = false;
  bool logoutInProgress = false;
  String? authError;
  SessionInterruptionNotice? pendingSessionInterruption;

  bool get isLoggedIn => session != null;
  String get currentRole => session?.user.role.toUpperCase() ?? 'GUEST';
  bool get isAdmin => session?.user.role.toUpperCase() == 'ADMIN';
  bool get isManager => session?.user.role.toUpperCase() == 'MANAGER';
  bool get isStaff => session?.user.role.toUpperCase() == 'STAFF';
  bool get isShipper => session?.user.role.toUpperCase() == 'SHIPPER';
  bool get isEmployee => isStaff || isShipper;
  bool get isBackoffice => isAdmin || isManager;
  List<OrderProofRecord> get currentUserOrderProofRecords {
    final currentUserId = session?.user.id ?? 0;
    if (currentUserId == 0) {
      return const [];
    }
    final filtered = orderProofRecords.where((record) => record.userId == currentUserId).toList()
      ..sort((left, right) => right.completedAt.compareTo(left.completedAt));
    return filtered;
  }

  DeliveryAddress? get primaryDeliveryAddress {
    for (final address in deliveryAddresses) {
      if (address.primary) {
        return address;
      }
    }
    return deliveryAddresses.isEmpty ? null : deliveryAddresses.first;
  }

  SessionInterruptionNotice? consumePendingSessionInterruption() {
    final notice = pendingSessionInterruption;
    pendingSessionInterruption = null;
    return notice;
  }

  bool get isGuestCartActive => session == null;

  Future<void> bootstrap() async {
    session = sessionStore.loadSession();
    pendingOrderQrToken = sessionStore.loadPendingOrderQrToken();
    orderProofRecords = sessionStore.loadOrderProofRecords();
    hadAuthenticatedSession = session != null;
    cart = sessionStore.loadLocalCart();

    if (config.useMockData) {
      if (session != null) {
        orders = MockData.orders;
        favoriteItems = MockData.favorites;
        userNotificationUnreadCount =
            MockData.notifications.where((notification) => !notification.read).length;
      }
      deliveryAddresses = const [];
      initialized = true;
      notifyListeners();
      return;
    }

    if (session != null) {
      try {
        final currentUser = await api.getCurrentUser(session!.accessToken);
        session = session!.copyWith(user: currentUser);
        await sessionStore.saveSession(session!);
        hadAuthenticatedSession = true;
        await _syncLocalCartIntoAccount(session!.accessToken);
        await _loadProtectedState();
      } catch (_) {
        await _clearSessionLocally(
          clearHadAuthenticatedSession: pendingSessionInterruption == null,
        );
      }
    }

    initialized = true;
    notifyListeners();
  }

  Future<HomeBundle> loadHome() async {
    if (config.useMockData) {
      return MockData.home;
    }
    return api.getHome();
  }

  Future<AiChatResponse> queryAiChat({
    required String message,
    List<AiChatHistoryEntry> history = const [],
  }) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty) {
      throw ApiException('Nhap noi dung de hoi AI.');
    }
    if (config.useMockData) {
      return _mockAiChatResponse(trimmed);
    }
    return api.queryAiChat(
      token: _requireAuthenticatedToken(),
      message: trimmed,
      history: history,
    );
  }

  Future<List<StoreCard>> browseStores({
    String search = '',
    String sort = 'rating_desc',
  }) async {
    if (config.useMockData) {
      return MockData.browseStores(search: search);
    }
    return api.getStores(search: search, sort: sort);
  }

  Future<StoreDetail> loadStoreDetail(String storeKey) async {
    if (config.useMockData) {
      return MockData.storeDetail(storeKey);
    }
    return api.getStoreDetail(storeKey);
  }

  Future<List<DishCard>> browseDishes({
    String search = '',
    String sort = 'top_rated',
  }) async {
    if (config.useMockData) {
      return MockData.browseDishes(search: search, sort: sort);
    }
    return api.getDishes(search: search, sort: sort);
  }

  Future<DishDetail> loadDishDetail(int dishId) async {
    if (config.useMockData) {
      return MockData.dishDetail(dishId);
    }
    return api.getDishDetail(dishId);
  }

  Future<List<NewsCard>> browseNews({
    String search = '',
    bool? featured,
  }) async {
    if (config.useMockData) {
      return MockData.browseNews(search: search, featured: featured);
    }
    return api.getNews(search: search, featured: featured);
  }

  Future<NewsDetail> loadNewsDetail(String newsKey) async {
    if (config.useMockData) {
      return MockData.newsDetail(newsKey);
    }
    return api.getNewsDetail(newsKey);
  }

  Future<List<EventCard>> browseEvents({
    String search = '',
    String sort = 'date_asc',
  }) async {
    if (config.useMockData) {
      return MockData.browseEvents(search: search, sort: sort);
    }
    return api.getEvents(search: search, sort: sort);
  }

  Future<EventDetail> loadEventDetail(String eventKey) async {
    if (config.useMockData) {
      return MockData.eventDetail(eventKey);
    }
    return api.getEventDetail(eventKey);
  }

  Future<AdminDashboard> loadAdminDashboard({
    int? storeId,
  }) async {
    if (config.useMockData) {
      return const AdminDashboard(
        users: [],
        stores: [],
        events: [],
        categories: [],
        dishes: [],
        storeDishes: [],
        orders: [],
        reviews: [],
        feedbacks: [],
        promotions: [],
        news: [],
        topSellingDishes: [],
        revenue: AdminRevenueSummary(
          scopeStoreId: null,
          scopeStoreName: '',
          todayRevenue: 0,
          weekRevenue: 0,
          monthRevenue: 0,
          yearRevenue: 0,
        ),
      );
    }
    return api.getAdminDashboard(
      _requireBackofficeToken(),
      storeId: storeId,
    );
  }

  Future<AdminSummary> loadAdminSummary({
    int? storeId,
  }) async {
    if (config.useMockData) {
      return const AdminSummary(
        userCount: 0,
        storeCount: 0,
        eventCount: 0,
        categoryCount: 0,
        dishCount: 0,
        storeDishCount: 0,
        promotionCount: 0,
        orderCount: 0,
        reviewCount: 0,
        newsCount: 0,
        revenue: AdminRevenueSummary(
          scopeStoreId: null,
          scopeStoreName: '',
          todayRevenue: 0,
          weekRevenue: 0,
          monthRevenue: 0,
          yearRevenue: 0,
        ),
      );
    }
    return api.getAdminSummary(
      _requireBackofficeToken(),
      storeId: storeId,
    );
  }

  Future<AdminListResult> loadAdminCollection({
    required String path,
    bool paged = true,
    String search = '',
    int page = 0,
    int size = 20,
    Map<String, String?> query = const {},
  }) async {
    if (config.useMockData) {
      return AdminListResult(
        items: [],
        page: 0,
        size: 0,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        paged: paged,
      );
    }
    return api.getAdminCollection(
      token: _requireBackofficeToken(),
      path: path,
      paged: paged,
      search: search,
      page: page,
      size: size,
      query: query,
    );
  }

  Future<JsonMap> loadAdminResource({
    required String path,
    Map<String, String?> query = const {},
  }) async {
    if (config.useMockData) {
      return const {};
    }
    return api.getAdminResource(
      token: _requireBackofficeToken(),
      path: path,
      query: query,
    );
  }

  Future<JsonMap> createAdminResource({
    required String path,
    required JsonMap body,
  }) {
    if (config.useMockData) {
      return Future.value(body);
    }
    return api.createAdminResource(
      token: _requireBackofficeToken(),
      path: path,
      body: body,
    );
  }

  Future<JsonMap> updateAdminResource({
    required String path,
    required JsonMap body,
  }) {
    if (config.useMockData) {
      return Future.value(body);
    }
    return api.updateAdminResource(
      token: _requireBackofficeToken(),
      path: path,
      body: body,
    );
  }

  Future<AdminAiFormDraft> generateAdminAiFormDraft({
    required String formType,
    required String prompt,
    int? storeId,
    JsonMap currentForm = const {},
  }) {
    if (config.useMockData) {
      return Future.value(
        AdminAiFormDraft(
          formType: formType,
          draft: currentForm,
          warnings: const ['Demo mode dang tra lai currentForm hien tai.'],
          missingFields: const [],
          scopeStoreId: storeId,
          scopeStoreName: session?.user.workingStoreName,
          model: 'mock',
        ),
      );
    }
    return api.generateAdminAiFormDraft(
      token: _requireBackofficeToken(),
      formType: formType,
      prompt: prompt,
      storeId: storeId,
      currentForm: currentForm,
    );
  }

  Future<MessageResponse> deleteAdminResource({
    required String path,
  }) {
    if (config.useMockData) {
      return Future.value(const MessageResponse(message: 'Mock delete successful'));
    }
    return api.deleteAdminResource(
      token: _requireBackofficeToken(),
      path: path,
    );
  }

  Future<JsonMap> updateAdminUserVerification({
    required int userId,
    required bool verified,
  }) {
    if (config.useMockData) {
      return Future.value({
        'id': userId,
        'verified': verified,
      });
    }
    return api.updateAdminUserVerification(
      token: _requireBackofficeToken(),
      userId: userId,
      verified: verified,
    );
  }

  Future<JsonMap> updateAdminOrderStatus({
    required int orderId,
    required JsonMap body,
  }) {
    if (config.useMockData) {
      return Future.value({
        'id': orderId,
        ...body,
      });
    }
    return api.updateAdminOrderStatus(
      token: _requireBackofficeToken(),
      orderId: orderId,
      body: body,
    );
  }

  Future<JsonMap?> loadAdminFeedbackReply(int feedbackId) {
    if (config.useMockData) {
      return Future.value(null);
    }
    return api.getAdminFeedbackReply(
      token: _requireBackofficeToken(),
      feedbackId: feedbackId,
    );
  }

  Future<JsonMap> upsertAdminFeedbackReply({
    required int feedbackId,
    required String replyMessage,
  }) {
    if (config.useMockData) {
      return Future.value({
        'feedbackId': feedbackId,
        'replyMessage': replyMessage,
      });
    }
    return api.upsertAdminFeedbackReply(
      token: _requireBackofficeToken(),
      feedbackId: feedbackId,
      replyMessage: replyMessage,
    );
  }

  Future<MessageResponse> deleteAdminFeedbackReply(int feedbackId) {
    if (config.useMockData) {
      return Future.value(const MessageResponse(message: 'Mock reply deleted'));
    }
    return api.deleteAdminFeedbackReply(
      token: _requireBackofficeToken(),
      feedbackId: feedbackId,
    );
  }

  Future<List<String>> uploadAdminImages({
    required List<String> filePaths,
    String? folder,
  }) {
    if (config.useMockData) {
      return Future.value(filePaths);
    }
    return api.uploadAdminImages(
      token: _requireBackofficeToken(),
      filePaths: filePaths,
      folder: folder,
    );
  }

  Future<AdminListResult> loadEmployeeOrders({
    String search = '',
    int page = 0,
    int size = 20,
    bool? mine,
  }) async {
    if (config.useMockData) {
      return const AdminListResult(
        items: [],
        page: 0,
        size: 0,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        paged: true,
      );
    }
    return api.getEmployeeOrders(
      token: _requireEmployeeToken(),
      search: search,
      page: page,
      size: size,
      mine: mine,
    );
  }

  Future<JsonMap> loadEmployeeOrderDetail(int orderId) {
    if (config.useMockData) {
      return Future.value(const {});
    }
    return api.getEmployeeOrderDetail(
      token: _requireEmployeeToken(),
      orderId: orderId,
    );
  }

  Future<JsonMap> runEmployeeOrderAction({
    required int orderId,
    required String action,
  }) {
    if (config.useMockData) {
      return Future.value(<String, dynamic>{
        'id': orderId,
        'statusSummary': 'Mock action completed',
      });
    }
    return api.runEmployeeOrderAction(
      token: _requireEmployeeToken(),
      orderId: orderId,
      action: action,
    );
  }

  Future<MobileOrderQrResolveResponse> resolveOrderQr(String qrToken) async {
      if (config.useMockData) {
        throw ApiException('Tinh nang QR chi san sang khi app dang ket noi may chu that.');
      }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap truoc khi xu ly QR don hang.');
    }
    final result = await api.resolveMobileOrderQr(
      token: currentSession.accessToken,
      qrToken: qrToken,
    );
    await clearPendingOrderQrToken();
    if (currentSession.user.role.toUpperCase() == 'USER') {
      try {
        await refreshOrders();
      } catch (_) {
        // Keep the resolved order on-screen even if the list refresh fails.
      }
    }
    notifyListeners();
    return result;
  }

  Future<void> savePendingOrderQrToken(String token) async {
    pendingOrderQrToken = token.trim();
    await sessionStore.savePendingOrderQrToken(pendingOrderQrToken!);
    notifyListeners();
  }

  Future<void> clearPendingOrderQrToken() async {
    pendingOrderQrToken = null;
    await sessionStore.clearPendingOrderQrToken();
    notifyListeners();
  }

  Future<void> saveOrderProofRecord({
    required String role,
    required JsonMap orderSnapshot,
    String? photoPath,
  }) async {
    final currentUserId = session?.user.id ?? 0;
    if (currentUserId == 0) {
      throw ApiException('Can dang nhap de luu lich su giao don.');
    }
    final nextRecord = OrderProofRecord(
      orderId: asInt(orderSnapshot['id']),
      userId: currentUserId,
      role: role.toUpperCase(),
      completedAt: DateTime.now(),
      orderSnapshot: Map<String, dynamic>.from(orderSnapshot),
      photoPath: photoPath,
    );
    final remaining = orderProofRecords
        .where(
          (record) =>
              !(record.userId == currentUserId &&
                  record.orderId == nextRecord.orderId &&
                  record.role == nextRecord.role),
        )
        .toList();
    orderProofRecords = [nextRecord, ...remaining]
      ..sort((left, right) => right.completedAt.compareTo(left.completedAt));
    await sessionStore.saveOrderProofRecords(orderProofRecords);
    notifyListeners();
  }

  Future<JsonMap?> uploadEmployeeDeliveryProof({
    required int orderId,
    required String filePath,
  }) {
    if (config.useMockData) {
      return Future.value({
        'orderId': orderId,
        'imagePath': filePath,
      });
    }
    return api.uploadEmployeeDeliveryProof(
      token: _requireEmployeeToken(),
      orderId: orderId,
      filePath: filePath,
    );
  }

  OrderProofRecord? findOrderProofRecord(int orderId) {
    final currentUserId = session?.user.id ?? 0;
    for (final record in orderProofRecords) {
      if (record.userId == currentUserId && record.orderId == orderId) {
        return record;
      }
    }
    return null;
  }

  Future<JsonMap?> loadEmployeeTodaySchedule() async {
    if (config.useMockData) {
      return null;
    }
    try {
      return await api.getEmployeeTodaySchedule(_requireEmployeeToken());
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  Future<JsonMap> loadEmployeeMonthlySchedule(String month) {
    if (config.useMockData) {
      return Future.value(<String, dynamic>{
        'month': month,
        'items': const [],
      });
    }
    return api.getEmployeeMonthlySchedule(
      token: _requireEmployeeToken(),
      month: month,
    );
  }

  Future<JsonMap?> loadEmployeeTodayAttendance() async {
    if (config.useMockData) {
      return null;
    }
    try {
      return await api.getEmployeeTodayAttendance(_requireEmployeeToken());
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  Future<JsonMap> employeeCheckIn() {
    if (config.useMockData) {
      return Future.value(const {'checkedIn': true});
    }
    return api.employeeCheckIn(_requireEmployeeToken());
  }

  Future<JsonMap> employeeCheckOut() {
    if (config.useMockData) {
      return Future.value(const {'checkedOut': true});
    }
    return api.employeeCheckOut(_requireEmployeeToken());
  }

  Future<AdminListResult> loadEmployeeAttendanceHistory({
    required String fromDate,
    required String toDate,
    int page = 0,
    int size = 20,
  }) async {
    if (config.useMockData) {
      return const AdminListResult(
        items: [],
        page: 0,
        size: 0,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        paged: true,
      );
    }
    return api.getEmployeeAttendanceHistory(
      token: _requireEmployeeToken(),
      fromDate: fromDate,
      toDate: toDate,
      page: page,
      size: size,
    );
  }

  Future<AdminListResult> loadEmployeeNotifications({
    int page = 0,
    int size = 20,
    bool? read,
  }) async {
    if (config.useMockData) {
      return const AdminListResult(
        items: [],
        page: 0,
        size: 0,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        paged: true,
      );
    }
    return api.getEmployeeNotifications(
      token: _requireEmployeeToken(),
      page: page,
      size: size,
      read: read,
    );
  }

  Future<int> loadEmployeeNotificationUnreadCount() async {
    if (config.useMockData) {
      return 0;
    }
    return api.getEmployeeNotificationUnreadCount(_requireEmployeeToken());
  }

  Future<JsonMap> markEmployeeNotification({
    required int notificationId,
    required bool read,
  }) {
    if (config.useMockData) {
      return Future.value({'id': notificationId, 'read': read});
    }
    return api.markEmployeeNotification(
      token: _requireEmployeeToken(),
      notificationId: notificationId,
      read: read,
    );
  }

  Future<MessageResponse> markAllEmployeeNotificationsRead() {
    if (config.useMockData) {
      return Future.value(const MessageResponse(message: 'Mock notifications marked as read'));
    }
    return api.markAllEmployeeNotificationsRead(_requireEmployeeToken());
  }

  Future<List<UserNotificationItem>> loadAdminNotifications({
    bool? read,
    int page = 0,
    int size = 20,
  }) async {
    if (config.useMockData) {
      return const [];
    }
    return api.getAdminNotifications(
      token: _requireBackofficeToken(),
      read: read,
      page: page,
      size: size,
    );
  }

  Future<int> loadAdminNotificationUnreadCount() async {
    if (config.useMockData) {
      return 0;
    }
    return api.getAdminNotificationUnreadCount(_requireBackofficeToken());
  }

  Future<UserNotificationItem> markAdminNotification({
    required int notificationId,
    required bool read,
  }) {
    if (config.useMockData) {
      return Future.value(
        UserNotificationItem(
          id: notificationId,
          type: 'ORDER_STATUS',
          title: 'Mock notification',
          message: 'Mock notification',
          relatedOrderId: null,
          orderId: null,
          relatedEventId: null,
          eventId: null,
          relatedEventSlug: null,
          eventSlug: null,
          relatedNewsId: null,
          newsId: null,
          relatedNewsSlug: null,
          newsSlug: null,
          relatedStoreId: null,
          relatedStoreName: null,
          actionUrl: null,
          read: read,
          readAt: read ? DateTime.now() : null,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
      );
    }
    return api.markAdminNotification(
      token: _requireBackofficeToken(),
      notificationId: notificationId,
      read: read,
    );
  }

  Future<MessageResponse> markAllAdminNotificationsRead() {
    if (config.useMockData) {
      return Future.value(const MessageResponse(message: 'Mock notifications marked as read'));
    }
    return api.markAllAdminNotificationsRead(_requireBackofficeToken());
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    authBusy = true;
    authError = null;
    pendingSessionInterruption = null;
    notifyListeners();

    try {
      if (config.useMockData) {
        session = MockData.sessionFor(email);
        await sessionStore.saveSession(session!);
        hadAuthenticatedSession = true;
        orders = MockData.orders;
        favoriteItems = MockData.favorites;
        userNotificationUnreadCount =
            MockData.notifications.where((notification) => !notification.read).length;
        cart = sessionStore.loadLocalCart();
      } else {
        final loggedIn = await api.login(email: email, password: password);
        final currentUser = await api.getCurrentUser(loggedIn.accessToken);
        session = loggedIn.copyWith(user: currentUser);
        await sessionStore.saveSession(session!);
        hadAuthenticatedSession = true;
        await _syncLocalCartIntoAccount(session!.accessToken);
        await _loadProtectedState();
      }
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } catch (_) {
      authError = 'Khong the dang nhap luc nay.';
      rethrow;
    } finally {
      authBusy = false;
      notifyListeners();
    }
  }

  Future<UserSession> loginWithGoogle({
    required String idToken,
  }) async {
    authBusy = true;
    authError = null;
    pendingSessionInterruption = null;
    notifyListeners();

    try {
      if (config.useMockData) {
        session = MockData.sessionFor('google.user@example.com');
        await sessionStore.saveSession(session!);
        hadAuthenticatedSession = true;
        orders = MockData.orders;
        favoriteItems = MockData.favorites;
        userNotificationUnreadCount =
            MockData.notifications.where((notification) => !notification.read).length;
        cart = sessionStore.loadLocalCart();
      } else {
        session = await api.googleLogin(idToken: idToken);
        await sessionStore.saveSession(session!);
        hadAuthenticatedSession = true;
        await _syncLocalCartIntoAccount(session!.accessToken);
        await _loadProtectedState();
      }
      return session!;
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } catch (_) {
      authError = 'Khong the dang nhap bang Google luc nay.';
      rethrow;
    } finally {
      authBusy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    final currentSession = session;
    logoutInProgress = true;
    pendingSessionInterruption = null;
    await _clearSessionLocally();
    try {
      if (!config.useMockData && currentSession != null) {
        try {
          await api.logout(currentSession.accessToken);
        } catch (_) {
          // Ignore logout cleanup errors.
        }
      }
    } finally {
      logoutInProgress = false;
      notifyListeners();
    }
  }

  Future<void> refreshOrders() async {
    if (config.useMockData) {
      orders = MockData.orders;
      notifyListeners();
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      orders = const [];
      notifyListeners();
      return;
    }
    orders = await api.getOrders(currentSession.accessToken);
    notifyListeners();
  }

  Future<OrderDetail> loadOrderDetail(int orderId) async {
    if (config.useMockData) {
      return MockData.orderDetail(orderId);
    }
    return api.getOrderDetail(
      token: _requireUserToken(),
      orderId: orderId,
    );
  }

  Future<OrderDetail> refreshOrderPayment(int orderId) async {
    if (config.useMockData) {
      final detail = MockData.orderDetail(orderId);
      notifyListeners();
      return detail;
    }
    final detail = await api.refreshOrderPayment(
      token: _requireUserToken(),
      orderId: orderId,
    );
    await refreshOrders();
    return detail;
  }

  Future<List<FavoriteItem>> loadFavorites({
    String? targetType,
    bool? purchasedOnly,
  }) async {
    if (config.useMockData) {
      favoriteItems = MockData.favorites;
      notifyListeners();
      return favoriteItems;
    }
    favoriteItems = await api.getFavorites(
      token: _requireUserToken(),
      targetType: targetType,
      purchasedOnly: purchasedOnly,
    );
    notifyListeners();
    return favoriteItems;
  }

  bool isFavorite(String targetType, int targetId) {
    return favoriteItems.any(
      (item) => item.targetType.toUpperCase() == targetType.toUpperCase() && item.targetId == targetId,
    );
  }

  Future<bool> toggleFavorite({
    required String targetType,
    required int targetId,
    String? targetLabel,
    List<String> targetImagePaths = const [],
  }) async {
    final normalizedType = targetType.toUpperCase();
    final exists = isFavorite(normalizedType, targetId);
    if (config.useMockData) {
      if (exists) {
        favoriteItems = favoriteItems
            .where((item) => !(item.targetType.toUpperCase() == normalizedType && item.targetId == targetId))
            .toList();
      } else {
        favoriteItems = [
          FavoriteItem(
            id: DateTime.now().microsecondsSinceEpoch,
            targetType: normalizedType,
            targetId: targetId,
            targetSlug: null,
            targetLabel: targetLabel ?? '$normalizedType #$targetId',
            targetImagePaths: targetImagePaths,
            purchased: false,
            createdAt: DateTime.now(),
          ),
          ...favoriteItems,
        ];
      }
      notifyListeners();
      return !exists;
    }

    final token = _requireUserToken();
    if (exists) {
      await api.removeFavorite(
        token: token,
        targetType: normalizedType,
        targetId: targetId,
      );
      favoriteItems = favoriteItems
          .where((item) => !(item.targetType.toUpperCase() == normalizedType && item.targetId == targetId))
          .toList();
      notifyListeners();
      return false;
    }

    final favorite = await api.addFavorite(
      token: token,
      targetType: normalizedType,
      targetId: targetId,
    );
    favoriteItems = [
      favorite,
      ...favoriteItems.where(
        (item) => !(item.targetType.toUpperCase() == normalizedType && item.targetId == targetId),
      ),
    ];
    notifyListeners();
    return true;
  }

  Future<List<UserReview>> loadUserReviews({
    String? targetType,
    String sort = 'date_desc',
  }) async {
    if (config.useMockData) {
      return MockData.userReviews;
    }
    return api.getUserReviews(
      token: _requireUserToken(),
      targetType: targetType,
      sort: sort,
    );
  }

  Future<UserReview> saveUserReview({
    UserReview? existing,
    required String targetType,
    required int targetId,
    required double rating,
    required String title,
    required String comment,
  }) async {
    if (config.useMockData) {
      return UserReview(
        id: existing?.id ?? DateTime.now().microsecondsSinceEpoch,
        userId: session?.user.id ?? 0,
        userName: session?.user.fullName ?? 'Guest',
        userEmail: session?.user.email ?? 'guest@teamatcha.local',
        targetType: targetType,
        targetId: targetId,
        targetSlug: existing?.targetSlug,
        targetLabel: existing?.targetLabel ?? '$targetType #$targetId',
        targetImagePaths: existing?.targetImagePaths ?? const [],
        rating: rating,
        title: title,
        comment: comment,
        approved: true,
        createdAt: existing?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
      );
    }
    if (existing == null) {
      return api.createUserReview(
        token: _requireUserToken(),
        targetType: targetType,
        targetId: targetId,
        rating: rating,
        title: title,
        comment: comment,
      );
    }
    return api.updateUserReview(
      token: _requireUserToken(),
      reviewId: existing.id,
      targetType: targetType,
      targetId: targetId,
      rating: rating,
      title: title,
      comment: comment,
    );
  }

  Future<MessageResponse> deleteUserReview(int reviewId) {
    if (config.useMockData) {
      return Future.value(const MessageResponse(message: 'Mock review deleted'));
    }
    return api.deleteUserReview(
      token: _requireUserToken(),
      reviewId: reviewId,
    );
  }

  Future<List<CustomerFeedback>> loadUserFeedbacks() async {
    if (config.useMockData) {
      return MockData.feedbacks;
    }
    return api.getUserFeedbacks(token: _requireUserToken());
  }

  Future<CustomerFeedback> createUserFeedback({
    required String category,
    int? relatedStoreId,
    int? relatedOrderId,
    required String subject,
    required String message,
  }) async {
    if (config.useMockData) {
      return MockData.feedbacks.first;
    }
    return api.createUserFeedback(
      token: _requireUserToken(),
      category: category,
      relatedStoreId: relatedStoreId,
      relatedOrderId: relatedOrderId,
      subject: subject,
      message: message,
    );
  }

  Future<MessageResponse> deleteUserFeedback(int feedbackId) {
    if (config.useMockData) {
      return Future.value(const MessageResponse(message: 'Mock feedback deleted'));
    }
    return api.deleteUserFeedback(
      token: _requireUserToken(),
      feedbackId: feedbackId,
    );
  }

  Future<List<UserNotificationItem>> loadUserNotifications({
    bool? read,
  }) async {
    if (config.useMockData) {
      return MockData.notifications;
    }
    return api.getUserNotifications(
      token: _requireUserToken(),
      read: read,
    );
  }

  Future<int> loadUserNotificationUnreadCount() async {
    if (config.useMockData) {
      userNotificationUnreadCount =
          MockData.notifications.where((notification) => !notification.read).length;
      notifyListeners();
      return userNotificationUnreadCount;
    }
    userNotificationUnreadCount = await api.getUserNotificationUnreadCount(_requireUserToken());
    notifyListeners();
    return userNotificationUnreadCount;
  }

  Future<UserNotificationItem> markUserNotification({
    required int notificationId,
    required bool read,
  }) async {
    if (config.useMockData) {
      final current = MockData.notifications.firstWhere(
        (item) => item.id == notificationId,
        orElse: () => MockData.notifications.first,
      );
      final updated = UserNotificationItem(
        id: current.id,
        type: current.type,
        title: current.title,
        message: current.message,
        relatedOrderId: current.relatedOrderId,
        orderId: current.orderId,
        relatedEventId: current.relatedEventId,
        eventId: current.eventId,
        relatedEventSlug: current.relatedEventSlug,
        eventSlug: current.eventSlug,
        relatedNewsId: current.relatedNewsId,
        newsId: current.newsId,
        relatedNewsSlug: current.relatedNewsSlug,
        newsSlug: current.newsSlug,
        relatedStoreId: current.relatedStoreId,
        relatedStoreName: current.relatedStoreName,
        actionUrl: current.actionUrl,
        read: read,
        readAt: read ? DateTime.now() : null,
        createdAt: current.createdAt,
        updatedAt: DateTime.now(),
      );
      userNotificationUnreadCount = read ? 0 : 1;
      notifyListeners();
      return updated;
    }
    final updated = await api.markUserNotification(
      token: _requireUserToken(),
      notificationId: notificationId,
      read: read,
    );
    await loadUserNotificationUnreadCount();
    return updated;
  }

  Future<MessageResponse> markAllUserNotificationsRead() async {
    if (config.useMockData) {
      userNotificationUnreadCount = 0;
      notifyListeners();
      return const MessageResponse(message: 'Mock notifications marked as read');
    }
    final response = await api.markAllUserNotificationsRead(_requireUserToken());
    await loadUserNotificationUnreadCount();
    return response;
  }

  Future<List<UserLevel>> loadUserLevels({int? storeId}) async {
    if (config.useMockData) {
      return MockData.levels;
    }
    return api.getUserLevels(
      token: _requireUserToken(),
      storeId: storeId,
    );
  }

  Future<List<SupportStore>> loadSupportStores() async {
    if (config.useMockData) {
      return MockData.supportStores;
    }
    return api.getSupportStores(_requireUserToken());
  }

  Future<RegisterResult> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    authBusy = true;
    authError = null;
    notifyListeners();
    try {
      if (config.useMockData) {
        return RegisterResult(
          message: 'Mock register successful',
          userId: 1,
          email: email,
          role: 'USER',
          otpExpiresAt: DateTime.now().add(const Duration(minutes: 10)),
        );
      }
      return await api.register(
        fullName: fullName,
        email: email,
        password: password,
      );
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } finally {
      authBusy = false;
      notifyListeners();
    }
  }

  Future<VerifyOtpResult> verifyOtp({
    required String email,
    required String otp,
  }) async {
    authBusy = true;
    authError = null;
    notifyListeners();
    try {
      if (config.useMockData) {
        return VerifyOtpResult(
          message: 'Mock verify successful',
          user: MockData.sessionFor(email).user,
        );
      }
      return await api.verifyOtp(email: email, otp: otp);
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } finally {
      authBusy = false;
      notifyListeners();
    }
  }

  Future<PasswordResetOtpResult> requestPasswordResetOtp(String email) async {
    authBusy = true;
    authError = null;
    notifyListeners();
    try {
      if (config.useMockData) {
        return PasswordResetOtpResult(
          message: 'Mock OTP sent',
          email: email,
          otpExpiresAt: DateTime.now().add(const Duration(minutes: 10)),
        );
      }
      return await api.requestPasswordResetOtp(email);
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } finally {
      authBusy = false;
      notifyListeners();
    }
  }

  Future<MessageResponse> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    authBusy = true;
    authError = null;
    notifyListeners();
    try {
      if (config.useMockData) {
        return const MessageResponse(message: 'Mock password reset successful');
      }
      final result = await api.resetPassword(
        email: email,
        otp: otp,
        newPassword: newPassword,
      );
      final normalizedEmail = email.trim().toLowerCase();
      if (session?.user.email.trim().toLowerCase() == normalizedEmail) {
        await _clearSessionLocally();
        pendingSessionInterruption = const SessionInterruptionNotice(
          kind: SessionInterruptionKind.loginRequired,
          title: 'Mat khau da duoc thay doi',
          message: 'Ban vua doi mat khau thanh cong. Vui long dang nhap lai de tiep tuc su dung app.',
          primaryActionLabel: 'Dang nhap lai',
        );
        notifyListeners();
      }
      return result;
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } finally {
      authBusy = false;
      notifyListeners();
    }
  }

  Future<GoogleCompleteProfileResult> completeGoogleProfile({
    required String fullName,
    required String password,
  }) async {
    authBusy = true;
    authError = null;
    notifyListeners();
    try {
      final currentSession = session;
      if (currentSession == null) {
        throw ApiException('Can dang nhap bang Google truoc khi bo sung ho so.');
      }

      if (config.useMockData) {
        final updatedUser = currentSession.user.copyWith(
          fullName: fullName,
          profileCompleted: true,
        );
        session = currentSession.copyWith(user: updatedUser);
        await sessionStore.saveSession(session!);
        return GoogleCompleteProfileResult(
          message: 'Mock Google profile updated',
          user: updatedUser,
        );
      }

      final result = await api.completeGoogleProfile(
        token: currentSession.accessToken,
        fullName: fullName,
        password: password,
      );
      session = currentSession.copyWith(user: result.user);
      await sessionStore.saveSession(session!);
      return result;
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } finally {
      authBusy = false;
      notifyListeners();
    }
  }

  Future<void> loadCart() async {
    if (config.useMockData) {
      cart = sessionStore.loadLocalCart();
      notifyListeners();
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      cart = sessionStore.loadLocalCart();
      notifyListeners();
      return;
    }
    cart = await api.getCart(currentSession.accessToken);
    notifyListeners();
  }

  Future<void> loadDeliveryAddresses() async {
    if (config.useMockData) {
      deliveryAddresses = const [];
      notifyListeners();
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      deliveryAddresses = const [];
      notifyListeners();
      return;
    }
    addressBusy = true;
    notifyListeners();
    try {
      deliveryAddresses = await api.getDeliveryAddresses(currentSession.accessToken);
    } finally {
      addressBusy = false;
      notifyListeners();
    }
  }

  Future<void> saveDeliveryAddress({
    DeliveryAddress? existing,
    required String fullName,
    required String phoneNumber,
    required String deliveryAddress,
    bool primary = false,
  }) async {
    if (config.useMockData) {
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de quan ly dia chi.');
    }
    addressBusy = true;
    notifyListeners();
    try {
      if (existing == null) {
        await api.createDeliveryAddress(
          token: currentSession.accessToken,
          fullName: fullName,
          phoneNumber: phoneNumber,
          deliveryAddress: deliveryAddress,
          primary: primary,
        );
      } else {
        await api.updateDeliveryAddress(
          token: currentSession.accessToken,
          addressId: existing.id,
          fullName: fullName,
          phoneNumber: phoneNumber,
          deliveryAddress: deliveryAddress,
          primary: primary,
        );
      }
      deliveryAddresses = await api.getDeliveryAddresses(currentSession.accessToken);
    } finally {
      addressBusy = false;
      notifyListeners();
    }
  }

  Future<void> makeDeliveryAddressPrimary(int addressId) async {
    if (config.useMockData) {
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de doi dia chi mac dinh.');
    }
    addressBusy = true;
    notifyListeners();
    try {
      await api.setPrimaryDeliveryAddress(
        token: currentSession.accessToken,
        addressId: addressId,
      );
      deliveryAddresses = await api.getDeliveryAddresses(currentSession.accessToken);
    } finally {
      addressBusy = false;
      notifyListeners();
    }
  }

  Future<void> deleteDeliveryAddress(int addressId) async {
    if (config.useMockData) {
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de xoa dia chi.');
    }
    addressBusy = true;
    notifyListeners();
    try {
      await api.deleteDeliveryAddress(
        token: currentSession.accessToken,
        addressId: addressId,
      );
      deliveryAddresses = await api.getDeliveryAddresses(currentSession.accessToken);
    } finally {
      addressBusy = false;
      notifyListeners();
    }
  }

  Future<CheckoutResult> checkout({
    required int deliveryAddressId,
    String promotionCode = '',
    String deliveryType = 'IMMEDIATE',
    DateTime? scheduledDeliveryAt,
  }) async {
      if (config.useMockData) {
        throw ApiException('Checkout that chi san sang khi app dang ket noi may chu that.');
      }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap truoc khi checkout.');
    }
    checkoutBusy = true;
    notifyListeners();
    try {
      final result = await api.checkout(
        token: currentSession.accessToken,
        deliveryAddressId: deliveryAddressId,
        promotionCode: promotionCode,
        deliveryType: deliveryType,
        scheduledDeliveryAt: scheduledDeliveryAt,
        returnUrl: config.defaultReturnUrl,
        cancelUrl: config.defaultCancelUrl,
      );
      lastCheckout = result;
      await _loadProtectedState();
      return result;
    } finally {
      checkoutBusy = false;
      notifyListeners();
    }
  }

  Future<void> addToCart({
    required int storeId,
    required String storeName,
    required int dishId,
    required String dishName,
    required double unitPrice,
    required List<String> imagePaths,
    int quantity = 1,
  }) async {
    cartBusy = true;
    notifyListeners();

    try {
      final currentSession = session;
      if (config.useMockData || currentSession == null) {
        final items = [...cart.items];
        final index = items.indexWhere(
          (item) => item.storeId == storeId && item.dishId == dishId,
        );
        if (index >= 0) {
          final current = items[index];
          items[index] = current.copyWith(quantity: current.quantity + quantity);
        } else {
          items.add(
            CartItem(
              id: DateTime.now().microsecondsSinceEpoch,
              storeId: storeId,
              storeName: storeName,
              dishId: dishId,
              dishName: dishName,
              quantity: quantity,
              unitPrice: unitPrice,
              totalPrice: unitPrice * quantity,
              imagePaths: imagePaths,
              available: true,
              disabled: false,
              schedulable: true,
            ),
          );
        }
        cart = cart.copyWith(items: items);
        await sessionStore.saveLocalCart(cart);
      } else {
        cart = await api.addCartItem(
          token: currentSession.accessToken,
          storeId: storeId,
          dishId: dishId,
          quantity: quantity,
        );
      }
    } finally {
      cartBusy = false;
      notifyListeners();
    }
  }

  Future<void> updateCartItemQuantity(CartItem item, int quantity) async {
    if (quantity <= 0) {
      await removeFromCart(item);
      return;
    }

    cartBusy = true;
    notifyListeners();

    try {
      final currentSession = session;
      if (config.useMockData || currentSession == null) {
        final items = cart.items
            .map((cartItem) => cartItem.id == item.id ? cartItem.copyWith(quantity: quantity) : cartItem)
            .toList();
        cart = cart.copyWith(items: items);
        await sessionStore.saveLocalCart(cart);
      } else {
        cart = await api.updateCartItem(
          token: currentSession.accessToken,
          cartItemId: item.id,
          storeId: item.storeId,
          dishId: item.dishId,
          quantity: quantity,
        );
      }
    } finally {
      cartBusy = false;
      notifyListeners();
    }
  }

  Future<void> removeFromCart(CartItem item) async {
    cartBusy = true;
    notifyListeners();

    try {
      final currentSession = session;
      if (config.useMockData || currentSession == null) {
        final items = cart.items.where((cartItem) => cartItem.id != item.id).toList();
        cart = cart.copyWith(items: items);
        await sessionStore.saveLocalCart(cart);
      } else {
        cart = await api.removeCartItem(
          token: currentSession.accessToken,
          cartItemId: item.id,
        );
      }
    } finally {
      cartBusy = false;
      notifyListeners();
    }
  }

  Future<void> clearCart() async {
    cartBusy = true;
    notifyListeners();

    try {
      final currentSession = session;
      if (config.useMockData || currentSession == null) {
        cart = Cart.empty();
        await sessionStore.clearLocalCart();
      } else {
        await api.clearCart(currentSession.accessToken);
        cart = Cart.empty();
      }
    } finally {
      cartBusy = false;
      notifyListeners();
    }
  }

  Future<void> _loadProtectedState() async {
    final currentSession = session;
    if (currentSession == null) {
      cart = sessionStore.loadLocalCart();
      orders = const [];
      favoriteItems = const [];
      userNotificationUnreadCount = 0;
      deliveryAddresses = const [];
      return;
    }
    bool isSessionCurrent() => session?.accessToken == currentSession.accessToken;
    try {
      cart = await api.getCart(currentSession.accessToken);
    } catch (_) {
      cart = Cart.empty();
    }
    if (!isSessionCurrent()) {
      return;
    }
    try {
      orders = await api.getOrders(currentSession.accessToken);
    } catch (_) {
      orders = const [];
    }
    if (!isSessionCurrent()) {
      return;
    }
    try {
      favoriteItems = await api.getFavorites(token: currentSession.accessToken);
    } catch (_) {
      favoriteItems = const [];
    }
    if (!isSessionCurrent()) {
      return;
    }
    try {
      userNotificationUnreadCount = await api.getUserNotificationUnreadCount(currentSession.accessToken);
    } catch (_) {
      userNotificationUnreadCount = 0;
    }
    if (!isSessionCurrent()) {
      return;
    }
    try {
      deliveryAddresses = await api.getDeliveryAddresses(currentSession.accessToken);
    } catch (_) {
      deliveryAddresses = const [];
    }
  }

  Future<void> _handleUnauthorizedSignal(ApiUnauthorizedSignal signal) async {
    if (config.useMockData || logoutInProgress || !signal.hadToken) {
      return;
    }
    if (pendingSessionInterruption != null) {
      return;
    }
    final hadSessionBeforeFailure = session != null || hadAuthenticatedSession;
    if (!hadSessionBeforeFailure) {
      return;
    }

    final normalizedMessage = signal.message.trim();
    SessionInterruptionNotice? notice;

    if (normalizedMessage == 'Token is invalid') {
      notice = SessionInterruptionNotice(
        kind: SessionInterruptionKind.replaced,
        title: 'Tai khoan dang dang nhap o noi khac',
        message:
            'Phien dang nhap hien tai khong con hop le. Tai khoan cua ban co the vua duoc dang nhap tren thiet bi khac hoac phien dang nhap da bi thay the. Neu day khong phai ban, vui long dung Quen mat khau de doi mat khau ngay.',
        primaryActionLabel: 'Dang nhap lai',
        secondaryActionLabel: 'Quen mat khau',
        email: session?.user.email,
      );
    } else if (normalizedMessage == 'Token has expired') {
      notice = const SessionInterruptionNotice(
        kind: SessionInterruptionKind.expired,
        title: 'Phien dang nhap da het han',
        message: 'Vui long dang nhap lai de tiep tuc su dung app.',
        primaryActionLabel: 'Dang nhap lai',
      );
    } else if (normalizedMessage == 'Authorization header must be Bearer token') {
      notice = const SessionInterruptionNotice(
        kind: SessionInterruptionKind.loginRequired,
        title: 'Can dang nhap lai',
        message: 'Phien dang nhap hien tai khong con hop le. Vui long dang nhap lai de tiep tuc.',
        primaryActionLabel: 'Dang nhap lai',
      );
    }

    if (notice == null) {
      return;
    }

    await _clearSessionLocally();
    pendingSessionInterruption = notice;
    authError = notice.message;
    notifyListeners();
  }

  Future<void> _clearSessionLocally({
    bool clearHadAuthenticatedSession = true,
  }) async {
    session = null;
    orders = const [];
    favoriteItems = const [];
    userNotificationUnreadCount = 0;
    cart = sessionStore.loadLocalCart();
    deliveryAddresses = const [];
    lastCheckout = null;
    pendingOrderQrToken = null;
    authError = null;
    if (clearHadAuthenticatedSession) {
      hadAuthenticatedSession = false;
    }
    await sessionStore.clearPendingOrderQrToken();
    await sessionStore.clearSession();
    notifyListeners();
  }

  Future<void> _syncLocalCartIntoAccount(String token) async {
    final localCart = sessionStore.loadLocalCart();
    if (localCart.items.isEmpty) {
      return;
    }
    try {
      for (final item in localCart.items) {
        await api.addCartItem(
          token: token,
          storeId: item.storeId,
          dishId: item.dishId,
          quantity: item.quantity,
        );
      }
      await sessionStore.clearLocalCart();
    } catch (_) {
      // Keep guest cart data for a later retry if syncing fails.
    }
  }

  String _requireBackofficeToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de vao backoffice app.');
    }
    final role = currentSession.user.role.toUpperCase();
    if (role != 'ADMIN' && role != 'MANAGER') {
      throw ApiException('Tai khoan hien tai khong co quyen backoffice.');
    }
    return currentSession.accessToken;
  }

  String _requireEmployeeToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de vao employee app.');
    }
    final role = currentSession.user.role.toUpperCase();
    if (role != 'STAFF' && role != 'SHIPPER') {
      throw ApiException('Tai khoan hien tai khong co quyen employee.');
    }
    return currentSession.accessToken;
  }

  String _requireUserToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de vao khu vuc khach hang.');
    }
    if (currentSession.user.role.toUpperCase() != 'USER') {
      throw ApiException('Tai khoan hien tai khong thuoc role USER.');
    }
    return currentSession.accessToken;
  }

  String _requireAuthenticatedToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de mo AI chat.');
    }
    return currentSession.accessToken;
  }

  AiChatResponse _mockAiChatResponse(String message) {
    final currentUser = session?.user;
    final lower = message.toLowerCase();
    final references = <AiChatReference>[
      const AiChatReference(
        referenceKey: 'store:1',
        entityType: 'STORE',
        tableName: 'stores',
        id: 1,
        slug: 'tea-house-q1',
        title: 'Tea House Q1',
        subtitle: 'District 1 - 12 Nguyen Trai, District 1',
        imagePath: '/uploads/stores/tea-house-q1.jpg',
        publicApiPath: '/api/public/stores/tea-house-q1',
        adminApiPath: '/api/admin/stores/1',
        userApiPath: null,
      ),
      const AiChatReference(
        referenceKey: 'dish:88',
        entityType: 'DISH',
        tableName: 'dishes',
        id: 88,
        slug: null,
        title: 'Matcha Latte',
        subtitle: 'Tea House Q1 - ACTIVE',
        imagePath: '/uploads/dishes/matcha-latte.jpg',
        publicApiPath: '/api/public/dishes/88',
        adminApiPath: '/api/admin/dishes/88',
        userApiPath: null,
      ),
      const AiChatReference(
        referenceKey: 'news:901',
        entityType: 'NEWS',
        tableName: 'news_articles',
        id: 901,
        slug: 'matcha-guide-thang-4',
        title: 'Matcha Guide Thang 4',
        subtitle: 'Bai viet moi cho nguoi muon tim hieu menu va cach pha',
        imagePath: null,
        publicApiPath: '/api/public/news/matcha-guide-thang-4',
        adminApiPath: '/api/admin/news/901',
        userApiPath: null,
      ),
    ];

    String answer;
    if (lower.contains('voucher') || lower.contains('khuyen mai')) {
      answer =
          'Tea Matcha Q1 dang la diem de bat dau. Ban co the mo nhanh store, mon Matcha Latte, va kiem tra bai viet hoac uu dai lien quan tu cac the tham chieu ben duoi.';
    } else if (lower.contains('tai khoan') || lower.contains('account')) {
      answer =
          'Minh da lay tom tat trang thai tai khoan hien tai cua ban. Ban co the xem card tai khoan ngay ben duoi de kiem tra role, verify va store scope.';
    } else {
      answer =
          'Minh da tim duoc mot so du lieu lien quan trong he thong Tea Matcha. Ban co the mo nhanh tung the tham chieu de xem chi tiet store, dish, news hoac record noi bo neu role cua ban duoc phep.';
    }

    return AiChatResponse(
      answer: answer,
      references: references,
      currentUserStatus: currentUser == null
          ? null
          : AiChatCurrentUserStatus(
              id: currentUser.id,
              fullName: currentUser.fullName,
              email: currentUser.email,
              role: currentUser.role,
              enabled: true,
              verified: currentUser.verified,
              profileCompleted: currentUser.profileCompleted,
              workingStoreId: currentUser.workingStoreId,
              workingStoreName: currentUser.workingStoreName,
            ),
      model: 'demo-ai',
    );
  }
}
