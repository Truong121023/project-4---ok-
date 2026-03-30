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
  CheckoutResult? lastCheckout;

  bool initialized = false;
  bool authBusy = false;
  bool cartBusy = false;
  bool addressBusy = false;
  bool checkoutBusy = false;
  String? authError;

  bool get isLoggedIn => session != null;
  String get currentRole => session?.user.role.toUpperCase() ?? 'GUEST';
  bool get isAdmin => session?.user.role.toUpperCase() == 'ADMIN';
  bool get isManager => session?.user.role.toUpperCase() == 'MANAGER';
  bool get isStaff => session?.user.role.toUpperCase() == 'STAFF';
  bool get isShipper => session?.user.role.toUpperCase() == 'SHIPPER';
  bool get isEmployee => isStaff || isShipper;
  bool get isBackoffice => isAdmin || isManager;
  DeliveryAddress? get primaryDeliveryAddress {
    for (final address in deliveryAddresses) {
      if (address.primary) {
        return address;
      }
    }
    return deliveryAddresses.isEmpty ? null : deliveryAddresses.first;
  }

  Future<void> bootstrap() async {
    session = sessionStore.loadSession();

    if (config.useMockData) {
      cart = sessionStore.loadMockCart();
      if (session != null) {
        orders = MockData.orders;
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
        await _loadProtectedState();
      } catch (_) {
        session = null;
        cart = Cart.empty();
        orders = const [];
        deliveryAddresses = const [];
        await sessionStore.clearSession();
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

  Future<AdminDashboard> loadAdminDashboard() async {
    if (config.useMockData) {
      return const AdminDashboard(
        users: [],
        stores: [],
        events: [],
        categories: [],
        dishes: [],
        reviews: [],
        news: [],
      );
    }
    return api.getAdminDashboard(_requireAdminToken());
  }

  Future<AdminSummary> loadAdminSummary() async {
    if (config.useMockData) {
      return const AdminSummary(
        userCount: 0,
        storeCount: 0,
        eventCount: 0,
        categoryCount: 0,
        dishCount: 0,
        reviewCount: 0,
        newsCount: 0,
      );
    }
    return api.getAdminSummary(_requireAdminToken());
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

  Future<void> login({
    required String email,
    required String password,
  }) async {
    authBusy = true;
    authError = null;
    notifyListeners();

    try {
      if (config.useMockData) {
        session = MockData.sessionFor(email);
        await sessionStore.saveSession(session!);
        orders = MockData.orders;
        cart = sessionStore.loadMockCart();
      } else {
        final loggedIn = await api.login(email: email, password: password);
        final currentUser = await api.getCurrentUser(loggedIn.accessToken);
        session = loggedIn.copyWith(user: currentUser);
        await sessionStore.saveSession(session!);
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
    notifyListeners();

    try {
      if (config.useMockData) {
        session = MockData.sessionFor('google.user@example.com');
        await sessionStore.saveSession(session!);
        orders = MockData.orders;
        cart = sessionStore.loadMockCart();
      } else {
        session = await api.googleLogin(idToken: idToken);
        await sessionStore.saveSession(session!);
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
    session = null;
    orders = const [];
    if (!config.useMockData) {
      cart = Cart.empty();
    }
    deliveryAddresses = const [];
    lastCheckout = null;
    notifyListeners();

    await sessionStore.clearSession();
    if (!config.useMockData && currentSession != null) {
      try {
        await api.logout(currentSession.accessToken);
      } catch (_) {
        // Ignore logout cleanup errors.
      }
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
      return await api.resetPassword(
        email: email,
        otp: otp,
        newPassword: newPassword,
      );
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
      cart = sessionStore.loadMockCart();
      notifyListeners();
      return;
    }
    final currentSession = session;
    if (currentSession == null) {
      cart = Cart.empty();
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
      throw ApiException('Checkout that dang duoc bat o live API mode.');
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
      if (config.useMockData) {
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
        await sessionStore.saveMockCart(cart);
      } else {
        final currentSession = session;
        if (currentSession == null) {
          throw ApiException('Can dang nhap de dong bo gio hang voi backend.');
        }
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
      if (config.useMockData) {
        final items = cart.items
            .map((cartItem) => cartItem.id == item.id ? cartItem.copyWith(quantity: quantity) : cartItem)
            .toList();
        cart = cart.copyWith(items: items);
        await sessionStore.saveMockCart(cart);
      } else {
        final currentSession = session;
        if (currentSession == null) {
          throw ApiException('Can dang nhap de cap nhat gio hang.');
        }
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
      if (config.useMockData) {
        final items = cart.items.where((cartItem) => cartItem.id != item.id).toList();
        cart = cart.copyWith(items: items);
        await sessionStore.saveMockCart(cart);
      } else {
        final currentSession = session;
        if (currentSession == null) {
          throw ApiException('Can dang nhap de xoa khoi gio hang.');
        }
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
      if (config.useMockData) {
        cart = Cart.empty();
        await sessionStore.clearMockCart();
      } else {
        final currentSession = session;
        if (currentSession == null) {
          cart = Cart.empty();
        } else {
          await api.clearCart(currentSession.accessToken);
          cart = Cart.empty();
        }
      }
    } finally {
      cartBusy = false;
      notifyListeners();
    }
  }

  Future<void> _loadProtectedState() async {
    final currentSession = session;
    if (currentSession == null) {
      cart = Cart.empty();
      orders = const [];
      deliveryAddresses = const [];
      return;
    }
    try {
      cart = await api.getCart(currentSession.accessToken);
    } catch (_) {
      cart = Cart.empty();
    }
    try {
      orders = await api.getOrders(currentSession.accessToken);
    } catch (_) {
      orders = const [];
    }
    try {
      deliveryAddresses = await api.getDeliveryAddresses(currentSession.accessToken);
    } catch (_) {
      deliveryAddresses = const [];
    }
  }

  String _requireAdminToken() {
    final currentSession = session;
    if (currentSession == null) {
      throw ApiException('Can dang nhap de vao admin app.');
    }
    if (currentSession.user.role.toUpperCase() != 'ADMIN') {
      throw ApiException('Tai khoan hien tai khong co quyen ADMIN.');
    }
    return currentSession.accessToken;
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
}
