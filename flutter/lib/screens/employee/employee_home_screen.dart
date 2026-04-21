import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'employee_support.dart';
import 'employee_widgets.dart';

class EmployeeHomeScreen extends StatefulWidget {
  const EmployeeHomeScreen({
    super.key,
    required this.kind,
  });

  final EmployeeRoleKind kind;

  @override
  State<EmployeeHomeScreen> createState() => _EmployeeHomeScreenState();
}

class _EmployeeHomeScreenState extends State<EmployeeHomeScreen> {
  Future<_EmployeeHomeBundle>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<_EmployeeHomeBundle> _load() async {
    final controller = AppScope.of(context);
    final values = await Future.wait<dynamic>([
      controller.loadEmployeeOrders(page: 0, size: 20),
      controller.loadEmployeeNotificationUnreadCount(),
    ]);
    return _EmployeeHomeBundle(
      orders: (values[0] as AdminListResult).items,
      unreadCount: values[1] as int,
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
    final controller = AppScope.of(context);
    final session = controller.session;
    final currentUserId = session?.user.id ?? 0;

    return Scaffold(
      appBar: AppBar(title: Text(employeePanelTitle(widget.kind))),
      body: FutureBuilder<_EmployeeHomeBundle>(
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

          final data = snapshot.data!;
          final pending = employeePendingOrders(widget.kind, data.orders);
          final active = employeeActiveOrders(widget.kind, data.orders, currentUserId);
          final completed = employeeCompletedOrders(widget.kind, data.orders);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Card(
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF17332A), Color(0xFF4B6B5A)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.all(Radius.circular(24)),
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            MetricChip(label: employeeRoleLabel(widget.kind)),
                            if (session?.user.workingStoreName != null)
                              MetricChip(label: session!.user.workingStoreName!),
                            MetricChip(label: '${data.unreadCount} new notifications'),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          employeePanelSubtitle(widget.kind),
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const SectionHeader(
                  title: 'Today at a glance',
                  subtitle: 'Open the app and see the next tasks for your shift right away.',
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _MiniMetricCard(label: employeePrimaryQueueLabel(widget.kind), value: '${pending.length}'),
                    _MiniMetricCard(label: employeeActiveQueueLabel(widget.kind), value: '${active.length}'),
                    _MiniMetricCard(label: employeeCompletedQueueLabel(widget.kind), value: '${completed.length}'),
                    _MiniMetricCard(label: 'New notifications', value: '${data.unreadCount}'),
                  ],
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: employeePrimaryQueueLabel(widget.kind),
                  subtitle: 'Large cards, clear actions, and quick task handling.',
                ),
                const SizedBox(height: 12),
                if (pending.isEmpty)
                  const EmptyStateCard(
                    title: 'No tasks available to claim',
                    message: 'This list updates automatically when new orders arrive.',
                  )
                else
                  ...pending.take(3).map(
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
                  subtitle: 'Orders you are actively handling right now.',
                ),
                const SizedBox(height: 12),
                if (active.isEmpty)
                  const EmptyStateCard(
                    title: 'No active orders',
                    message: 'Once you claim an order, its card moves into this section.',
                  )
                else
                  ...active.take(3).map(
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
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MiniMetricCard extends StatelessWidget {
  const _MiniMetricCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class _EmployeeHomeBundle {
  const _EmployeeHomeBundle({
    required this.orders,
    required this.unreadCount,
  });

  final List<JsonMap> orders;
  final int unreadCount;
}
