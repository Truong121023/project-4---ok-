import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'employee_support.dart';
import 'employee_widgets.dart';

class EmployeeOrdersScreen extends StatefulWidget {
  const EmployeeOrdersScreen({
    super.key,
    required this.kind,
  });

  final EmployeeRoleKind kind;

  @override
  State<EmployeeOrdersScreen> createState() => _EmployeeOrdersScreenState();
}

class _EmployeeOrdersScreenState extends State<EmployeeOrdersScreen> {
  final _searchController = TextEditingController();
  Future<AdminListResult>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<AdminListResult> _load() {
    return AppScope.of(context).loadEmployeeOrders(
      search: _searchController.text.trim(),
      page: 0,
      size: 30,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  Future<void> _runAction(JsonMap order) async {
    final controller = AppScope.of(context);
    final currentUserId = controller.session?.user.id ?? 0;
    final action = employeeActionPath(widget.kind, order, currentUserId);
    if (action == null) {
      return;
    }
    try {
      final result = await controller.runEmployeeOrderAction(
        orderId: asInt(order['id']),
        action: action,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(asString(result['statusSummary'], 'Order updated.'))),
      );
      await _refresh();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = AppScope.of(context).session?.user.id ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Task orders')),
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

          final orders = snapshot.data!.items;
          final pending = employeePendingOrders(widget.kind, orders);
          final active = employeeActiveOrders(widget.kind, orders, currentUserId);
          final completed = employeeCompletedOrders(widget.kind, orders);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            onSubmitted: (_) => _refresh(),
                            decoration: const InputDecoration(
                              labelText: 'Search order code',
                              prefixIcon: Icon(Icons.search),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        FilledButton.tonal(
                          onPressed: _refresh,
                          child: const Text('Tai lai'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: employeePrimaryQueueLabel(widget.kind),
                  subtitle: 'Danh sach uu tien cao nhat.',
                ),
                const SizedBox(height: 12),
                if (pending.isEmpty)
                  const EmptyStateCard(
                    title: 'No orders waiting to be claimed',
                    message: 'When new orders arrive, the cards appear here so you can claim them quickly.',
                  )
                else
                  ...pending.map(
                    (order) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeTaskCard(
                        kind: widget.kind,
                        order: order,
                        currentUserId: currentUserId,
                        onAction: () => _runAction(order),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: employeeActiveQueueLabel(widget.kind),
                  subtitle: 'Orders currently assigned to you.',
                ),
                const SizedBox(height: 12),
                if (active.isEmpty)
                  const EmptyStateCard(
                    title: 'No active orders',
                    message: 'After you claim an order, it will appear here while you work on it.',
                  )
                else
                  ...active.map(
                    (order) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeTaskCard(
                        kind: widget.kind,
                        order: order,
                        currentUserId: currentUserId,
                        onAction: () => _runAction(order),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: employeeCompletedQueueLabel(widget.kind),
                  subtitle: 'For a quick view of recent status changes.',
                ),
                const SizedBox(height: 12),
                if (completed.isEmpty)
                  const EmptyStateCard(
                    title: 'No recent records yet',
                    message: 'Use this area for a quick cross-check after completing the task.',
                  )
                else
                  ...completed.take(8).map(
                    (order) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeTaskCard(
                        kind: widget.kind,
                        order: order,
                        currentUserId: currentUserId,
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

