import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';

import '../app/app.dart';
import '../app/app_controller.dart';
import '../core/models/models.dart';
import '../core/services/api_service.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'admin/admin_resource_detail_screen.dart';
import 'admin/admin_resource_list_screen.dart';
import 'admin/admin_support.dart';
import 'cart_screen.dart';
import 'dish_detail_screen.dart';
import 'employee/employee_order_detail_screen.dart';
import 'employee/employee_orders_screen.dart';
import 'employee/employee_support.dart';
import 'events_screen.dart';
import 'login_screen.dart';
import 'news_detail_screen.dart';
import 'notifications_screen.dart';
import 'order_detail_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'store_detail_screen.dart';

class AiChatFab extends StatelessWidget {
  const AiChatFab({super.key});

  void _open(BuildContext context) {
    final controller = AppScope.of(context);
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            controller.isLoggedIn ? const AiChatScreen() : const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return FloatingActionButton.extended(
      heroTag: 'ai-chat-fab-${controller.currentRole}',
      onPressed: () => _open(context),
      icon: const Icon(Icons.smart_toy_outlined),
      label: const Text('AI'),
    );
  }
}

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final TextEditingController _composerController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _composerFocusNode = FocusNode();

  List<_AiChatUiMessage> _messages = const [];
  List<AiChatThreadSummary> _threads = const [];
  int? _activeThreadId;
  String _activeThreadTitle = '';
  int? _boundUserId;
  bool _threadsLoading = false;
  bool _threadLoading = false;
  bool _sending = false;
  String? _threadsError;
  String? _threadError;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    final currentUserId = controller.session?.user.id;
    if (!controller.isLoggedIn) {
      if (_boundUserId != null) {
        _resetState();
      }
      _boundUserId = null;
      return;
    }
    if (_boundUserId != currentUserId) {
      _boundUserId = currentUserId;
      unawaited(_bootstrap());
    }
  }

  @override
  void dispose() {
    _composerController.dispose();
    _composerFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

<<<<<<< HEAD
  void _resetState() {
    setState(() {
      _messages = const [];
      _threads = const [];
      _activeThreadId = null;
      _activeThreadTitle = '';
      _threadsLoading = false;
      _threadLoading = false;
      _sending = false;
      _threadsError = null;
      _threadError = null;
      _error = null;
      _composerController.clear();
    });
=======
  List<String> _quickPromptsForRole(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return const [
          'Hom nay store nao ban tot nhat?',
          'Cho minh xem uu dai dang bat cua he thong',
          'Tai khoan manager nao dang phu trach Q1?',
        ];
      case 'MANAGER':
        return const [
          'Tom tat store cua toi hom nay',
          'Mon nao dang ban tot nhat o store nay?',
          'Cho minh xem feedback gan day cua store',
        ];
      case 'STAFF':
        return const [
          'Store nay co mon matcha nao dang hot?',
          'Cho minh xem tin tuc moi cua Kamatcha',
          'Tai khoan cua toi dang o trang thai nao?',
        ];
      case 'SHIPPER':
        return const [
          'Voucher nao dang bat de tu van cho khach?',
          'Cho minh xem tin tuc moi cua Kamatcha',
          'Tai khoan cua toi dang o trang thai nao?',
        ];
      default:
        return const [
          'Cua hang nao o Quan 1 co matcha latte?',
          'Cho minh xem uu dai dang bat',
          'Tai khoan cua toi dang o trang thai nao?',
        ];
    }
>>>>>>> origin/main
  }

  Future<void> _bootstrap() async {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn) {
      return;
    }
    setState(() {
      _threadsLoading = true;
      _threadsError = null;
      _threadError = null;
      _error = null;
      _messages = const [];
      _threads = const [];
      _activeThreadId = null;
      _activeThreadTitle = '';
    });

    try {
      final threads = await controller.loadAiChatThreads(page: 0, size: 20);
      if (!mounted || _boundUserId != controller.session?.user.id) {
        return;
      }
      setState(() {
        _threads = threads;
      });
      if (threads.isNotEmpty) {
        await _openThread(threads.first);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _threadsError = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _threadsLoading = false;
        });
      }
    }
  }

  Future<void> _refreshThreads({bool quiet = false}) async {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn) {
      return;
    }
    if (!quiet) {
      setState(() {
        _threadsLoading = true;
        _threadsError = null;
      });
    }
    try {
      final threads = await controller.loadAiChatThreads(page: 0, size: 20);
      if (!mounted) {
        return;
      }
      setState(() {
        _threads = threads;
        _threadsError = null;
        final activeSummary = _threads.where(
          (item) => item.threadId == _activeThreadId,
        );
        if (activeSummary.isNotEmpty &&
            activeSummary.first.title.trim().isNotEmpty) {
          _activeThreadTitle = activeSummary.first.title.trim();
        }
      });
    } catch (error) {
      if (!mounted || quiet) {
        return;
      }
      setState(() {
        _threadsError = error.toString();
      });
    } finally {
      if (mounted && !quiet) {
        setState(() {
          _threadsLoading = false;
        });
      }
    }
  }

  Future<void> _openThread(AiChatThreadSummary thread) async {
    setState(() {
      _activeThreadId = thread.threadId;
      _activeThreadTitle = thread.title.trim();
      _threadLoading = true;
      _threadError = null;
      _error = null;
    });
    try {
      final detail =
          await AppScope.of(context).loadAiChatThreadDetail(thread.threadId);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages = detail.messages.map(_AiChatUiMessage.fromStored).toList();
        _activeThreadId = detail.threadId;
        _activeThreadTitle = detail.title.trim().isEmpty
            ? thread.title.trim()
            : detail.title.trim();
        _threadError = null;
      });
      _scrollToBottom();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _threadError = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _threadLoading = false;
        });
      }
    }
  }

  void _startNewThread() {
    setState(() {
      _activeThreadId = null;
      _activeThreadTitle = '';
      _messages = const [];
      _threadError = null;
      _error = null;
    });
    _composerFocusNode.requestFocus();
  }

  void _prefillPrompt(String prompt) {
    _composerController
      ..text = prompt
      ..selection = TextSelection.collapsed(offset: prompt.length);
    _composerFocusNode.requestFocus();
  }

  List<String> _quickPromptsForRole(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return const [
          'Which store is performing best today?',
          'Show me the active promotions in the system',
          'Open the next order record that needs action',
        ];
      case 'MANAGER':
        return const [
          'Summarize my store today',
          'Which item is selling best in this store?',
          'Show me the latest store feedback',
        ];
      case 'STAFF':
        return const [
          'Which order should I handle next?',
          'Which items are trending in this store?',
          'Open the related order quickly',
        ];
      case 'SHIPPER':
        return const [
          'Which order is ready for delivery?',
          'Open the latest delivery order',
          'Show me the delivery details for the new order',
        ];
      default:
        return const [
          'Which nearby store has matcha latte?',
          'Suggest a signature drink and add it to my cart',
          'Show me the latest order',
        ];
    }
  }

  Future<void> _showConversationSheet() async {
    final result = await showModalBottomSheet<_AiConversationSheetResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _AiConversationSheet(
        threads: _threads,
        activeThreadId: _activeThreadId,
        loading: _threadsLoading,
        error: _threadsError,
      ),
    );
    if (!mounted || result == null) {
      return;
    }
    if (result.startNew) {
      _startNewThread();
      return;
    }
    final selectedThread = result.thread;
    if (selectedThread == null) {
      return;
    }
    await _openThread(selectedThread);
  }

  Future<void> _sendMessage([String? preset]) async {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn || _sending || _threadLoading) {
      return;
    }
    final message = (preset ?? _composerController.text).trim();
    if (message.isEmpty) {
      return;
    }
    final history = _messages
        .where((entry) => entry.role == 'user' || entry.role == 'assistant')
        .map(
          (entry) => AiChatHistoryEntry(
            role: entry.role,
            content: entry.content,
          ),
        )
        .toList();
    final boundedHistory =
        history.length > 8 ? history.sublist(history.length - 8) : history;
    final localUserMessage = _AiChatUiMessage(
      role: 'user',
      content: message,
      createdAt: DateTime.now(),
    );

    setState(() {
      _messages = [..._messages, localUserMessage];
      _sending = true;
      _error = null;
      _composerController.clear();
    });
    _scrollToBottom();

    try {
      final response = await controller.queryAiChat(
        message: message,
        history: boundedHistory,
        threadId: _activeThreadId,
      );
      if (!mounted) {
        return;
      }
      final nextThreadId = response.threadId ?? _activeThreadId;
      final nextThreadTitle = (response.threadTitle ?? '').trim();
      setState(() {
        _activeThreadId = nextThreadId;
        if (nextThreadTitle.isNotEmpty) {
          _activeThreadTitle = nextThreadTitle;
        } else if (_activeThreadTitle.trim().isEmpty) {
          _activeThreadTitle = _deriveThreadTitle(message);
        }
        _messages = [
          ..._messages,
          _AiChatUiMessage(
            role: 'assistant',
            content: response.answer,
            createdAt: DateTime.now(),
            references: response.references,
            actions: response.actions,
            model: response.model,
          ),
        ];
      });
      unawaited(_refreshThreads(quiet: true));
      _scrollToBottom();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOut,
      );
    });
  }

  String _deriveThreadTitle(String message) {
    final normalized = message.trim();
    if (normalized.isEmpty) {
      return 'Kamatcha chat';
    }
    return normalized.length <= 48
        ? normalized
        : '${normalized.substring(0, 45).trim()}...';
  }

  Future<void> _openReference(AiChatReference reference) async {
    final route = _resolveReferenceRoute(reference);
    if (route == null) {
      if ((reference.userApiPath ?? '').trim() == '/api/auth/me') {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account details are shown inside AI chat.'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No mobile screen is available for this reference yet.'),
          ),
        );
      }
      return;
    }
    await Navigator.of(context).push(route);
  }

  Route<void>? _resolveReferenceRoute(AiChatReference reference) {
    final controller = AppScope.of(context);
    if (controller.isBackoffice &&
        (reference.adminApiPath ?? '').trim().isNotEmpty) {
      return _buildAdminReferenceRoute(reference.adminApiPath!);
    }
    return _buildPublicReferenceRoute(
      entityType: reference.entityType,
      id: reference.id,
      slug: reference.slug,
      apiPath: reference.userApiPath ?? reference.publicApiPath,
    );
  }

  Future<void> _handleAction(AiChatAction action) async {
    final controller = AppScope.of(context);
    final actionType = action.actionType.trim().toUpperCase();
    try {
      switch (actionType) {
        case 'ADD_TO_CART':
          await _handleAddToCartAction(action);
          return;
        case 'OPEN_CART':
          await Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const CartScreen()),
          );
          return;
        case 'OPEN_ORDERS':
          if (controller.isUser) {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const OrdersScreen()),
            );
            return;
          }
          if (controller.isEmployee) {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => EmployeeOrdersScreen(
                  kind: _employeeRoleKind(controller),
                ),
              ),
            );
            return;
          }
          if (controller.isBackoffice) {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => AdminResourceListScreen(
                  module: moduleById('orders'),
                ),
              ),
            );
            return;
          }
          break;
        case 'OPEN_ORDER':
          await _handleOpenOrderAction(action);
          return;
        case 'OPEN_ACCOUNT':
          await _handleOpenAccountAction(action);
          return;
        case 'OPEN_STORE':
        case 'OPEN_DISH':
        case 'OPEN_EVENT':
        case 'OPEN_NEWS':
        case 'OPEN_REFERENCE':
          final route = _buildRouteFromAction(action);
          if (route != null) {
            await Navigator.of(context).push(route);
            return;
          }
          break;
        case 'OPEN_PROMOTION':
          final route = _buildAdminReferenceRoute(action.apiPath ?? '');
          if (route != null) {
            await Navigator.of(context).push(route);
            return;
          }
          break;
      }
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            action.description ??
                'This action is not available on mobile yet.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _handleAddToCartAction(AiChatAction action) async {
    final payload = action.payload ?? const {};
    final dishId = asNullableInt(payload['dishId']);
    final storeId = asNullableInt(payload['storeId']);
    final quantity = asInt(payload['quantity'], 1);
    if (dishId == null) {
      throw ApiException('The AI action is missing dishId.');
    }
    final controller = AppScope.of(context);
    final detail = await controller.loadDishDetail(dishId);
    final store = detail.stores.where((item) => item.storeId == storeId);
    final matchedStore = store.isNotEmpty ? store.first : null;
    final fallbackStore = detail.stores.isNotEmpty ? detail.stores.first : null;
    final resolvedStoreId = matchedStore?.storeId ?? fallbackStore?.storeId;
    if (resolvedStoreId == null) {
      throw ApiException('Could not determine the store for this item.');
    }
    await controller.addToCart(
      storeId: resolvedStoreId,
      storeName: matchedStore?.storeName ??
          fallbackStore?.storeName ??
          detail.dish.storeName,
      dishId: dishId,
      dishName: detail.dish.name,
      unitPrice:
          matchedStore?.price ?? fallbackStore?.price ?? detail.dish.price,
      imagePaths: detail.dish.imagePaths,
      quantity: quantity <= 0 ? 1 : quantity,
    );
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${detail.dish.name} was added to your cart.')),
    );
  }

  Future<void> _handleOpenOrderAction(AiChatAction action) async {
    final controller = AppScope.of(context);
    final payload = action.payload ?? const {};
    final orderId = asNullableInt(payload['orderId']) ??
        _extractPathId(action.apiPath, '/api/user/orders/') ??
        _extractPathId(action.apiPath, '/api/employee/orders/') ??
        _extractPathId(action.apiPath, '/api/admin/orders/');
    if (orderId == null) {
      throw ApiException('Could not determine the orderId from the AI action.');
    }
    if (controller.isUser) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OrderDetailScreen(orderId: orderId),
        ),
      );
      return;
    }
    if (controller.isEmployee) {
      final order = await controller.loadEmployeeOrderDetail(orderId);
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => EmployeeOrderDetailScreen(
            kind: _employeeRoleKind(controller),
            initialOrder: order,
          ),
        ),
      );
      return;
    }
    final route = _buildAdminReferenceRoute('/api/admin/orders/$orderId');
    if (route != null) {
      await Navigator.of(context).push(route);
      return;
    }
    throw ApiException('Could not open this order on mobile.');
  }

  Future<void> _handleOpenAccountAction(AiChatAction action) async {
    final controller = AppScope.of(context);
    if (controller.isUser) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const ProfileScreen()),
      );
      return;
    }
    final route = _buildAdminReferenceRoute(action.apiPath ?? '');
    if (route != null) {
      await Navigator.of(context).push(route);
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Account status is shown directly in the chat.'),
      ),
    );
  }

  Route<void>? _buildRouteFromAction(AiChatAction action) {
    final payload = action.payload ?? const {};
    final actionType = action.actionType.trim().toUpperCase();
    switch (actionType) {
      case 'OPEN_STORE':
        return _buildPublicReferenceRoute(
          entityType: 'STORE',
          id: asNullableInt(payload['storeId']) ?? asNullableInt(payload['id']),
          slug: asNullableString(payload['storeSlug']) ??
              asNullableString(payload['slug']),
          apiPath: action.apiPath,
        );
      case 'OPEN_DISH':
        return _buildPublicReferenceRoute(
          entityType: 'DISH',
          id: asNullableInt(payload['dishId']) ?? asNullableInt(payload['id']),
          slug: null,
          apiPath: action.apiPath,
        );
      case 'OPEN_EVENT':
        return _buildPublicReferenceRoute(
          entityType: 'EVENT',
          id: asNullableInt(payload['eventId']) ?? asNullableInt(payload['id']),
          slug: asNullableString(payload['eventKey']) ??
              asNullableString(payload['slug']),
          apiPath: action.apiPath,
        );
      case 'OPEN_NEWS':
        return _buildPublicReferenceRoute(
          entityType: 'NEWS',
          id: asNullableInt(payload['newsId']) ?? asNullableInt(payload['id']),
          slug: asNullableString(payload['newsKey']) ??
              asNullableString(payload['slug']),
          apiPath: action.apiPath,
        );
      case 'OPEN_REFERENCE':
        if ((action.apiPath ?? '').trim().startsWith('/api/admin/')) {
          return _buildAdminReferenceRoute(action.apiPath!);
        }
        return _buildPublicReferenceRoute(
          entityType: 'STORE',
          id: asNullableInt(payload['id']),
          slug: asNullableString(payload['slug']),
          apiPath: action.apiPath,
        );
      default:
        return null;
    }
  }

  Route<void>? _buildPublicReferenceRoute({
    required String entityType,
    required int? id,
    required String? slug,
    required String? apiPath,
  }) {
    final normalizedType = entityType.trim().toUpperCase();
    final path = (apiPath ?? '').trim();
    switch (normalizedType) {
      case 'STORE':
        final key = (slug ?? '').trim().isNotEmpty
            ? slug!.trim()
            : _extractTrailingPathSegment(path, '/api/public/stores/');
        if ((key ?? '').trim().isEmpty && id != null && id > 0) {
          return MaterialPageRoute<void>(
            builder: (_) => StoreDetailScreen(storeKey: '$id'),
          );
        }
        if ((key ?? '').trim().isEmpty) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => StoreDetailScreen(storeKey: key!.trim()),
        );
      case 'DISH':
        final dishId = id ?? _extractPathId(path, '/api/public/dishes/');
        if (dishId == null || dishId <= 0) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => DishDetailScreen(dishId: dishId),
        );
      case 'EVENT':
        final eventKey = (slug ?? '').trim().isNotEmpty
            ? slug!.trim()
            : _extractTrailingPathSegment(path, '/api/public/events/');
        if ((eventKey ?? '').trim().isNotEmpty) {
          return MaterialPageRoute<void>(
            builder: (_) => EventDetailScreen(eventKey: eventKey!.trim()),
          );
        }
        if (id == null || id <= 0) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => EventDetailScreen(eventKey: '$id'),
        );
      case 'NEWS':
        final newsKey = (slug ?? '').trim().isNotEmpty
            ? slug!.trim()
            : _extractTrailingPathSegment(path, '/api/public/news/');
        if ((newsKey ?? '').trim().isEmpty) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => NewsDetailScreen(newsKey: newsKey!.trim()),
        );
      default:
        return null;
    }
  }

  Route<void>? _buildAdminReferenceRoute(String adminApiPath) {
    final path = adminApiPath.trim();
    if (path.isEmpty) {
      return null;
    }
    final uri = Uri.tryParse(path);
    if (uri == null) {
      return null;
    }
    final segments = uri.pathSegments;
    if (segments.length < 4 || segments[0] != 'api' || segments[1] != 'admin') {
      return null;
    }
    final moduleId = segments[2];
    final resourceId = int.tryParse(segments[3]);
    if (resourceId == null) {
      return null;
    }
    try {
      final module = moduleById(moduleId);
      return MaterialPageRoute<void>(
        builder: (_) => AdminResourceDetailScreen(
          module: module,
          resourceId: resourceId,
        ),
      );
    } catch (_) {
      return null;
    }
  }

  int? _extractPathId(String? apiPath, String prefix) {
    final path = (apiPath ?? '').trim();
    if (!path.startsWith(prefix)) {
      return null;
    }
    final rawValue = path.substring(prefix.length).split('/').first.trim();
    return int.tryParse(rawValue);
  }

  String? _extractTrailingPathSegment(String path, String prefix) {
    if (!path.startsWith(prefix)) {
      return null;
    }
    final rawValue = path.substring(prefix.length).split('/').first.trim();
    return rawValue.isEmpty ? null : Uri.decodeComponent(rawValue);
  }

  EmployeeRoleKind _employeeRoleKind(AppController controller) {
    return controller.isShipper
        ? EmployeeRoleKind.shipper
        : EmployeeRoleKind.staff;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('AI chat')),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: EmptyStateCard(
            title: 'Sign in required',
            message:
                'Sign in to ask AI about stores, items, events, news, vouchers, and your account status.',
            actionLabel: 'Sign in',
            onAction: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const LoginScreen(),
                ),
              );
            },
          ),
        ),
      );
    }

    final prompts = _quickPromptsForRole(controller.currentRole).take(2).toList();
    final activeThreadSummary =
        _threads.where((thread) => thread.threadId == _activeThreadId);
    final activeThreadMeta =
        activeThreadSummary.isNotEmpty ? activeThreadSummary.first : null;

    return Scaffold(
<<<<<<< HEAD
      appBar: AppBar(
        title: const Text('Kamatcha AI'),
        actions: [
          if (controller.isUser)
            IconButton(
              tooltip: 'Notice',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const NotificationsScreen(),
                  ),
                );
              },
              icon: Badge(
                isLabelVisible: controller.userNotificationUnreadCount > 0,
                label: Text('${controller.userNotificationUnreadCount}'),
                child: const Icon(Icons.notifications_none_rounded),
              ),
            ),
          if (controller.isUser)
            IconButton(
              tooltip: 'Cart',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const CartScreen()),
                );
              },
              icon: Badge(
                isLabelVisible: controller.cart.totalItems > 0,
                label: Text('${controller.cart.totalItems}'),
                child: const Icon(Icons.shopping_bag_outlined),
              ),
            ),
          IconButton(
            tooltip: 'Chat history',
            onPressed: _showConversationSheet,
            icon: const Icon(Icons.history_outlined),
          ),
          IconButton(
            tooltip: 'New chat',
            onPressed: _startNewThread,
            icon: const Icon(Icons.add_comment_outlined),
          ),
        ],
      ),
=======
      appBar: AppBar(title: const Text('Kamatcha AI')),
>>>>>>> origin/main
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              children: [
                _AiQuickPromptCard(
                  prompts: prompts,
                  onSelectPrompt: _prefillPrompt,
                ),
                if ((_threadsError ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _AiInlineErrorBanner(message: _threadsError!),
                ],
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.84),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFFE2E5DA)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 18,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    _AiChatPanelHeader(
                      title: _activeThreadTitle.trim().isEmpty
                          ? 'New chat'
                          : _activeThreadTitle.trim(),
                      subtitle: _activeThreadId == null
                          ? 'Ready to chat'
                          : '${_messages.length} messages',
                      loading: _threadLoading,
                      lastUpdatedAt: activeThreadMeta?.updatedAt,
                    ),
                    Expanded(
                      child: _buildMessageViewport(controller),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if ((_error ?? '').trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: _AiInlineErrorBanner(message: _error!),
            ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _composerController,
                      focusNode: _composerFocusNode,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: const InputDecoration(
                        hintText: 'Ask AI about items, stores, or orders...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.filled(
                    onPressed: _sending || _threadLoading ? null : _sendMessage,
                    icon: _sending
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                    tooltip: 'Send',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageViewport(AppController controller) {
    if (_threadLoading && _messages.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if ((_threadError ?? '').trim().isNotEmpty && _messages.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: ErrorStateCard(
          message: _threadError!,
          onRetry: _activeThreadId == null
              ? _bootstrap
              : () async {
                  final thread = _threads.where(
                    (item) => item.threadId == _activeThreadId,
                  );
                  if (thread.isNotEmpty) {
                    await _openThread(thread.first);
                  } else {
                    await _refreshThreads();
                  }
                },
        ),
      );
    }
    if (_messages.isEmpty) {
      return _AiChatEmptyState(
        role: controller.currentRole,
        onPromptTap: _prefillPrompt,
        prompts: _quickPromptsForRole(controller.currentRole),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      itemCount: _messages.length + (_sending ? 1 : 0),
      itemBuilder: (context, index) {
        if (_sending && index == _messages.length) {
          return const Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: EdgeInsets.only(top: 4, bottom: 12),
              child: SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ),
          );
        }
        final message = _messages[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _AiChatMessageCard(
            message: message,
            imageResolver: controller.config.resolveImageUrl,
            onOpenReference: _openReference,
            onAction: _handleAction,
          ),
        );
      },
    );
  }
}

class _AiQuickPromptCard extends StatelessWidget {
  const _AiQuickPromptCard({
    required this.prompts,
    required this.onSelectPrompt,
  });

  final List<String> prompts;
  final ValueChanged<String> onSelectPrompt;

  @override
  Widget build(BuildContext context) {
<<<<<<< HEAD
    if (prompts.isEmpty) {
      return const SizedBox.shrink();
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E5DA)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: prompts.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final prompt = prompts[index];
              return ActionChip(
                label: Text(prompt),
                onPressed: () => onSelectPrompt(prompt),
              );
            },
=======
    final controller = AppScope.of(context);
    final incoming = message.role == 'assistant';
    return Align(
      alignment: incoming ? Alignment.centerLeft : Alignment.centerRight,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: Card(
          color: incoming ? null : const Color(0xFFE8F0E0),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  incoming ? 'Kamatcha AI' : 'Ban',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(message.content),
                if (message.currentUserStatus != null) ...[
                  const SizedBox(height: 12),
                  _AiUserStatusCard(status: message.currentUserStatus!),
                ],
                if (message.references.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ...message.references.map(
                    (reference) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => onOpenReference(reference),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.78),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE1E6D7)),
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 72,
                                child: NetworkOrFallbackImage(
                                  imageUrl: controller.config.resolveImageUrl(reference.imagePath),
                                  height: 72,
                                  borderRadius: BorderRadius.circular(16),
                                  label: reference.title,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      reference.title,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleSmall
                                          ?.copyWith(fontWeight: FontWeight.w800),
                                    ),
                                    if ((reference.subtitle ?? '').trim().isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        reference.subtitle!,
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        MetricChip(label: reference.entityType),
                                        if ((reference.slug ?? '').trim().isNotEmpty)
                                          MetricChip(label: reference.slug!),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward_ios, size: 16),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
>>>>>>> origin/main
          ),
        ),
      ),
    );
  }
}

class _AiChatPanelHeader extends StatelessWidget {
  const _AiChatPanelHeader({
    required this.title,
    required this.subtitle,
    required this.loading,
    required this.lastUpdatedAt,
  });

  final String title;
  final String subtitle;
  final bool loading;
  final DateTime? lastUpdatedAt;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(subtitle),
                if (lastUpdatedAt != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Updated ${Formatters.fullDateTime(lastUpdatedAt)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.3),
                )
              : const Icon(Icons.forum_outlined),
        ],
      ),
    );
  }
}

class _AiChatEmptyState extends StatelessWidget {
  const _AiChatEmptyState({
    required this.role,
    required this.onPromptTap,
    required this.prompts,
  });

  final String role;
  final ValueChanged<String> onPromptTap;
  final List<String> prompts;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F5EB),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.smart_toy_outlined, size: 34),
            ),
            const SizedBox(height: 16),
            Text(
              _welcomeMessageForRole(role),
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: prompts
                  .map(
                    (prompt) => ActionChip(
                      label: Text(prompt),
                      onPressed: () => onPromptTap(prompt),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _AiInlineErrorBanner extends StatelessWidget {
  const _AiInlineErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4F2),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF1C7C0)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Text(
        message,
        style: Theme.of(context)
            .textTheme
            .bodySmall
            ?.copyWith(color: const Color(0xFF8A463A)),
      ),
    );
  }
}

bool _looksLikeHtmlFragment(String value) {
  return RegExp(r'</?[a-z][\s\S]*>', caseSensitive: false).hasMatch(value);
}

class _AiHtmlMessageBody extends StatelessWidget {
  const _AiHtmlMessageBody({required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    final normalized = content.trim();
    if (normalized.isEmpty || !_looksLikeHtmlFragment(normalized)) {
      return Text(normalized);
    }

    return Html(
      data: normalized,
      style: {
        'html': Style(margin: Margins.zero, padding: HtmlPaddings.zero),
        'body': Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
          fontSize: FontSize(14),
          color: const Color(0xFF4B5A50),
        ),
        'section': Style(margin: Margins.zero, padding: HtmlPaddings.zero),
        'h2': Style(
          margin: Margins.only(bottom: 10),
          fontSize: FontSize(11),
          fontWeight: FontWeight.w800,
          color: const Color(0xFF5C7A52),
        ),
        'h3': Style(
          margin: Margins.only(bottom: 8),
          fontSize: FontSize(15),
          fontWeight: FontWeight.w700,
          color: const Color(0xFF17332A),
        ),
        'p': Style(margin: Margins.only(bottom: 10)),
        'ul': Style(margin: Margins.only(left: 18, bottom: 10)),
        'ol': Style(margin: Margins.only(left: 18, bottom: 10)),
        'li': Style(margin: Margins.only(bottom: 6)),
        'small': Style(fontSize: FontSize(11), color: const Color(0xFF6F756C)),
        'code': Style(
          padding: HtmlPaddings.symmetric(horizontal: 6, vertical: 3),
          backgroundColor: const Color(0xFFEFF4EA),
          fontSize: FontSize(12),
        ),
      },
    );
  }
}

class _AiChatMessageCard extends StatelessWidget {
  const _AiChatMessageCard({
    required this.message,
    required this.imageResolver,
    required this.onOpenReference,
    required this.onAction,
  });

  final _AiChatUiMessage message;
  final String? Function(String?) imageResolver;
  final Future<void> Function(AiChatReference reference) onOpenReference;
  final Future<void> Function(AiChatAction action) onAction;

  @override
  Widget build(BuildContext context) {
    final incoming = message.role == 'assistant';
    final groupedActions = _AiGroupedActions.from(message.actions);
    final visibleReferences = message.references
        .where(
          (reference) => _isPrimarySuggestionReference(reference.entityType),
        )
        .toList();
    final bubbleWidthFactor = incoming ? 0.98 : 0.92;
    return LayoutBuilder(
      builder: (context, constraints) {
        return Align(
          alignment: incoming ? Alignment.centerLeft : Alignment.centerRight,
          child: SizedBox(
            width: constraints.maxWidth * bubbleWidthFactor,
            child: Card(
              color: incoming ? null : const Color(0xFFE8F0E0),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (incoming || message.createdAt != null)
                      Row(
                        children: [
                          if (incoming)
                            Expanded(
                              child: Text(
                                'Kamatcha AI',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelLarge
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                            )
                          else
                            const Spacer(),
                          if ((message.model ?? '').trim().isNotEmpty &&
                              incoming) ...[
                            MetricChip(label: message.model!),
                            const SizedBox(width: 8),
                          ],
                          if (message.createdAt != null)
                            Text(
                              Formatters.fullDateTime(message.createdAt),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                        ],
                      ),
                    if (incoming || message.createdAt != null)
                      const SizedBox(height: 8),
                    incoming
                        ? _AiHtmlMessageBody(content: message.content)
                        : Text(message.content),
                    if (visibleReferences.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.58),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFE1E6D7)),
                        ),
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Related picks',
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 10),
                            ...visibleReferences.map(
                              (reference) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _AiReferenceCard(
                                  reference: reference,
                                  imageResolver: imageResolver,
                                  actions: groupedActions.byReferenceKey[
                                          reference.referenceKey] ??
                                      const [],
                                  onOpenReference: onOpenReference,
                                  onAction: onAction,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _AiReferenceCard extends StatelessWidget {
  const _AiReferenceCard({
    required this.reference,
    required this.imageResolver,
    required this.actions,
    required this.onOpenReference,
    required this.onAction,
  });

  final AiChatReference reference;
  final String? Function(String?) imageResolver;
  final List<AiChatAction> actions;
  final Future<void> Function(AiChatReference reference) onOpenReference;
  final Future<void> Function(AiChatAction action) onAction;

  @override
  Widget build(BuildContext context) {
    final fallbackAddToCart = _fallbackAddToCartActionForReference(reference);
    final referenceType = reference.entityType.trim().toUpperCase();
    final visibleActions = referenceType == 'DISH'
        ? actions
            .where(
              (action) => action.actionType.trim().toUpperCase() == 'ADD_TO_CART',
            )
            .toList()
        : const <AiChatAction>[];
    final hasAddToCart = visibleActions.any(
      (action) => action.actionType.trim().toUpperCase() == 'ADD_TO_CART',
    );
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => onOpenReference(reference),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE1E6D7)),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 68,
                  child: NetworkOrFallbackImage(
                    imageUrl: imageResolver(reference.imagePath),
                    height: 68,
                    borderRadius: BorderRadius.circular(16),
                    label: reference.title,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          MetricChip(
                            label: _referenceBadge(reference.entityType),
                          ),
                          if ((reference.slug ?? '').trim().isNotEmpty)
                            MetricChip(label: reference.slug!),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        reference.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      if ((reference.subtitle ?? '').trim().isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          reference.subtitle!,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (visibleActions.isNotEmpty || fallbackAddToCart != null)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (fallbackAddToCart != null && !hasAddToCart)
                    _AiActionButton(
                      action: fallbackAddToCart,
                      onPressed: () => onAction(fallbackAddToCart),
                    ),
                  ...visibleActions.map(
                    (action) => _AiActionButton(
                      action: action,
                      onPressed: () => onAction(action),
                    ),
                  ),
                ],
              )
          ],
        ),
      ),
    );
  }
}

class _AiActionButton extends StatelessWidget {
  const _AiActionButton({
    required this.action,
    required this.onPressed,
  });

  final AiChatAction action;
  final Future<void> Function() onPressed;

  @override
  Widget build(BuildContext context) {
    final actionType = action.actionType.trim().toUpperCase();
    if (actionType == 'ADD_TO_CART') {
      return IconButton.filledTonal(
        onPressed: () => unawaited(onPressed()),
        tooltip: action.label.isEmpty ? 'Add to cart' : action.label,
        icon: const Icon(Icons.add),
      );
    }
    if (actionType == 'OPEN_CART') {
      return FilledButton.tonalIcon(
        onPressed: () => unawaited(onPressed()),
        icon: const Icon(Icons.shopping_bag_outlined),
        label: Text(action.label.isEmpty ? 'Action' : action.label),
      );
    }
    return OutlinedButton(
      onPressed: () => unawaited(onPressed()),
      child: Text(action.label.isEmpty ? 'Action' : action.label),
    );
  }
}

class _AiConversationSheet extends StatefulWidget {
  const _AiConversationSheet({
    required this.threads,
    required this.activeThreadId,
    required this.loading,
    required this.error,
  });

  final List<AiChatThreadSummary> threads;
  final int? activeThreadId;
  final bool loading;
  final String? error;

  @override
  State<_AiConversationSheet> createState() => _AiConversationSheetState();
}

class _AiConversationSheetState extends State<_AiConversationSheet> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<AiChatThreadSummary> get _filteredThreads {
    final search = _searchController.text.trim().toLowerCase();
    if (search.isEmpty) {
      return widget.threads;
    }
    return widget.threads.where((thread) {
      final haystack = [
        thread.title,
        thread.lastMessagePreview,
        thread.lastMessageRole,
      ].join(' ').toLowerCase();
      return haystack.contains(search);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 8,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.72,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Conversations',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const Spacer(),
                  FilledButton.tonalIcon(
                    onPressed: () {
                      Navigator.of(context).pop(
                        const _AiConversationSheetResult(startNew: true),
                      );
                    },
                    icon: const Icon(Icons.add_comment_outlined),
                    label: const Text('New chat'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Search AI chat history...',
                  prefixIcon: Icon(Icons.search),
                ),
              ),
              if ((widget.error ?? '').trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                _AiInlineErrorBanner(message: widget.error!),
              ],
              const SizedBox(height: 12),
              Expanded(
                child: widget.loading
                    ? const Center(child: CircularProgressIndicator())
                    : _filteredThreads.isEmpty
                        ? const Center(
                            child: Text('No saved AI conversations yet.'),
                          )
                        : ListView.separated(
                            itemCount: _filteredThreads.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final thread = _filteredThreads[index];
                              final isActive =
                                  thread.threadId == widget.activeThreadId;
                              return InkWell(
                                borderRadius: BorderRadius.circular(18),
                                onTap: () {
                                  Navigator.of(context).pop(
                                    _AiConversationSheetResult(thread: thread),
                                  );
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: isActive
                                        ? const Color(0xFFEAF3E3)
                                        : Colors.white,
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                      color: isActive
                                          ? const Color(0xFFB8C9A7)
                                          : const Color(0xFFE1E6D7),
                                    ),
                                  ),
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              thread.title.trim().isEmpty
                                                  ? 'Untitled conversation'
                                                  : thread.title,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleSmall
                                                  ?.copyWith(
                                                    fontWeight: FontWeight.w800,
                                                  ),
                                            ),
                                          ),
                                          if (thread.messageCount > 0)
                                            MetricChip(
                                              label: '${thread.messageCount}',
                                            ),
                                        ],
                                      ),
                                      if (thread.lastMessagePreview
                                          .trim()
                                          .isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Text(
                                          thread.lastMessagePreview,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          if (thread.lastMessageRole
                                              .trim()
                                              .isNotEmpty)
                                            MetricChip(
                                              label: thread.lastMessageRole,
                                            ),
                                          if (thread.lastMessageAt != null)
                                            MetricChip(
                                              label: Formatters.fullDateTime(
                                                thread.lastMessageAt,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AiChatUiMessage {
  const _AiChatUiMessage({
    required this.role,
    required this.content,
    required this.createdAt,
    this.references = const [],
    this.actions = const [],
    this.model,
  });

  factory _AiChatUiMessage.fromStored(AiChatStoredMessage message) {
    return _AiChatUiMessage(
      role: message.role.trim().toLowerCase() == 'user' ? 'user' : 'assistant',
      content: message.content,
      createdAt: message.createdAt,
      references: message.references,
      actions: message.actions,
      model: message.model,
    );
  }

  final String role;
  final String content;
  final DateTime? createdAt;
  final List<AiChatReference> references;
  final List<AiChatAction> actions;
  final String? model;
}

class _AiGroupedActions {
  const _AiGroupedActions({
    required this.byReferenceKey,
    required this.generalActions,
  });

  factory _AiGroupedActions.from(List<AiChatAction> actions) {
    final deduped = <String, AiChatAction>{};
    for (final action in actions) {
      final key = action.actionKey.trim().isNotEmpty
          ? action.actionKey.trim()
          : '${action.actionType}:${action.referenceKey ?? ''}:${action.label}';
      deduped.putIfAbsent(key, () => action);
    }

    final byReferenceKey = <String, List<AiChatAction>>{};
    final generalActions = <AiChatAction>[];
    for (final action in deduped.values) {
      final referenceKey = (action.referenceKey ?? '').trim();
      if (referenceKey.isEmpty) {
        generalActions.add(action);
        continue;
      }
      byReferenceKey.putIfAbsent(referenceKey, () => <AiChatAction>[]);
      byReferenceKey[referenceKey]!.add(action);
    }
    return _AiGroupedActions(
      byReferenceKey: byReferenceKey,
      generalActions: generalActions,
    );
  }

  final Map<String, List<AiChatAction>> byReferenceKey;
  final List<AiChatAction> generalActions;
}

class _AiConversationSheetResult {
  const _AiConversationSheetResult({
    this.thread,
    this.startNew = false,
  });

  final AiChatThreadSummary? thread;
  final bool startNew;
}

String _welcomeMessageForRole(String role) {
  switch (role.toUpperCase()) {
    case 'ADMIN':
<<<<<<< HEAD
      return 'Quickly look up stores, items, events, news, promotions, and admin records across Kamatcha.';
    case 'MANAGER':
      return 'Ask about the current store, best sellers, news, promotions, and staff within the store scope.';
=======
      return 'Chao ban. Minh co the giup tra cuu nhanh store, mon, event, news, promotions va record quan tri theo quyen ADMIN cua Kamatcha.';
    case 'MANAGER':
      return 'Chao manager. Ban co the hoi ve store hien tai, mon dang ban tot, tin tuc, promotions va nhan su trong scope cua hang Kamatcha.';
>>>>>>> origin/main
    case 'STAFF':
      return 'Quickly ask about actionable orders, items, stores, and related info to work faster on mobile.';
    case 'SHIPPER':
      return 'Quickly ask about delivery orders, customer details, stores, and offers while you are on delivery.';
    default:
      return 'Ask about stores, items, events, vouchers, and your account status.';
  }
}

AiChatAction? _fallbackAddToCartActionForReference(AiChatReference reference) {
  if (reference.entityType.trim().toUpperCase() != 'DISH' || reference.id == null) {
    return null;
  }
  return AiChatAction(
    actionKey: 'fallback-add-to-cart-${reference.referenceKey}',
    actionType: 'ADD_TO_CART',
    label: 'Add to cart',
    description: 'Add the suggested item to the cart',
    method: 'POST',
    apiPath: reference.userApiPath,
    referenceKey: reference.referenceKey,
    payload: {
      'dishId': reference.id,
      'quantity': 1,
    },
  );
}

bool _isPrimarySuggestionReference(String entityType) {
  final normalized = entityType.trim().toUpperCase();
  return normalized == 'DISH' || normalized == 'STORE';
}

String _referenceBadge(String entityType) {
  switch (entityType.trim().toUpperCase()) {
    case 'STORE':
      return 'Store';
    case 'DISH':
      return 'Dish';
    case 'EVENT':
      return 'Event';
    case 'NEWS':
      return 'News';
    case 'PROMOTION':
      return 'Promotion';
    case 'USER':
      return 'Account';
    case 'ORDER':
      return 'Order';
    default:
      return entityType.trim().isEmpty ? 'Reference' : entityType.trim();
  }
}
