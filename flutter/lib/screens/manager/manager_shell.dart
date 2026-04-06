import 'package:flutter/material.dart';

import '../ai_chat_screen.dart';
import 'manager_account_screen.dart';
import 'manager_operations_screen.dart';
import 'manager_overview_screen.dart';
import '../role_order_qr_scan_screen.dart';

class ManagerShell extends StatefulWidget {
  const ManagerShell({super.key});

  @override
  State<ManagerShell> createState() => _ManagerShellState();
}

class _ManagerShellState extends State<ManagerShell> {
  int _index = 0;

  static const _pages = [
    ManagerOverviewScreen(),
    ManagerOperationsScreen(),
    RoleOrderQrScanScreen(
      title: 'Manager QR',
      headerTitle: 'Quet QR de kiem tra don',
      headerSubtitle: 'Manager chi nhanh co the quet de xem va xac nhan thong tin don cua dung store.',
      roleLabel: 'MANAGER',
    ),
    ManagerAccountScreen(),
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
          NavigationDestination(
            icon: Icon(Icons.store_mall_directory_outlined),
            selectedIcon: Icon(Icons.store_mall_directory),
            label: 'Today',
          ),
          NavigationDestination(
            icon: Icon(Icons.dashboard_customize_outlined),
            selectedIcon: Icon(Icons.dashboard_customize),
            label: 'Ops',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner_outlined),
            selectedIcon: Icon(Icons.qr_code_scanner),
            label: 'Scan',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
        onDestinationSelected: (index) => setState(() => _index = index),
      ),
    );
  }
}
