import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../app/app_controller.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'employee_order_cards.dart';
import 'employee_order_detail_screen.dart';
import 'employee_support.dart';

class EmployeeActiveOrdersScreen extends StatefulWidget {
  const EmployeeActiveOrdersScreen({
    super.key,
    required this.kind,
  });

  final EmployeeRoleKind kind;

  @override
  State<EmployeeActiveOrdersScreen> createState() => _EmployeeActiveOrdersScreenState();
}

class _EmployeeActiveOrdersScreenState extends State<EmployeeActiveOrdersScreen> {
  Future<AdminListResult>? _future;
  AppController? _controller;
  int _lastRealtimeTick = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (!identical(_controller, controller)) {
      _controller?.removeListener(_handleControllerChanged);
      _controller = controller;
      _lastRealtimeTick = controller.employeeOrderRealtimeTick;
      controller.addListener(_handleControllerChanged);
    }
    _future ??= _load();
  }

  @override
  void dispose() {
    _controller?.removeListener(_handleControllerChanged);
    super.dispose();
  }

  void _handleControllerChanged() {
    final controller = _controller;
    if (!mounted || controller == null) {
      return;
    }
    if (_lastRealtimeTick == controller.employeeOrderRealtimeTick) {
      return;
    }
    _lastRealtimeTick = controller.employeeOrderRealtimeTick;
    unawaited(_refresh());
  }

  Future<AdminListResult> _load() {
    return AppScope.of(context).loadEmployeeOrders(
      page: 0,
      size: 40,
      mine: true,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  Future<void> _openDetail(JsonMap order) async {
    final refreshed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EmployeeOrderDetailScreen(
          kind: widget.kind,
          initialOrder: order,
        ),
      ),
    );
    if (refreshed == true) {
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final currentUserId = controller.session?.user.id ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: Text(employeeActiveQueueLabel(widget.kind)),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') {
                controller.logout();
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem<String>(
                value: 'logout',
                child: Text('Sign out'),
              ),
            ],
          ),
        ],
      ),
      body: FutureBuilder<AdminListResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: ErrorStateCard(
                message: snapshot.error.toString(),
                onRetry: _refresh,
              ),
            );
          }

          final activeOrders = employeeActiveOrders(
            widget.kind,
            snapshot.data!.items,
            currentUserId,
          );
          final summaryTitle = widget.kind == EmployeeRoleKind.shipper
              ? 'Active deliveries'
              : 'Active tasks';
          final summaryMessage = widget.kind == EmployeeRoleKind.shipper
              ? 'Open each order to review the route, call the customer, and finish delivery with a proof photo.'
              : 'Accepted store tasks appear here so you can continue processing them.';

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          summaryTitle,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        Text(summaryMessage),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            MetricChip(
                              label: '${activeOrders.length} orders',
                              icon: widget.kind == EmployeeRoleKind.shipper
                                  ? Icons.delivery_dining_outlined
                                  : Icons.local_cafe_outlined,
                            ),
                            MetricChip(
                              label: widget.kind == EmployeeRoleKind.shipper
                                  ? 'Open Maps quickly'
                                  : 'Tap to open task',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (activeOrders.isEmpty)
                  const EmptyStateCard(
                    title: 'No active orders yet',
                    message: 'Orders move here after you accept them for delivery.',
                  )
                else
                  ...activeOrders.map(
                    (order) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeOrderFocusCard(
                        kind: widget.kind,
                        order: order,
                        currentUserId: currentUserId,
                        onTap: () => _openDetail(order),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
