import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../core/utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import 'employee_order_cards.dart';
import 'employee_order_detail_screen.dart';
import 'employee_support.dart';

class EmployeeCompletedOrdersScreen extends StatefulWidget {
  const EmployeeCompletedOrdersScreen({
    super.key,
    required this.kind,
  });

  final EmployeeRoleKind kind;

  @override
  State<EmployeeCompletedOrdersScreen> createState() => _EmployeeCompletedOrdersScreenState();
}

class _EmployeeCompletedOrdersScreenState extends State<EmployeeCompletedOrdersScreen> {
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
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => EmployeeOrderDetailScreen(
          kind: widget.kind,
          initialOrder: order,
        ),
      ),
    );
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final currentUserProofs = controller.currentUserOrderProofRecords
        .where((record) => record.role == employeeRoleLabel(widget.kind))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(employeeCompletedQueueLabel(widget.kind)),
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

          final backendCompleted = employeeCompletedOrders(widget.kind, snapshot.data!.items);
          final proofsByOrderId = <int, OrderProofRecord>{
            for (final proof in currentUserProofs) proof.orderId: proof,
          };
          final mergedOrders = <JsonMap>[
            ...backendCompleted,
            ...currentUserProofs
                .where((proof) => backendCompleted.every((order) => asInt(order['id']) != proof.orderId))
                .map((proof) => proof.orderSnapshot),
          ];
          mergedOrders.sort((left, right) {
            final leftProof = proofsByOrderId[asInt(left['id'])];
            final rightProof = proofsByOrderId[asInt(right['id'])];
            final leftTime = leftProof?.completedAt ?? asDateTime(left['updatedAt']) ?? DateTime.fromMillisecondsSinceEpoch(0);
            final rightTime =
                rightProof?.completedAt ?? asDateTime(right['updatedAt']) ?? DateTime.fromMillisecondsSinceEpoch(0);
            return rightTime.compareTo(leftTime);
          });

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
                          'Lich su da hoan thanh',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.kind == EmployeeRoleKind.shipper
                              ? 'Don sau khi chot giao xong se nhay vao day, kem anh proof da chup tren may.'
                              : 'Don sau khi ban giao xong se duoc luu vao day de doi chieu nhanh.',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (mergedOrders.isEmpty)
                  const EmptyStateCard(
                    title: 'Chua co don hoan thanh',
                    message: 'Sau khi xu ly xong don, lich su se tu dong chuyen vao day.',
                  )
                else
                  ...mergedOrders.map((order) {
                    final proof = proofsByOrderId[asInt(order['id'])];
                    final completedAt = proof?.completedAt ?? asDateTime(order['updatedAt']);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeCompletedCard(
                        kind: widget.kind,
                        order: order,
                        completedAtLabel: completedAt == null ? 'Moi xong' : Formatters.fullDateTime(completedAt),
                        photoPath: proof?.photoPath,
                        onTap: () => _openDetail(order),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}
