import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../screens/admin/admin_shell.dart';
import '../screens/cart_screen.dart';
import '../screens/dishes_screen.dart';
import '../screens/employee/employee_shell.dart';
import '../screens/employee/employee_support.dart';
import '../screens/home_screen.dart';
import '../screens/manager/manager_shell.dart';
import '../screens/profile_screen.dart';
import '../screens/stores_screen.dart';
import 'app_controller.dart';

class TeaMatchaApp extends StatefulWidget {
  const TeaMatchaApp({super.key});

  @override
  State<TeaMatchaApp> createState() => _TeaMatchaAppState();
}

class _TeaMatchaAppState extends State<TeaMatchaApp> {
  late final Future<AppController> _controllerFuture;

  @override
  void initState() {
    super.initState();
    _controllerFuture = AppController.create();
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
    StoresScreen(),
    DishesScreen(),
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
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Store'),
          NavigationDestination(icon: Icon(Icons.ramen_dining_outlined), selectedIcon: Icon(Icons.ramen_dining), label: 'Dish'),
          NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag), label: 'Cart'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
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
