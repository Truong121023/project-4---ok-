import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';
import 'order_detail_screen.dart';
import 'user_order_qr_scan_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  Future<void>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= controller.refreshOrders();
    }
  }

  Future<void> _refresh() async {
    final future = AppScope.of(context).refreshOrders();
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final session = controller.session;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Don hang'),
            actions: [
              IconButton(
                onPressed: session == null
                    ? null
                    : () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const UserOrderQrScanScreen(),
                          ),
                        );
                      },
                icon: const Icon(Icons.qr_code_scanner),
                tooltip: 'Quet QR don hang',
              ),
            ],
          ),
          body: session == null
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: EmptyStateCard(
                    title: 'Dang duyet o guest mode',
                    message:
                        'Dang nhap de xem don cua ban, refresh payment va mo lai don bang QR.',
                    actionLabel: 'Dang nhap',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const LoginScreen()),
                      );
                    },
                  ),
                )
              : FutureBuilder<void>(
                  future: _future,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState != ConnectionState.done &&
                        controller.orders.isEmpty) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snapshot.hasError && controller.orders.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(16),
                        child: ErrorStateCard(
                          message: snapshot.error.toString(),
                          onRetry: _refresh,
                        ),
                      );
                    }
                    if (controller.orders.isEmpty) {
                      return RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: const [
                            EmptyStateCard(
                              title: 'Chua co don hang',
                              message:
                                  'Sau khi checkout xong, don theo tung store se xuat hien tai day.',
                            ),
                          ],
                        ),
                      );
                    }
                    return RefreshIndicator(
                      onRefresh: _refresh,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
                        itemCount: controller.orders.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final order = controller.orders[index];
                          final confirmationLine = order.confirmedAt == null
                              ? (order.confirmedByUserName == null
                                  ? null
                                  : 'Da xac nhan boi ${order.confirmedByUserName}')
                              : 'Da xac nhan luc ${Formatters.fullDateTime(order.confirmedAt!)}'
                                  '${order.confirmedByUserName == null ? '' : ' boi ${order.confirmedByUserName}'}';
                          final executorLines = <String>[
                            if (order.preparingStaffName != null)
                              'Staff xu ly: ${order.preparingStaffName}',
                            if (order.deliveringShipperName != null)
                              'Shipper giao: ${order.deliveringShipperName}',
                          ];
                          return Card(
                            child: InkWell(
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) =>
                                        OrderDetailScreen(orderId: order.id),
                                  ),
                                );
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '#${order.id} - ${order.storeName}',
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleMedium
                                                ?.copyWith(
                                                    fontWeight:
                                                        FontWeight.w800),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        MetricChip(label: order.paymentStatus),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(order.statusSummary),
                                    if (confirmationLine != null) ...[
                                      const SizedBox(height: 6),
                                      Text(confirmationLine),
                                    ],
                                    if (executorLines.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      ...executorLines.map(
                                        (line) => Padding(
                                          padding:
                                              const EdgeInsets.only(bottom: 4),
                                          child: Text(line),
                                        ),
                                      ),
                                    ],
                                    if (order.deliveryProofImagePath !=
                                        null) ...[
                                      const SizedBox(height: 12),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(18),
                                        child: NetworkOrFallbackImage(
                                          imageUrl: controller.config
                                              .resolveImageUrl(
                                                  order.deliveryProofImagePath),
                                          height: 132,
                                          borderRadius:
                                              BorderRadius.circular(18),
                                          label: 'Proof giao hang',
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        MetricChip(label: order.status),
                                        MetricChip(
                                            label: Formatters.currency(
                                                order.totalAmount)),
                                        MetricChip(
                                            label: Formatters.shortDate(
                                                order.createdAt)),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
        );
      },
    );
  }
}
