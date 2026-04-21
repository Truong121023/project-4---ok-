import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/app.dart';
import '../app/app_controller.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/order_processing_timeline.dart';
import '../widgets/payment_widgets.dart';
import 'cart_screen.dart';
import 'feedbacks_screen.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({
    super.key,
    required this.orderId,
  });

  final int orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Future<OrderDetail>? _future;
  bool _paymentRefreshing = false;
  bool _orderActionBusy = false;
  AppController? _controller;
  int _lastRealtimeTick = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (!identical(_controller, controller)) {
      _controller?.removeListener(_handleControllerChanged);
      _controller = controller;
      _lastRealtimeTick = controller.userOrderRealtimeTick;
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
    if (_lastRealtimeTick == controller.userOrderRealtimeTick) {
      return;
    }
    _lastRealtimeTick = controller.userOrderRealtimeTick;
    unawaited(_refresh());
  }

  Future<OrderDetail> _load() {
    return AppScope.of(context).loadOrderDetail(widget.orderId);
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() {
      _future = future;
    });
    await future;
  }

  Future<void> _openExternalUrl(String? url) async {
    final resolvedUrl = AppScope.of(context).config.resolveExternalUrl(url);
    if (resolvedUrl == null || resolvedUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The server did not return a link to open yet.')),
      );
      return;
    }
    final uri = Uri.tryParse(resolvedUrl);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The URL is invalid.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open $resolvedUrl')),
      );
    }
  }

  Future<void> _refreshPayment() async {
    if (_paymentRefreshing) {
      return;
    }
    final controller = AppScope.of(context);
    setState(() {
      _paymentRefreshing = true;
    });
    try {
      final order = await controller.refreshOrderPayment(widget.orderId);
      setState(() {
        _future = Future<OrderDetail>.value(order);
      });
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_paymentCheckMessage(order))),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          _paymentRefreshing = false;
        });
      }
    }
  }

  Future<void> _cancelOrder() async {
    if (_orderActionBusy) {
      return;
    }
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Cancel unpaid order?'),
            content: const Text(
              'This will cancel the unpaid order and stop the current payment session.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Keep order'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Cancel order'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed) {
      return;
    }
    if (!mounted) {
      return;
    }
    final controller = _controller ?? AppScope.of(context);
    setState(() {
      _orderActionBusy = true;
    });
    try {
      final order = await controller.cancelOrder(widget.orderId);
      setState(() {
        _future = Future<OrderDetail>.value(order);
      });
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        const SnackBar(content: Text('The unpaid order has been cancelled.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          _orderActionBusy = false;
        });
      }
    }
  }

  Future<void> _reorder(OrderDetail order) async {
    if (_orderActionBusy) {
      return;
    }
    final controller = AppScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final hasExistingCartItems = controller.cart.items.isNotEmpty;
    if (hasExistingCartItems) {
      final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Replace current cart?'),
              content: const Text(
                'Reorder will replace the current cart so it matches this order.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Keep cart'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Replace cart'),
                ),
              ],
            ),
          ) ??
          false;
      if (!confirmed) {
        return;
      }
    }

    setState(() {
      _orderActionBusy = true;
    });
    try {
      await controller.reorderOrder(order.id);
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(content: Text('The cart now matches Order #${order.id}.')),
      );
      await navigator.push(
        MaterialPageRoute<void>(
          builder: (_) => const CartScreen(),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          _orderActionBusy = false;
        });
      }
    }
  }

  String _paymentCheckMessage(OrderDetail order) {
    final paymentStatus = order.paymentStatus.trim().toUpperCase();
    if (paymentStatus == 'PAID') {
      return 'The server confirmed your transfer successfully.';
    }
    if (paymentStatus == 'CANCELLED' || paymentStatus == 'FAILED') {
      return 'The transfer has not been confirmed for this payment session.';
    }
    return 'The server is still checking your transfer.';
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<OrderDetail>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: AppBar(title: const Text('Order details')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return Scaffold(
            appBar: AppBar(title: const Text('Order details')),
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: ErrorStateCard(
                message: snapshot.error.toString(),
                onRetry: _refresh,
              ),
            ),
          );
        }

        final controller = AppScope.of(context);
        final order = snapshot.data!;
        final isCancelledOrder =
            order.status.toUpperCase() == 'CANCELLED' ||
            order.paymentStatus.toUpperCase() == 'CANCELLED';
        final hasPaymentPayload = !isCancelledOrder &&
            (order.paymentQrCode.isNotEmpty ||
                order.paymentCheckoutUrl.isNotEmpty ||
                order.paymentExpiresAt != null);
        final hasBottomActions = order.canRefreshPayment ||
            order.canViewInvoice ||
            order.canCancelOrder ||
            order.canReorderOrder;

        return Scaffold(
          appBar: AppBar(title: const Text('Order details')),
          bottomNavigationBar: hasBottomActions
              ? _OrderDetailActionBar(
                  canRefreshPayment: order.canRefreshPayment,
                  paymentRefreshing: _paymentRefreshing,
                  canViewInvoice: order.canViewInvoice,
                  canCancelOrder: order.canCancelOrder,
                  canReorderOrder: order.canReorderOrder,
                  actionBusy: _orderActionBusy,
                  onRefreshPayment: _refreshPayment,
                  onCancelOrder: _cancelOrder,
                  onReorderOrder: () => _reorder(order),
                  onOpenInvoice: order.canViewInvoice
                      ? () => _openExternalUrl(
                            order.invoicePreviewUrl ??
                                order.invoiceDownloadUrl,
                          )
                      : null,
                )
              : null,
          body: RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                16,
                8,
                16,
                hasBottomActions ? 200 : 32,
              ),
              children: [
                _OrderDetailHeroCard(order: order),
                if ((order.cancellationNote?.trim().isNotEmpty ?? false)) ...[
                  const SizedBox(height: 18),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Cancellation note',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF9A3412),
                                ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            order.cancellationNote!,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  height: 1.45,
                                ),
                          ),
                          if (order.cancelledByUserName?.trim().isNotEmpty ?? false) ...[
                            const SizedBox(height: 10),
                            Text(
                              order.cancelledAt != null
                                  ? 'Cancelled by ${order.cancelledByUserName} at ${Formatters.fullDateTime(order.cancelledAt!)}'
                                  : 'Cancelled by ${order.cancelledByUserName}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
                if (hasPaymentPayload) ...[
                  const SizedBox(height: 18),
                  PaymentQrSection(
                    qrCode: order.paymentQrCode,
                    checkoutUrl: order.paymentCheckoutUrl,
                    expiresAt: order.paymentExpiresAt,
                    title: 'QR PayOS',
                    subtitle: 'Scan the code to pay for this order quickly.',
                    onOpenCheckoutUrl: order.paymentCheckoutUrl.isEmpty
                        ? null
                        : () => _openExternalUrl(order.paymentCheckoutUrl),
                  ),
                ],
                const SizedBox(height: 18),
                _OrderDetailDeliveryCard(order: order),
                const SizedBox(height: 18),
                _OrderDetailShippingCard(order: order),
                const SizedBox(height: 20),
                const SectionHeader(
                  title: 'Items in this order',
                  subtitle: 'A compact list of items for quick review on mobile.',
                ),
                const SizedBox(height: 12),
                ...order.items.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _OrderItemCard(
                      item: item,
                      imageUrl: controller.config.resolveImageUrl(
                        item.imagePaths.isEmpty ? null : item.imagePaths.first,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                _OrderDetailMetaCard(order: order),
                if (order.status.toUpperCase() == 'COMPLETED' &&
                    order.paymentStatus.toUpperCase() == 'PAID') ...[
                  const SizedBox(height: 20),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SectionHeader(
                            title: 'Order feedback',
                            subtitle:
                                'Feedback is available after a paid order has been completed.',
                          ),
                          const SizedBox(height: 14),
                          if (order.feedbackSubmitted) ...[
                            MetricChip(
                              label: order.feedbackUpdatedAt != null
                                  ? 'Updated ${Formatters.shortDate(order.feedbackUpdatedAt)}'
                                  : 'Feedback sent',
                            ),
                            const SizedBox(height: 12),
                            Text(order.feedbackMessage ?? 'Feedback content is not available.'),
                            if ((order.feedbackReplyMessage ?? '').trim().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Card(
                                color: const Color(0xFFF4F7F1),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Text(order.feedbackReplyMessage!),
                                ),
                              ),
                            ],
                            const SizedBox(height: 14),
                            FilledButton.tonal(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => const FeedbacksScreen(),
                                  ),
                                );
                              },
                              child: const Text('Open feedback history'),
                            ),
                          ] else ...[
                            const Text('This order is ready for feedback.'),
                            const SizedBox(height: 14),
                            FilledButton.tonal(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => FeedbackComposerScreen(
                                      initialOrderId: order.id,
                                    ),
                                  ),
                                );
                              },
                              child: const Text('Leave feedback'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
                if (order.deliveryProofImagePath != null) ...[
                  const SizedBox(height: 20),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SectionHeader(
                            title: 'Delivery proof image',
                            subtitle:
                                'The delivery proof image has been saved on the system.',
                          ),
                          const SizedBox(height: 14),
                          NetworkOrFallbackImage(
                            imageUrl: controller.config
                                .resolveImageUrl(order.deliveryProofImagePath),
                            height: 220,
                            borderRadius: BorderRadius.circular(24),
                            label: 'Delivery proof',
                          ),
                          if (order.deliveryProofNote != null) ...[
                            const SizedBox(height: 12),
                            Text(order.deliveryProofNote!),
                          ],
                          if (order.deliveryProofUploadedAt != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Saved at ${Formatters.fullDateTime(order.deliveryProofUploadedAt!)}',
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                OrderProcessingTimeline(
                  confirmedByUserName: order.confirmedByUserName,
                  confirmedByUserRole: order.confirmedByUserRole,
                  confirmedAt: order.confirmedAt,
                  preparingStaffName: order.preparingStaffName,
                  deliveringShipperName: order.deliveringShipperName,
                  deliveryStatus: order.status,
                  deliveryProofCapturedAt: order.deliveryProofCapturedAt,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _OrderDetailHeroCard extends StatelessWidget {
  const _OrderDetailHeroCard({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(label: order.status),
                if (order.promotionCode.isNotEmpty)
                  MetricChip(
                    label: order.promotionCode,
                    icon: Icons.local_offer_outlined,
                    maxWidth: 180,
                  ),
                if (order.creditPointsAwarded > 0)
                  MetricChip(
                    label: '+${order.creditPointsAwarded} points',
                    backgroundColor: const Color(0xFFE7F1E3),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              order.storeName,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              '#${order.id} - ${order.statusSummary}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 18),
            DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xFFF8F3E9),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE7DCCD)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    SummaryLine(
                      label: 'Total payment',
                      value: Formatters.currency(order.totalAmount),
                      emphasize: true,
                    ),
                    const SizedBox(height: 10),
                    SummaryLine(
                      label: 'Payment status',
                      value: order.paymentStatus,
                    ),
                    const SizedBox(height: 10),
                    SummaryLine(
                      label: 'Shipping fee',
                      value: order.hasShippingSummary
                          ? Formatters.currency(order.shippingFeeAmount)
                          : 'Updating',
                    ),
                  ],
                ),
              ),
            ),
            if ((order.storePhoneNumber?.trim().isNotEmpty ?? false) ||
                (order.storeAddress?.trim().isNotEmpty ?? false)) ...[
              const SizedBox(height: 14),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFE7DCCD)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Store information',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      if (order.storePhoneNumber?.trim().isNotEmpty ?? false) ...[
                        const SizedBox(height: 10),
                        SummaryLine(
                          label: 'Phone',
                          value: order.storePhoneNumber!,
                          compact: true,
                        ),
                      ],
                      if (order.storeAddress?.trim().isNotEmpty ?? false) ...[
                        const SizedBox(height: 10),
                        SummaryLine(
                          label: 'Address',
                          value: order.storeAddress!,
                          compact: true,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _OrderDetailDeliveryCard extends StatelessWidget {
  const _OrderDetailDeliveryCard({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Delivery details',
              subtitle: 'Recipient, address, and delivery type are grouped together here.',
            ),
            const SizedBox(height: 14),
            DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xFFF8F3E9),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFE8DECE)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.deliveryFullName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(order.deliveryPhoneNumber),
                    const SizedBox(height: 8),
                    Text(order.deliveryAddress),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(label: deliveryTypeLabel(order.deliveryType)),
                if (order.scheduledDeliveryAt != null)
                  MetricChip(
                    label: Formatters.fullDateTime(order.scheduledDeliveryAt),
                    icon: Icons.schedule_outlined,
                    maxWidth: 220,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderDetailShippingCard extends StatelessWidget {
  const _OrderDetailShippingCard({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Shipping fee',
              subtitle:
                  'Fee, distance, and per-store breakdown are grouped here.',
            ),
            const SizedBox(height: 14),
            if (!order.hasShippingSummary)
              const SoftInfoBanner(
                message:
                    'Shipping fee will be finalized after address coordinates are available.',
                icon: Icons.location_searching_outlined,
              )
            else ...[
              SummaryLine(
                label: 'Shipping fee',
                value: Formatters.currency(order.shippingFeeAmount),
                emphasize: true,
              ),
              if (order.shippingDistanceKm != null) ...[
                const SizedBox(height: 10),
                SummaryLine(
                  label: 'Shipping distance',
                  value: Formatters.distance(order.shippingDistanceKm),
                ),
              ],
              if (order.shippingFeeBreakdown.isNotEmpty) ...[
                const SizedBox(height: 16),
                ShippingBreakdownList(items: order.shippingFeeBreakdown),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _OrderItemCard extends StatelessWidget {
  const _OrderItemCard({
    required this.item,
    required this.imageUrl,
  });

  final OrderLineItem item;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 60,
              child: NetworkOrFallbackImage(
                imageUrl: imageUrl,
                height: 60,
                borderRadius: BorderRadius.circular(18),
                label: item.dishName,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.dishName,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'x${item.quantity} - ${Formatters.currency(item.unitPrice)}',
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
            Text(
              Formatters.currency(item.totalPrice),
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderDetailMetaCard extends StatelessWidget {
  const _OrderDetailMetaCard({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Order summary',
              subtitle:
                  'Only the important order and payment details are shown here.',
            ),
            const SizedBox(height: 14),
            SummaryLine(
              label: 'Items subtotal',
              value: Formatters.currency(order.subtotalAmount),
            ),
            if (order.discountAmount > 0) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Discount',
                value: Formatters.currency(order.discountAmount),
              ),
            ],
            if (order.promotionCode.isNotEmpty) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Promotion code',
                value: order.promotionCode,
              ),
            ],
            if (order.creditPointsAwarded > 0) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Credit earned',
                value: '+${order.creditPointsAwarded}',
                valueColor: const Color(0xFF5E7B62),
              ),
            ],
            if (order.invoiceNumber != null) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Invoice',
                value: order.invoiceNumber!,
              ),
            ],
            if (order.paidAt != null) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Paid at',
                value: Formatters.fullDateTime(order.paidAt!),
              ),
            ],
            if (order.paymentExpiresAt != null &&
                order.paymentStatus.trim().toUpperCase() != 'PAID') ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Payment expires',
                value: Formatters.fullDateTime(order.paymentExpiresAt!),
              ),
            ],
            const SizedBox(height: 10),
            SummaryLine(
              label: 'Created at',
              value: Formatters.fullDateTime(order.createdAt),
            ),
            const SizedBox(height: 10),
            SummaryLine(
              label: 'Updated at',
              value: Formatters.fullDateTime(order.updatedAt),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderDetailActionBar extends StatelessWidget {
  const _OrderDetailActionBar({
    required this.canRefreshPayment,
    required this.paymentRefreshing,
    required this.canViewInvoice,
    required this.canCancelOrder,
    required this.canReorderOrder,
    required this.actionBusy,
    required this.onRefreshPayment,
    required this.onCancelOrder,
    required this.onReorderOrder,
    required this.onOpenInvoice,
  });

  final bool canRefreshPayment;
  final bool paymentRefreshing;
  final bool canViewInvoice;
  final bool canCancelOrder;
  final bool canReorderOrder;
  final bool actionBusy;
  final VoidCallback onRefreshPayment;
  final VoidCallback onCancelOrder;
  final VoidCallback onReorderOrder;
  final VoidCallback? onOpenInvoice;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xFFFFFCF7),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFE8DDCC)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x16000000),
                blurRadius: 26,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                if (canViewInvoice)
                  OutlinedButton.icon(
                    onPressed: onOpenInvoice,
                    icon: const Icon(Icons.receipt_long_outlined),
                    label: const Text('Open invoice'),
                  ),
                if (canRefreshPayment)
                  FilledButton.icon(
                    onPressed:
                        paymentRefreshing || actionBusy ? null : onRefreshPayment,
                    icon: paymentRefreshing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.verified_outlined),
                    label: Text(
                      paymentRefreshing
                          ? 'Checking transfer...'
                          : 'I have transferred',
                    ),
                  ),
                if (canCancelOrder)
                  OutlinedButton.icon(
                    onPressed: actionBusy || paymentRefreshing
                        ? null
                        : onCancelOrder,
                    icon: const Icon(Icons.close_rounded),
                    label: const Text('Cancel order'),
                  ),
                if (canReorderOrder)
                  FilledButton.tonalIcon(
                    onPressed: actionBusy || paymentRefreshing
                        ? null
                        : onReorderOrder,
                    icon: const Icon(Icons.refresh_rounded),
                    label: Text(actionBusy ? 'Working...' : 'Reorder'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
