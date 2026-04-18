import 'package:flutter/material.dart';

import '../ai_chat_screen.dart';
import 'employee_active_orders_screen.dart';
import 'employee_completed_orders_screen.dart';
import 'employee_notifications_screen.dart';
import 'employee_scan_screen.dart';
import 'employee_support.dart';

class EmployeeShell extends StatefulWidget {
  const EmployeeShell({
    super.key,
    required this.kind,
  });

  final EmployeeRoleKind kind;

  @override
  State<EmployeeShell> createState() => _EmployeeShellState();
}

class _EmployeeShellState extends State<EmployeeShell> {
  int _index = 0;
  final Set<int> _activatedIndexes = {0};

  Widget _buildPage(int index) {
    switch (index) {
      case 0:
        return EmployeeScanScreen(kind: widget.kind);
      case 1:
        return EmployeeNotificationsScreen(kind: widget.kind);
      case 2:
        return EmployeeActiveOrdersScreen(kind: widget.kind);
      case 3:
        return EmployeeCompletedOrdersScreen(kind: widget.kind);
      default:
        return const SizedBox.shrink();
    }
  }

  List<NavigationDestination> get _destinations {
    if (widget.kind == EmployeeRoleKind.shipper) {
      return const [
        NavigationDestination(
          icon: Icon(Icons.qr_code_scanner_outlined),
          selectedIcon: Icon(Icons.qr_code_scanner),
          label: 'Scan',
        ),
        NavigationDestination(
          icon: Icon(Icons.local_shipping_outlined),
          selectedIcon: Icon(Icons.local_shipping),
          label: 'Inbox',
        ),
        NavigationDestination(
          icon: Icon(Icons.delivery_dining_outlined),
          selectedIcon: Icon(Icons.delivery_dining),
          label: 'Active',
        ),
        NavigationDestination(
          icon: Icon(Icons.history_outlined),
          selectedIcon: Icon(Icons.history),
          label: 'History',
        ),
      ];
    }

    return const [
      NavigationDestination(
        icon: Icon(Icons.qr_code_scanner_outlined),
        selectedIcon: Icon(Icons.qr_code_scanner),
        label: 'Scan',
      ),
      NavigationDestination(
        icon: Icon(Icons.notifications_active_outlined),
        selectedIcon: Icon(Icons.notifications_active),
        label: 'Inbox',
      ),
      NavigationDestination(
        icon: Icon(Icons.local_cafe_outlined),
        selectedIcon: Icon(Icons.local_cafe),
        label: 'Active',
      ),
      NavigationDestination(
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: 'Completed',
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(
          index: _index,
          children: List<Widget>.generate(4, (index) {
            if (!_activatedIndexes.contains(index)) {
              return const SizedBox.shrink();
            }
            return KeyedSubtree(
              key: ValueKey('employee-shell-${widget.kind}-$index'),
              child: _buildPage(index),
            );
          }),
        ),
      ),
      floatingActionButton:
          widget.kind == EmployeeRoleKind.shipper ? null : const AiChatFab(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: _destinations,
        onDestinationSelected: (index) => setState(() {
          _index = index;
          _activatedIndexes.add(index);
        }),
      ),
    );
  }
}
