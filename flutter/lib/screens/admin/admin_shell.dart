import 'package:flutter/material.dart';

import '../ai_chat_screen.dart';
import 'admin_account_screen.dart';
import 'admin_dashboard_screen.dart';
import 'admin_resource_list_screen.dart';
import 'admin_support.dart';

class AdminShell extends StatefulWidget {
  const AdminShell({super.key});

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _index = 0;
  final Set<int> _activatedIndexes = {0};

  Widget _buildPage(int index) {
    switch (index) {
      case 0:
        return const AdminDashboardScreen();
      case 1:
        return AdminResourceListScreen(module: moduleById('orders'));
      case 2:
        return AdminResourceListScreen(module: moduleById('promotions'));
      case 3:
        return AdminResourceListScreen(module: moduleById('users'));
      case 4:
        return const AdminAccountScreen();
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
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
              key: ValueKey('admin-shell-$index'),
              child: _buildPage(index),
            );
          }),
        ),
      ),
      floatingActionButton: const AiChatFab(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            selectedIcon: Icon(Icons.space_dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_offer_outlined),
            selectedIcon: Icon(Icons.local_offer),
            label: 'Promos',
          ),
          NavigationDestination(
            icon: Icon(Icons.group_outlined),
            selectedIcon: Icon(Icons.group),
            label: 'Customers',
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
