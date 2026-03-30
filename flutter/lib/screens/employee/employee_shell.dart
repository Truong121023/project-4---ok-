import 'package:flutter/material.dart';

import 'employee_account_screen.dart';
import 'employee_home_screen.dart';
import 'employee_notifications_screen.dart';
import 'employee_orders_screen.dart';
import 'employee_schedule_screen.dart';
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
        EmployeeHomeScreen(kind: widget.kind),
        EmployeeOrdersScreen(kind: widget.kind),
        const EmployeeScheduleScreen(),
        const EmployeeNotificationsScreen(),
        const EmployeeAccountScreen(),
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
          NavigationDestination(
            icon: Icon(Icons.flash_on_outlined),
            selectedIcon: Icon(Icons.flash_on),
            label: 'Today',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Schedule',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Noti',
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
