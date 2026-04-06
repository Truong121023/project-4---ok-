import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../core/models/models.dart';
import '../core/utils/order_qr_utils.dart';
import '../core/theme/app_theme.dart';
import '../screens/admin/admin_shell.dart';
import '../screens/cart_screen.dart';
import '../screens/employee/employee_shell.dart';
import '../screens/employee/employee_support.dart';
import '../screens/explore_screen.dart';
import '../screens/home_screen.dart';
import '../screens/ai_chat_screen.dart';
import '../screens/login_screen.dart';
import '../screens/manager/manager_shell.dart';
import '../screens/order_qr_navigation.dart';
import '../screens/orders_screen.dart';
import '../screens/password_reset_screen.dart';
import '../screens/profile_screen.dart';
import 'app_controller.dart';

class TeaMatchaApp extends StatefulWidget {
  const TeaMatchaApp({super.key});

  @override
  State<TeaMatchaApp> createState() => _TeaMatchaAppState();
}

class _TeaMatchaAppState extends State<TeaMatchaApp> {
  late final Future<AppController> _controllerFuture;
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  final GlobalKey<ScaffoldMessengerState> _messengerKey = GlobalKey<ScaffoldMessengerState>();
  final AppLinks _appLinks = AppLinks();

  AppController? _controller;
  StreamSubscription<Uri>? _appLinksSubscription;
  String? _queuedQrToken;
  String? _activeQrToken;
  bool _handlingDeepLink = false;
  bool _showingSessionInterruption = false;

  @override
  void initState() {
    super.initState();
    _controllerFuture = _createController();
    _appLinksSubscription = _appLinks.uriLinkStream.listen(_onIncomingUri);
    _loadInitialLink();
  }

  @override
  void dispose() {
    _appLinksSubscription?.cancel();
    _controller?.removeListener(_handleControllerSignals);
    super.dispose();
  }

  Future<AppController> _createController() async {
    final controller = await AppController.create();
    _controller = controller;
    controller.addListener(_handleControllerSignals);
    _schedulePendingQrHandle();
    _schedulePendingSessionInterruptionHandle();
    return controller;
  }

  void _handleControllerSignals() {
    _schedulePendingQrHandle();
    _schedulePendingSessionInterruptionHandle();
  }

  void _onIncomingUri(Uri uri) {
    final token = extractOrderQrToken(uri.toString());
    if (token == null) {
      return;
    }
    _enqueueQrToken(token);
  }

  Future<void> _loadInitialLink() async {
    final uri = await _appLinks.getInitialLink();
    if (!mounted || uri == null) {
      return;
    }
    _onIncomingUri(uri);
  }

  void _enqueueQrToken(String token) {
    if (token == _queuedQrToken || token == _activeQrToken) {
      return;
    }
    _queuedQrToken = token;
    _schedulePendingQrHandle();
  }

  void _schedulePendingQrHandle() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      _handlePendingQrToken();
    });
  }

  void _schedulePendingSessionInterruptionHandle() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      _handlePendingSessionInterruption();
    });
  }

  Future<void> _handlePendingQrToken() async {
    if (_handlingDeepLink) {
      return;
    }
    final controller = _controller;
    final navigator = _navigatorKey.currentState;
    final token = _queuedQrToken;
    if (controller == null || navigator == null || token == null) {
      return;
    }

    _handlingDeepLink = true;
    _queuedQrToken = null;
    _activeQrToken = token;

    try {
      if (!controller.isLoggedIn) {
        await controller.savePendingOrderQrToken(token);
        if (!mounted) {
          return;
        }
        await navigator.push(
          MaterialPageRoute<void>(
            builder: (_) => const LoginScreen(),
          ),
        );
      }

      if (!mounted || !controller.isLoggedIn) {
        return;
      }

      final effectiveToken = controller.pendingOrderQrToken ?? token;
      final response = await controller.resolveOrderQr(effectiveToken);
      if (!mounted) {
        return;
      }

      _messengerKey.currentState?.showSnackBar(
        SnackBar(content: Text(response.message)),
      );

      final route = _buildQrRoute(controller, response);
      if (route != null) {
        await navigator.push(route);
      }
    } catch (error) {
      _messengerKey.currentState?.showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      _activeQrToken = null;
      _handlingDeepLink = false;
      if (_queuedQrToken != null) {
        _schedulePendingQrHandle();
      }
    }
  }

  Future<void> _handlePendingSessionInterruption() async {
    if (_showingSessionInterruption) {
      return;
    }
    final controller = _controller;
    final navigator = _navigatorKey.currentState;
    if (controller == null || navigator == null) {
      return;
    }

    final notice = controller.consumePendingSessionInterruption();
    if (notice == null) {
      return;
    }

    _showingSessionInterruption = true;
    try {
      navigator.popUntil((route) => route.isFirst);

      final action = await showDialog<_SessionInterruptionAction>(
        context: _navigatorKey.currentContext ?? navigator.context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: Text(notice.title),
          content: Text(notice.message),
          actions: [
            if (notice.supportsPasswordReset)
              TextButton(
                onPressed: () => Navigator.of(context).pop(_SessionInterruptionAction.passwordReset),
                child: Text(notice.secondaryActionLabel!),
              ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(_SessionInterruptionAction.login),
              child: Text(notice.primaryActionLabel),
            ),
          ],
        ),
      );

      if (!mounted) {
        return;
      }

      if (action == _SessionInterruptionAction.passwordReset) {
        await navigator.push(
          MaterialPageRoute<void>(
            builder: (_) => PasswordResetScreen(initialEmail: notice.email),
          ),
        );
      } else {
        await navigator.push(
          MaterialPageRoute<void>(
            builder: (_) => const LoginScreen(),
          ),
        );
      }
    } finally {
      _showingSessionInterruption = false;
      if (controller.pendingSessionInterruption != null) {
        _schedulePendingSessionInterruptionHandle();
      }
    }
  }

  Route<void>? _buildQrRoute(AppController controller, dynamic response) {
    if (response is! MobileOrderQrResolveResponse) {
      return null;
    }
    return buildOrderQrRoute(controller, response);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<AppController>(
      future: _controllerFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.build(),
            home: const _SplashScreen(),
          );
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.build(),
            home: Scaffold(
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(snapshot.error.toString()),
                ),
              ),
            ),
          );
        }

        final controller = snapshot.data!;
        return AppScope(
          controller: controller,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.build(),
            navigatorKey: _navigatorKey,
            scaffoldMessengerKey: _messengerKey,
            home: const RoleAwareAppShell(),
          ),
        );
      },
    );
  }
}

class AppScope extends InheritedNotifier<AppController> {
  const AppScope({
    super.key,
    required AppController controller,
    required super.child,
  }) : super(notifier: controller);

  static AppController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found in widget tree.');
    return scope!.notifier!;
  }
}

class RoleAwareAppShell extends StatelessWidget {
  const RoleAwareAppShell({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        if (controller.isAdmin) {
          return const AdminShell();
        }
        if (controller.isManager) {
          return const ManagerShell();
        }
        if (controller.isStaff) {
          return const EmployeeShell(kind: EmployeeRoleKind.staff);
        }
        if (controller.isShipper) {
          return const EmployeeShell(kind: EmployeeRoleKind.shipper);
        }
        return const CustomerShell();
      },
    );
  }
}

class CustomerShell extends StatefulWidget {
  const CustomerShell({super.key});

  @override
  State<CustomerShell> createState() => _CustomerShellState();
}

class _CustomerShellState extends State<CustomerShell> {
  int _index = 0;

  late final List<Widget> _pages = const [
    HomeScreen(),
    ExploreScreen(),
    OrdersScreen(),
    CartScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(
          index: _index,
          children: _pages,
        ),
      ),
      floatingActionButton: const AiChatFab(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Explore'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Orders'),
          NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag), label: 'Cart'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Account'),
        ],
        onDestinationSelected: (index) => setState(() => _index = index),
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}

enum _SessionInterruptionAction {
  login,
  passwordReset,
}
