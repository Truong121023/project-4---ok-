import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/config/app_config.dart';
import '../core/models/models.dart';
import '../core/services/address_search_service.dart';
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
  final AddressSearchService _addressSearchService = AddressSearchService();

  UserSession? session;
  Cart cart = Cart.empty();
  List<OrderSummary> orders = const [];
  List<DeliveryAddress> deliveryAddresses = const [];
  List<OrderProofRecord> orderProofRecords = const [];
  List<FavoriteItem> favoriteItems = const [];
  CheckoutResult? lastCheckout;
  String? pendingOrderQrToken;
  int userNotificationUnreadCount = 0;
  final Map<int, AiChatThreadDetail> _mockAiChatThreadsById = {};
  int _nextMockAiChatThreadId = 1;

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
  bool get isUser => session?.user.role.toUpperCase() == 'USER';
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
    final filtered = orderProofRecords
        .where((record) => record.userId == currentUserId)
        .toList()
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
        userNotificationUnreadCount = MockData.notifications
            .where((notification) => !notification.read)
            .length;
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
        if (_supportsBuyerFeatures(session)) {
          await _syncLocalCartIntoAccount(session!.accessToken);
          await _loadProtectedState(
            loadOrders: false,
            loadFavorites: false,
            loadUnreadCount: false,
            loadDeliveryAddresses: false,
          );
        } else {
          _resetBuyerOnlyState();
        }
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

  Future<void> refreshCurrentUser() async {
    if (config.useMockData) {
      notifyListeners();
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      return;
    }
    final currentUser = await api.getCurrentUser(currentSession.accessToken);
    if (session?.accessToken != currentSession.accessToken) {
      return;
    }
    session = currentSession.copyWith(user: currentUser);
    await sessionStore.saveSession(session!);
    notifyListeners();
  }

  Future<AiChatResponse> queryAiChat({
    required String message,
    List<AiChatHistoryEntry> history = const [],
    int? threadId,
  }) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty) {
      throw ApiException('Enter a message to ask AI.');
    }
    if (config.useMockData) {
      return _mockAiChatResponse(
        trimmed,
        history: history,
        threadId: threadId,
      );
    }
    return api.queryAiChat(
      token: _requireAuthenticatedToken(),
      message: trimmed,
      history: history,
      threadId: threadId,
    );
  }

  Future<List<AiChatThreadSummary>> loadAiChatThreads({
    int page = 0,
    int size = 20,
  }) async {
    if (config.useMockData) {
      final items = _mockAiChatThreadsById.values
          .map(_mockThreadSummaryFromDetail)
          .toList()
        ..sort((left, right) {
          final leftTime =
              (left.updatedAt ?? left.lastMessageAt ?? DateTime(2000))
                  .millisecondsSinceEpoch;
          final rightTime =
              (right.updatedAt ?? right.lastMessageAt ?? DateTime(2000))
                  .millisecondsSinceEpoch;
          return rightTime.compareTo(leftTime);
        });
      final start = page * size;
      if (start >= items.length) {
        return const [];
      }
      final end = start + size > items.length ? items.length : start + size;
      return items.sublist(start, end);
    }
    return api.getAiChatThreads(
      token: _requireAuthenticatedToken(),
      page: page,
      size: size,
    );
  }

  Future<AiChatThreadDetail> loadAiChatThreadDetail(int threadId) async {
    if (config.useMockData) {
      final detail = _mockAiChatThreadsById[threadId];
      if (detail != null) {
        return detail;
      }
      throw ApiException('Saved chat history could not be found.');
    }
    return api.getAiChatThreadDetail(
      token: _requireAuthenticatedToken(),
      threadId: threadId,
    );
  }

  Future<List<StoreCard>> browseStores({
    String search = '',
    String sort = 'rating_desc',
    double? latitude,
    double? longitude,
  }) async {
    if (config.useMockData) {
      return MockData.browseStores(
        search: search,
        sort: sort,
        latitude: latitude,
        longitude: longitude,
      );
    }
    return api.getStores(
      search: search,
      sort: sort,
      latitude: latitude,
      longitude: longitude,
    );
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
      return Future.value(
          const MessageResponse(message: 'Mock delete successful'));
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
      throw ApiException(
          'QR handling is only available when the app is connected to the real server.');
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in before handling the order QR flow.');
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
      throw ApiException('Sign in to save delivery history.');
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
          (record) => !(record.userId == currentUserId &&
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
      return Future.value(
          const MessageResponse(message: 'Mock notifications marked as read'));
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
      return Future.value(
          const MessageResponse(message: 'Mock notifications marked as read'));
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
        userNotificationUnreadCount = MockData.notifications
            .where((notification) => !notification.read)
            .length;
        cart = sessionStore.loadLocalCart();
      } else {
        session = await api.login(email: email, password: password);
        await sessionStore.saveSession(session!);
        hadAuthenticatedSession = true;
        if (_supportsBuyerFeatures(session)) {
          await _syncLocalCartIntoAccount(session!.accessToken);
          await _loadProtectedState(
            loadOrders: false,
            loadFavorites: false,
            loadUnreadCount: false,
            loadDeliveryAddresses: false,
          );
        } else {
          _resetBuyerOnlyState();
        }
      }
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } catch (_) {
      authError = 'Unable to sign in right now.';
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
        userNotificationUnreadCount = MockData.notifications
            .where((notification) => !notification.read)
            .length;
        cart = sessionStore.loadLocalCart();
      } else {
        session = await api.googleLogin(idToken: idToken);
        await sessionStore.saveSession(session!);
        hadAuthenticatedSession = true;
        if (_supportsBuyerFeatures(session)) {
          await _syncLocalCartIntoAccount(session!.accessToken);
          await _loadProtectedState(
            loadOrders: false,
            loadFavorites: false,
            loadUnreadCount: false,
            loadDeliveryAddresses: false,
          );
        } else {
          _resetBuyerOnlyState();
        }
      }
      return session!;
    } on ApiException catch (error) {
      authError = error.message;
      rethrow;
    } catch (_) {
      authError = 'Unable to sign in with Google right now.';
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
    if (detail.paymentStatus.toUpperCase() == 'PAID') {
      try {
        await refreshCurrentUser();
      } catch (_) {
        // Keep refreshed payment state even if profile sync fails.
      }
    }
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
      (item) =>
          item.targetType.toUpperCase() == targetType.toUpperCase() &&
          item.targetId == targetId,
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
            .where((item) =>
                !(item.targetType.toUpperCase() == normalizedType &&
                    item.targetId == targetId))
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
          .where((item) => !(item.targetType.toUpperCase() == normalizedType &&
              item.targetId == targetId))
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
        (item) => !(item.targetType.toUpperCase() == normalizedType &&
            item.targetId == targetId),
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
        userEmail: session?.user.email ?? 'guest@kamatcha.local',
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
      return Future.value(
          const MessageResponse(message: 'Mock review deleted'));
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
      return Future.value(
          const MessageResponse(message: 'Mock feedback deleted'));
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
      userNotificationUnreadCount = MockData.notifications
          .where((notification) => !notification.read)
          .length;
      notifyListeners();
      return userNotificationUnreadCount;
    }
    userNotificationUnreadCount =
        await api.getUserNotificationUnreadCount(_requireUserToken());
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
      return const MessageResponse(
          message: 'Mock notifications marked as read');
    }
    final response =
        await api.markAllUserNotificationsRead(_requireUserToken());
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

  Future<List<UserLevelDefinition>> loadUserLevelDefinitions() async {
    if (config.useMockData) {
      return MockData.levelDefinitions;
    }
    return api.getUserLevelDefinitions(
      token: _requireUserToken(),
    );
  }

  Future<List<PromotionCard>> loadUserVouchers() async {
    if (config.useMockData) {
      return MockData.userVouchers;
    }
    return api.getUserVouchers(
      token: _requireUserToken(),
    );
  }

  Future<VoucherRedemptionResult> redeemVoucher(int promotionId) async {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in before redeeming a voucher.');
    }
    final result = config.useMockData
        ? MockData.redeemVoucher(
            promotionId: promotionId,
            currentCreditPoints: currentSession.user.creditPoints,
          )
        : await api.redeemUserVoucher(
            token: currentSession.accessToken,
            promotionId: promotionId,
          );
    if (session?.accessToken == currentSession.accessToken) {
      session = currentSession.copyWith(
        user: currentSession.user.copyWith(
          creditPoints: result.remainingCreditPoints,
        ),
      );
      await sessionStore.saveSession(session!);
      notifyListeners();
    }
    return result;
  }

  Future<CheckoutPreview> previewCheckout({
    required int deliveryAddressId,
    String promotionCode = '',
    String deliveryType = 'DELIVERY',
    DateTime? scheduledDeliveryAt,
  }) async {
    if (config.useMockData) {
      throw ApiException(
        'Checkout preview is only available when the app is connected to the real server.',
      );
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in to preview checkout.');
    }
    try {
      await _ensureCheckoutAddressCoordinates(
        token: currentSession.accessToken,
        deliveryAddressId: deliveryAddressId,
      );
      return await api.checkoutPreview(
        token: currentSession.accessToken,
        deliveryAddressId: deliveryAddressId,
        promotionCode: promotionCode,
        deliveryType: deliveryType,
        scheduledDeliveryAt: scheduledDeliveryAt,
      );
    } on ApiException catch (error) {
      throw _mapCheckoutError(error);
    }
  }

  Future<List<CheckoutPromotionSuggestion>> loadEligibleCheckoutPromotions({
    required int deliveryAddressId,
    String deliveryType = 'DELIVERY',
    DateTime? scheduledDeliveryAt,
  }) async {
    if (config.useMockData) {
      return const [];
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in to view eligible vouchers.');
    }
    try {
      await _ensureCheckoutAddressCoordinates(
        token: currentSession.accessToken,
        deliveryAddressId: deliveryAddressId,
      );
      return await api.getEligibleCheckoutPromotions(
        token: currentSession.accessToken,
        deliveryAddressId: deliveryAddressId,
        deliveryType: deliveryType,
        scheduledDeliveryAt: scheduledDeliveryAt,
      );
    } on ApiException catch (error) {
      throw _mapCheckoutError(error);
    }
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
          title: 'Password changed',
          message:
              'Your password was changed successfully. Please sign in again to keep using the app.',
          primaryActionLabel: 'Sign in again',
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
        throw ApiException(
            'Sign in with Google before completing the profile.');
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
      deliveryAddresses =
          await api.getDeliveryAddresses(currentSession.accessToken);
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
    double? latitude,
    double? longitude,
    bool primary = false,
  }) async {
    if (config.useMockData) {
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in to manage addresses.');
    }
    final normalizedDeliveryAddress =
        _addressSearchService.normalizeVietnameseAddress(deliveryAddress);
    final addressToSave = normalizedDeliveryAddress.isEmpty
        ? deliveryAddress.trim()
        : normalizedDeliveryAddress;
    var resolvedLatitude = latitude;
    var resolvedLongitude = longitude;
    if ((resolvedLatitude == null || resolvedLongitude == null) &&
        addressToSave.isNotEmpty) {
      final resolvedCoordinates =
          await _resolveCoordinatesOrThrow(addressToSave);
      resolvedLatitude = resolvedCoordinates.latitude;
      resolvedLongitude = resolvedCoordinates.longitude;
    }
    addressBusy = true;
    notifyListeners();
    try {
      if (existing == null) {
        await api.createDeliveryAddress(
          token: currentSession.accessToken,
          fullName: fullName,
          phoneNumber: phoneNumber,
          deliveryAddress: addressToSave,
          latitude: resolvedLatitude,
          longitude: resolvedLongitude,
          primary: primary,
        );
      } else {
        await api.updateDeliveryAddress(
          token: currentSession.accessToken,
          addressId: existing.id,
          fullName: fullName,
          phoneNumber: phoneNumber,
          deliveryAddress: addressToSave,
          latitude: resolvedLatitude,
          longitude: resolvedLongitude,
          primary: primary,
        );
      }
      deliveryAddresses =
          await api.getDeliveryAddresses(currentSession.accessToken);
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
      throw ApiException('Sign in to change the default address.');
    }
    addressBusy = true;
    notifyListeners();
    try {
      await api.setPrimaryDeliveryAddress(
        token: currentSession.accessToken,
        addressId: addressId,
      );
      deliveryAddresses =
          await api.getDeliveryAddresses(currentSession.accessToken);
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
      throw ApiException('Sign in to delete the address.');
    }
    addressBusy = true;
    notifyListeners();
    try {
      await api.deleteDeliveryAddress(
        token: currentSession.accessToken,
        addressId: addressId,
      );
      deliveryAddresses =
          await api.getDeliveryAddresses(currentSession.accessToken);
    } finally {
      addressBusy = false;
      notifyListeners();
    }
  }

  Future<DeliveryAddress> ensureDeliveryAddressCoordinates(
    int deliveryAddressId,
  ) async {
    if (config.useMockData) {
      throw ApiException(
        'Coordinate updates are only available when the app is connected to the real server.',
      );
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in to update the delivery address.');
    }
    addressBusy = true;
    notifyListeners();
    try {
      final resolvedAddress = await _ensureCheckoutAddressCoordinates(
        token: currentSession.accessToken,
        deliveryAddressId: deliveryAddressId,
      );
      if (resolvedAddress != null) {
        return resolvedAddress;
      }
      for (final address in deliveryAddresses) {
        if (address.id == deliveryAddressId) {
          return address;
        }
      }
      throw ApiException('The selected delivery address could not be found.');
    } finally {
      addressBusy = false;
      notifyListeners();
    }
  }

  Future<CheckoutResult> checkout({
    required int deliveryAddressId,
    String promotionCode = '',
    String deliveryType = 'DELIVERY',
    DateTime? scheduledDeliveryAt,
  }) async {
    if (config.useMockData) {
      throw ApiException(
          'Checkout is only available when the app is connected to the real server.');
    }
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in before checkout.');
    }
    checkoutBusy = true;
    notifyListeners();
    try {
      await _ensureCheckoutAddressCoordinates(
        token: currentSession.accessToken,
        deliveryAddressId: deliveryAddressId,
      );
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
      if (result.paymentStatus.toUpperCase() == 'PAID') {
        try {
          await refreshCurrentUser();
        } catch (_) {
          // Keep checkout success visible even if profile sync fails.
        }
      }
      return result;
    } on ApiException catch (error) {
      throw _mapCheckoutError(error);
    } finally {
      checkoutBusy = false;
      notifyListeners();
    }
  }

  Future<DeliveryAddress?> _ensureCheckoutAddressCoordinates({
    required String token,
    required int deliveryAddressId,
  }) async {
    final selectedAddress = deliveryAddresses
        .where((address) => address.id == deliveryAddressId)
        .cast<DeliveryAddress?>()
        .firstWhere(
          (address) => address != null,
          orElse: () => null,
        );
    if (selectedAddress == null || selectedAddress.hasCoordinates) {
      return selectedAddress;
    }
    final coordinates =
        await _resolveCoordinatesOrThrow(selectedAddress.deliveryAddress);
    final updatedAddress = await api.updateDeliveryAddress(
      token: token,
      addressId: selectedAddress.id,
      fullName: selectedAddress.fullName,
      phoneNumber: selectedAddress.phoneNumber,
      deliveryAddress: selectedAddress.deliveryAddress,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      primary: selectedAddress.primary,
    );
    deliveryAddresses = deliveryAddresses
        .map((address) =>
            address.id == updatedAddress.id ? updatedAddress : address)
        .toList();
    notifyListeners();
    return updatedAddress;
  }

  Future<({double latitude, double longitude})> _resolveCoordinatesOrThrow(
    String deliveryAddress,
  ) async {
    final normalizedAddress =
        _addressSearchService.normalizeVietnameseAddress(deliveryAddress);

    try {
      final matches = await _addressSearchService.search(normalizedAddress);
      if (matches.isNotEmpty) {
        final firstMatch = matches.first;
        return (
          latitude: firstMatch.latitude,
          longitude: firstMatch.longitude,
        );
      }
    } catch (error) {
      final message = '$error';
      if (message.contains('IO_ERROR') ||
          message.contains('SocketException') ||
          message.contains('Failed host lookup')) {
        throw ApiException(
          'The geocoding service is temporarily busy. Try again in a few minutes or provide a more detailed address.',
        );
      }
    }
    throw ApiException(
      'We could not resolve coordinates for this address automatically. Please add the ward, district, or city, or choose the location on the map.',
    );
  }

  ApiException _mapCheckoutError(ApiException error) {
    final normalizedMessage = error.message.trim().toLowerCase();
    if (normalizedMessage == 'delivery address is missing coordinates') {
      return ApiException(
        'This delivery address does not have coordinates yet. Tap "Fetch coordinates automatically" or edit the address to add more detail.',
        statusCode: error.statusCode,
      );
    }
    if (normalizedMessage.contains('payos error 231') ||
        normalizedMessage.contains('da ton tai') ||
        normalizedMessage.contains('ton tai') ||
        normalizedMessage.contains('payment request already exists') ||
        normalizedMessage.contains('already exists')) {
      return ApiException(
        'PayOS reported that this payment request already exists. Please wait a moment and try again. If it keeps happening, restart the backend so the automatic retry logic can take effect.',
        statusCode: error.statusCode,
      );
    }
    return error;
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
          items[index] =
              current.copyWith(quantity: current.quantity + quantity);
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
            .map((cartItem) => cartItem.id == item.id
                ? cartItem.copyWith(quantity: quantity)
                : cartItem)
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
        final items =
            cart.items.where((cartItem) => cartItem.id != item.id).toList();
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

  Future<void> _loadProtectedState({
    bool loadCart = true,
    bool loadOrders = true,
    bool loadFavorites = true,
    bool loadUnreadCount = true,
    bool loadDeliveryAddresses = true,
  }) async {
    final currentSession = session;
    if (currentSession == null) {
      cart = sessionStore.loadLocalCart();
      orders = const [];
      favoriteItems = const [];
      userNotificationUnreadCount = 0;
      deliveryAddresses = const [];
      return;
    }
    if (!_supportsBuyerFeatures(currentSession)) {
      _resetBuyerOnlyState();
      return;
    }
    bool isSessionCurrent() =>
        session?.accessToken == currentSession.accessToken;
    if (loadCart) {
      try {
        cart = await api.getCart(currentSession.accessToken);
      } catch (_) {
        cart = Cart.empty();
      }
    }
    if (!isSessionCurrent()) {
      return;
    }
    if (loadOrders) {
      try {
        orders = await api.getOrders(currentSession.accessToken);
      } catch (_) {
        orders = const [];
      }
    } else {
      orders = const [];
    }
    if (!isSessionCurrent()) {
      return;
    }
    if (loadFavorites) {
      try {
        favoriteItems =
            await api.getFavorites(token: currentSession.accessToken);
      } catch (_) {
        favoriteItems = const [];
      }
    } else {
      favoriteItems = const [];
    }
    if (!isSessionCurrent()) {
      return;
    }
    if (loadUnreadCount) {
      try {
        userNotificationUnreadCount = await api.getUserNotificationUnreadCount(
          currentSession.accessToken,
        );
      } catch (_) {
        userNotificationUnreadCount = 0;
      }
    } else {
      userNotificationUnreadCount = 0;
    }
    if (!isSessionCurrent()) {
      return;
    }
    if (loadDeliveryAddresses) {
      try {
        deliveryAddresses =
            await api.getDeliveryAddresses(currentSession.accessToken);
      } catch (_) {
        deliveryAddresses = const [];
      }
    } else {
      deliveryAddresses = const [];
    }
  }

  bool _supportsBuyerFeatures(UserSession? value) {
    return value?.user.role.toUpperCase() == 'USER';
  }

  void _resetBuyerOnlyState() {
    cart = Cart.empty();
    orders = const [];
    favoriteItems = const [];
    userNotificationUnreadCount = 0;
    deliveryAddresses = const [];
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
        title: 'This account is signed in somewhere else',
        message:
            'This session is no longer valid. Your account may have just been signed in on another device or the session was replaced. If that was not you, use Forgot password to change your password right away.',
        primaryActionLabel: 'Sign in again',
        secondaryActionLabel: 'Forgot password',
        email: session?.user.email,
      );
    } else if (normalizedMessage == 'Token has expired') {
      notice = const SessionInterruptionNotice(
        kind: SessionInterruptionKind.expired,
        title: 'Session expired',
        message: 'Please sign in again to keep using the app.',
        primaryActionLabel: 'Sign in again',
      );
    } else if (normalizedMessage ==
        'Authorization header must be Bearer token') {
      notice = const SessionInterruptionNotice(
        kind: SessionInterruptionKind.loginRequired,
        title: 'Sign in again',
        message:
            'This session is no longer valid. Please sign in again to continue.',
        primaryActionLabel: 'Sign in again',
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
      throw ApiException('Sign in to open the backoffice app.');
    }
    final role = currentSession.user.role.toUpperCase();
    if (role != 'ADMIN' && role != 'MANAGER') {
      throw ApiException('This account does not have backoffice access.');
    }
    return currentSession.accessToken;
  }

  String _requireEmployeeToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in to open the employee app.');
    }
    final role = currentSession.user.role.toUpperCase();
    if (role != 'STAFF' && role != 'SHIPPER') {
      throw ApiException('This account does not have employee access.');
    }
    return currentSession.accessToken;
  }

  String _requireUserToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in to open the customer area.');
    }
    if (currentSession.user.role.toUpperCase() != 'USER') {
      throw ApiException('This account does not have USER access.');
    }
    return currentSession.accessToken;
  }

  String _requireAuthenticatedToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Sign in to open AI chat.');
    }
    return currentSession.accessToken;
  }

  AiChatResponse _mockAiChatResponse(
    String message, {
    List<AiChatHistoryEntry> history = const [],
    int? threadId,
  }) {
    final currentUser = session?.user;
    final lower = message.toLowerCase();
    final now = DateTime.now();
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
        slug: 'matcha-guide-april',
        title: 'Matcha Guide April',
        subtitle:
            'A new article for guests who want to explore the menu and brewing style',
        imagePath: null,
        publicApiPath: '/api/public/news/matcha-guide-april',
        adminApiPath: '/api/admin/news/901',
        userApiPath: null,
      ),
    ];

    String answer;
    if (lower.contains('voucher') || lower.contains('promotion')) {
      answer =
          'Kamatcha Q1 is a good place to start. You can quickly open the store, the Matcha Latte item, and related articles or offers from the reference cards below.';
    } else if (lower.contains('account')) {
      answer =
          'I pulled a quick summary of your current account status. You can open the account card below to check role, verification, and store scope.';
    } else {
      answer =
          'I found a few relevant records in the Kamatcha system. You can open each reference card to view store, dish, news, or internal record details if your role has access.';
    }

    final currentStatus = currentUser == null
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
          );
    final actions = _mockAiChatActions(references);
    final effectiveThreadId = threadId ?? _nextMockAiChatThreadId++;
    final existingDetail = _mockAiChatThreadsById[effectiveThreadId];
    final threadTitle = existingDetail?.title ??
        _mockAiChatThreadTitle(message, history: history);
    final threadCreatedAt = existingDetail?.createdAt ?? now;
    final userMessage = AiChatStoredMessage(
      id: now.microsecondsSinceEpoch,
      role: 'user',
      content: message,
      references: const [],
      actions: const [],
      model: null,
      createdAt: now,
    );
    final assistantMessage = AiChatStoredMessage(
      id: now.microsecondsSinceEpoch + 1,
      role: 'assistant',
      content: answer,
      references: references,
      actions: actions,
      model: 'demo-ai',
      createdAt: now,
    );
    _mockAiChatThreadsById[effectiveThreadId] = AiChatThreadDetail(
      threadId: effectiveThreadId,
      title: threadTitle,
      messages: [
        ...?existingDetail?.messages,
        userMessage,
        assistantMessage,
      ],
      createdAt: threadCreatedAt,
      updatedAt: now,
    );

    return AiChatResponse(
      threadId: effectiveThreadId,
      threadTitle: threadTitle,
      answer: answer,
      references: references,
      actions: actions,
      currentUserStatus: currentStatus,
      model: 'demo-ai',
    );
  }

  AiChatThreadSummary _mockThreadSummaryFromDetail(AiChatThreadDetail detail) {
    final lastMessage =
        detail.messages.isNotEmpty ? detail.messages.last : null;
    return AiChatThreadSummary(
      threadId: detail.threadId,
      title: detail.title,
      messageCount: detail.messages.length,
      lastMessageRole: lastMessage?.role ?? '',
      lastMessagePreview: lastMessage?.content ?? '',
      lastMessageAt: lastMessage?.createdAt,
      updatedAt: detail.updatedAt,
    );
  }

  String _mockAiChatThreadTitle(
    String message, {
    List<AiChatHistoryEntry> history = const [],
  }) {
    final seed = history.isNotEmpty ? history.first.content : message;
    final normalized = seed.trim();
    if (normalized.isEmpty) {
      return 'Kamatcha chat';
    }
    return normalized.length <= 48
        ? normalized
        : '${normalized.substring(0, 45).trim()}...';
  }

  List<AiChatAction> _mockAiChatActions(List<AiChatReference> references) {
    final actions = <AiChatAction>[
      const AiChatAction(
        actionKey: 'open-cart',
        actionType: 'OPEN_CART',
        label: 'Open cart',
        description: 'View your cart and continue ordering.',
        method: 'GET',
        apiPath: '/api/user/cart',
        referenceKey: null,
        payload: null,
      ),
      const AiChatAction(
        actionKey: 'open-orders',
        actionType: 'OPEN_ORDERS',
        label: 'View orders',
        description: 'Open your recent order list.',
        method: 'GET',
        apiPath: '/api/user/orders',
        referenceKey: null,
        payload: null,
      ),
    ];
    for (final reference in references) {
      actions.add(
        AiChatAction(
          actionKey: 'open:${reference.referenceKey}',
          actionType: switch (reference.entityType.toUpperCase()) {
            'STORE' => 'OPEN_STORE',
            'DISH' => 'OPEN_DISH',
            'EVENT' => 'OPEN_EVENT',
            'NEWS' => 'OPEN_NEWS',
            'ORDER' => 'OPEN_ORDER',
            'USER' => 'OPEN_ACCOUNT',
            _ => 'OPEN_REFERENCE',
          },
          label: switch (reference.entityType.toUpperCase()) {
            'STORE' => 'View store',
            'DISH' => 'View item',
            'EVENT' => 'View event',
            'NEWS' => 'Read article',
            'ORDER' => 'View order',
            'USER' => 'View account',
            _ => 'Open',
          },
          description: reference.subtitle,
          method: 'GET',
          apiPath: reference.userApiPath ??
              reference.publicApiPath ??
              reference.adminApiPath,
          referenceKey: reference.referenceKey,
          payload: reference.entityType.toUpperCase() == 'DISH'
              ? <String, dynamic>{
                  'dishId': reference.id,
                  'storeId': 1,
                  'quantity': 1,
                }
              : null,
        ),
      );
      if (reference.entityType.toUpperCase() == 'DISH' &&
          reference.id != null) {
        actions.add(
          AiChatAction(
            actionKey: 'add-to-cart:${reference.id}',
            actionType: 'ADD_TO_CART',
            label: 'Add to cart',
            description: 'Add ${reference.title} to the sample cart.',
            method: 'POST',
            apiPath: '/api/user/cart/items',
            referenceKey: reference.referenceKey,
            payload: <String, dynamic>{
              'dishId': reference.id,
              'storeId': 1,
              'quantity': 1,
            },
          ),
        );
      }
    }
    return actions;
  }
}
