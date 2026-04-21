import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
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
    if (controller.isLoggedIn && controller.orders.isEmpty) {
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
            title: const Text('Orders'),
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
                tooltip: 'Scan order QR',
              ),
            ],
          ),
          body: session == null
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: EmptyStateCard(
                    title: 'Browsing in guest mode',
                    message:
                        'Sign in to view your orders, track payments, and reopen orders from QR.',
                    actionLabel: 'Sign in',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const LoginScreen(),
                        ),
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
                              title: 'No orders yet',
                              message:
                                  'After checkout, each store is split into its own order so it is easier to track.',
                            ),
                          ],
                        ),
                      );
                    }

                    final pendingCount = controller.orders
                        .where((order) =>
                            order.paymentStatus.toUpperCase() != 'PAID')
                        .length;

                    return RefreshIndicator(
                      onRefresh: _refresh,
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
                        children: [
                          _UserOrdersSummaryCard(
                            orderCount: controller.orders.length,
                            pendingCount: pendingCount,
                            onOpenQr: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => const UserOrderQrScanScreen(),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 16),
                          ...controller.orders.map(
                            (order) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _UserOrderListCard(
                                order: order,
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) =>
                                          OrderDetailScreen(orderId: order.id),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        );
      },
    );
  }
}

class _UserOrdersSummaryCard extends StatelessWidget {
  const _UserOrdersSummaryCard({
    required this.orderCount,
    required this.pendingCount,
    required this.onOpenQr,
  });

  final int orderCount;
  final int pendingCount;
  final VoidCallback onOpenQr;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF17332A), Color(0xFF365B49)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(
                  label: '$orderCount orders',
                  icon: Icons.receipt_long_outlined,
                  backgroundColor: Colors.white.withValues(alpha: 0.14),
                  foregroundColor: Colors.white,
                ),
                MetricChip(
                  label: '$pendingCount to track',
                  icon: Icons.schedule_outlined,
                  backgroundColor: pendingCount == 0
                      ? Colors.white.withValues(alpha: 0.14)
                      : const Color(0xFFFFEED8),
                  foregroundColor: pendingCount == 0
                      ? Colors.white
                      : const Color(0xFF9A6B1F),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Track orders more easily',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Each store is shown on its own card so you can review totals, shipping, and payment more quickly.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 14),
            FilledButton.tonalIcon(
              onPressed: onOpenQr,
              icon: const Icon(Icons.qr_code_scanner_outlined),
              label: const Text('Scan order QR'),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserOrderListCard extends StatelessWidget {
  const _UserOrderListCard({
    required this.order,
    required this.onTap,
  });

  final OrderSummary order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final promo = (order.promotionCode ?? '').trim();
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.storeName,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '#${order.id} - ${order.statusSummary}',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  MetricChip(
                    label: order.paymentStatus,
                    maxWidth: 120,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F3E9),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFE8DECE)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      SummaryLine(
                        label: 'Total payment',
                        value: Formatters.currency(order.totalAmount),
                        emphasize: true,
                      ),
                      const SizedBox(height: 10),
                      SummaryLine(
                        label: 'Shipping fee',
                        value: order.hasShippingSummary
                            ? Formatters.currency(order.shippingFeeAmount)
                            : 'Updating',
                      ),
                      const SizedBox(height: 10),
                      SummaryLine(
                        label: 'Promo',
                        value: promo.isEmpty ? 'Not applied' : promo,
                      ),
                      if (order.creditPointsAwarded > 0) ...[
                        const SizedBox(height: 10),
                        SummaryLine(
                          label: 'Credit earned',
                          value: '+${order.creditPointsAwarded}',
                          valueColor: const Color(0xFF5E7B62),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(label: order.status),
                  if (order.status.toUpperCase() == 'COMPLETED' &&
                      order.paymentStatus.toUpperCase() == 'PAID')
                    MetricChip(
                      label:
                          order.feedbackSubmitted ? 'Feedback sent' : 'Feedback available',
                    ),
                  if (order.creditPointsAwarded > 0)
                    MetricChip(label: '+${order.creditPointsAwarded} credits'),
                  MetricChip(label: Formatters.shortDate(order.createdAt)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
