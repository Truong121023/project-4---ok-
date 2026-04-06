import 'package:flutter/material.dart';

import '../ai_chat_screen.dart';
import 'employee_active_orders_screen.dart';
import 'employee_completed_orders_screen.dart';
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

  List<Widget> get _pages => [
        EmployeeScanScreen(kind: widget.kind),
        EmployeeActiveOrdersScreen(kind: widget.kind),
        EmployeeCompletedOrdersScreen(kind: widget.kind),
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
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner_outlined),
            selectedIcon: Icon(Icons.qr_code_scanner),
            label: 'Scan',
          ),
          NavigationDestination(
            icon: Icon(employeeRoleIcon(widget.kind)),
            selectedIcon: Icon(employeeRoleIcon(widget.kind)),
            label: employeePrimaryQueueLabel(widget.kind),
          ),
          NavigationDestination(
            icon: Icon(Icons.checklist_rtl_outlined),
            selectedIcon: Icon(Icons.checklist_rtl),
            label: employeeCompletedQueueLabel(widget.kind),
          ),
        ],
        onDestinationSelected: (index) => setState(() => _index = index),
      ),
    );
  }
}
