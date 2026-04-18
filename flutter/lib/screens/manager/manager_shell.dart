import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../ai_chat_screen.dart';
import '../backoffice_notifications_screen.dart';
import '../admin/admin_resource_list_screen.dart';
import '../admin/admin_support.dart';
import 'manager_account_screen.dart';
import 'manager_overview_screen.dart';

class ManagerShell extends StatefulWidget {
  const ManagerShell({super.key});

  @override
  State<ManagerShell> createState() => _ManagerShellState();
}

class _ManagerShellState extends State<ManagerShell> {
  int _index = 0;
  final Set<int> _activatedIndexes = {0};

  Widget _buildPage(BuildContext context, int index) {
    final storeId = AppScope.of(context).session?.user.workingStoreId ?? 0;
    switch (index) {
      case 0:
        return const ManagerOverviewScreen();
      case 1:
        return AdminResourceListScreen(
          module: moduleById('orders'),
          initialQuery: {'storeId': storeId > 0 ? '$storeId' : null},
        );
      case 2:
        return AdminResourceListScreen(
          module: moduleById('users'),
          initialQuery: {'workingStoreId': storeId > 0 ? '$storeId' : null},
        );
      case 3:
        return const BackofficeNotificationsScreen();
      case 4:
        return const ManagerAccountScreen();
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    final storeId = AppScope.of(context).session?.user.workingStoreId ?? 0;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(
          index: _index,
          children: List<Widget>.generate(5, (index) {
            if (!_activatedIndexes.contains(index)) {
              return const SizedBox.shrink();
            }
            return KeyedSubtree(
              key: ValueKey('manager-shell-$storeId-$index'),
              child: _buildPage(context, index),
            );
          }),
        ),
      ),
      floatingActionButton: const AiChatFab(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.store_mall_directory_outlined),
            selectedIcon: Icon(Icons.store_mall_directory),
            label: 'Today',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.group_outlined),
            selectedIcon: Icon(Icons.group),
            label: 'Staff',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz_outlined),
            selectedIcon: Icon(Icons.more_horiz),
            label: 'More',
          ),
        ],
        onDestinationSelected: (index) => setState(() {
          _index = index;
          _activatedIndexes.add(index);
        }),
      ),
    );
  }
}
