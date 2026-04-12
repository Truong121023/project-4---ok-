import 'package:flutter/material.dart';

import '../../app/app.dart';
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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
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
        title: Text(employeePrimaryQueueLabel(widget.kind)),
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
                child: Text('Dang xuat'),
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

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Don dang thao tac',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.kind == EmployeeRoleKind.staff
                              ? 'Don sau khi nhan thanh cong se vao day de tiep tuc lam mon.'
                              : 'Don sau khi nhan giao thanh cong se vao day de theo doi proof va chot giao hang.',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (activeOrders.isEmpty)
                  const EmptyStateCard(
                    title: 'Chua co don dang xu ly',
                    message: 'Nhan task tu thong bao hoac quet QR tren hoa don, sau do card se xuat hien o day.',
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
