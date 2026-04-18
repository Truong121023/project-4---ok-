import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/order_processing_timeline.dart';
import '../widgets/payment_widgets.dart';

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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
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
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The server did not return a link to open yet.')),
      );
      return;
    }
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The URL is invalid.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open $url')),
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
        SnackBar(
          content: Text(
            order.statusSummary.isEmpty
                ? 'Payment refreshed'
                : order.statusSummary,
          ),
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
          _paymentRefreshing = false;
        });
      }
    }
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

<<<<<<< HEAD
        final controller = AppScope.of(context);
        final order = snapshot.data!;
        final hasPaymentPayload = order.paymentQrCode.isNotEmpty ||
            order.paymentCheckoutUrl.isNotEmpty ||
            order.paymentExpiresAt != null;
        final hasBottomActions = order.canRefreshPayment || order.canViewInvoice;

        return Scaffold(
          appBar: AppBar(title: const Text('Order details')),
          bottomNavigationBar: hasBottomActions
              ? _OrderDetailActionBar(
                  canRefreshPayment: order.canRefreshPayment,
                  paymentRefreshing: _paymentRefreshing,
                  canViewInvoice: order.canViewInvoice,
                  onRefreshPayment: _refreshPayment,
                  onOpenInvoice: order.canViewInvoice
                      ? () => _openExternalUrl(
                            order.invoicePreviewUrl ??
                                order.invoiceDownloadUrl,
                          )
                      : null,
                )
              : null,
          body: RefreshIndicator(
=======
          final order = snapshot.data!;
          final hasPaymentPayload = order.paymentQrCode.isNotEmpty ||
              order.paymentCheckoutUrl.isNotEmpty ||
              order.paymentExpiresAt != null;
          return RefreshIndicator(
>>>>>>> origin/main
            onRefresh: _refresh,
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                16,
                8,
                16,
                hasBottomActions ? 200 : 32,
              ),
              children: [
<<<<<<< HEAD
                _OrderDetailHeroCard(order: order),
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
=======
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '#${order.id} - ${order.storeName}',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        Text(order.statusSummary),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            MetricChip(label: order.status),
                            MetricChip(label: order.paymentStatus),
                            MetricChip(label: Formatters.currency(order.totalAmount)),
                            if (order.promotionCode.isNotEmpty) MetricChip(label: order.promotionCode),
                            if (order.hasShippingSummary)
                              MetricChip(label: 'Ship ${Formatters.currency(order.shippingFeeAmount)}'),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (order.canRefreshPayment)
                              FilledButton.icon(
                                onPressed: _paymentRefreshing ? null : _refreshPayment,
                                icon: _paymentRefreshing
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : const Icon(Icons.refresh),
                                label: Text(_paymentRefreshing ? 'Dang refresh...' : 'Refresh payment'),
                              ),
                            if (order.canViewInvoice)
                              OutlinedButton.icon(
                                onPressed: () => _openExternalUrl(
                                  order.invoicePreviewUrl ?? order.invoiceDownloadUrl,
                                ),
                                icon: const Icon(Icons.receipt_long_outlined),
                                label: const Text('Mo hoa don'),
                              ),
                          ],
                        ),
                      ],
>>>>>>> origin/main
                    ),
                  ),
                ),
                if (hasPaymentPayload) ...[
                  const SizedBox(height: 20),
                  PaymentQrSection(
                    qrCode: order.paymentQrCode,
                    checkoutUrl: order.paymentCheckoutUrl,
                    expiresAt: order.paymentExpiresAt,
                    subtitle: 'Uu tien quet QR PayOS. Neu QR khong tien, ban co the mo trang thanh toan tu nut ben duoi.',
                    onOpenCheckoutUrl: order.paymentCheckoutUrl.isEmpty
                        ? null
                        : () => _openExternalUrl(order.paymentCheckoutUrl),
                  ),
                ],
                const SizedBox(height: 20),
<<<<<<< HEAD
                _OrderDetailMetaCard(order: order),
=======
                OrderProcessingTimeline(
                  confirmedByUserName: order.confirmedByUserName,
                  confirmedByUserRole: order.confirmedByUserRole,
                  confirmedAt: order.confirmedAt,
                  preparingStaffName: order.preparingStaffName,
                  deliveringShipperName: order.deliveringShipperName,
                  deliveryStatus: order.status,
                  deliveryProofCapturedAt: order.deliveryProofCapturedAt,
                ),
>>>>>>> origin/main
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
<<<<<<< HEAD
                OrderProcessingTimeline(
                  confirmedByUserName: order.confirmedByUserName,
                  confirmedByUserRole: order.confirmedByUserRole,
                  confirmedAt: order.confirmedAt,
                  preparingStaffName: order.preparingStaffName,
                  deliveringShipperName: order.deliveringShipperName,
                  deliveryStatus: order.status,
                  deliveryProofCapturedAt: order.deliveryProofCapturedAt,
=======
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(order.deliveryFullName, style: const TextStyle(fontWeight: FontWeight.w800)),
                        const SizedBox(height: 8),
                        Text(order.deliveryPhoneNumber),
                        const SizedBox(height: 6),
                        Text(order.deliveryAddress),
                        const SizedBox(height: 10),
                        Text('Kieu giao: ${deliveryTypeLabel(order.deliveryType)}'),
                        if (order.scheduledDeliveryAt != null) ...[
                          const SizedBox(height: 6),
                          Text('Hen giao: ${Formatters.fullDateTime(order.scheduledDeliveryAt)}'),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const SectionHeader(
                  title: 'Mon trong don',
                  subtitle: 'Mo lai nhanh cac mon da mua trong order nay.',
                ),
                const SizedBox(height: 12),
                ...order.items.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: SizedBox(
                          width: 56,
                          child: NetworkOrFallbackImage(
                            imageUrl: controller.config.resolveImageUrl(
                              item.imagePaths.isEmpty ? null : item.imagePaths.first,
                            ),
                            height: 56,
                            borderRadius: BorderRadius.circular(16),
                            label: item.dishName,
                          ),
                        ),
                        title: Text(
                          item.dishName,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        subtitle: Text('x${item.quantity} - ${Formatters.currency(item.unitPrice)}'),
                        trailing: Text(
                          Formatters.currency(item.totalPrice),
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const SectionHeader(
                  title: 'Thanh toan va xu ly',
                  subtitle: 'Trang thai thanh toan, hoa don va nguoi dang xu ly don.',
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Tam tinh: ${Formatters.currency(order.subtotalAmount)}'),
                        const SizedBox(height: 6),
                        Text('Giam gia: ${Formatters.currency(order.discountAmount)}'),
                        const SizedBox(height: 6),
                        Text('Shipping fee: ${Formatters.currency(order.shippingFeeAmount)}'),
                        if (order.shippingDistanceKm != null) ...[
                          const SizedBox(height: 6),
                          Text('Shipping distance: ${Formatters.distance(order.shippingDistanceKm)}'),
                        ],
                        if (order.shippingFeeBreakdown.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Shipping breakdown: ${order.shippingFeeBreakdown.map((item) => '${item.storeName}: ${Formatters.currency(item.shippingFeeAmount)}${item.distanceKm == null ? '' : ' (${Formatters.distance(item.distanceKm)})'}').join(' | ')}',
                          ),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          'Promotion: ${order.promotionCode.isEmpty ? 'Khong ap dung' : order.promotionCode}',
                        ),
                        if (order.promotionScope.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text('Promotion scope: ${order.promotionScope}'),
                        ],
                        if (order.promotionEligibleAmount > 0) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Promotion eligible amount: ${Formatters.currency(order.promotionEligibleAmount)}',
                          ),
                        ],
                        if (order.promotionDishIds.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text('Promotion dish IDs: ${order.promotionDishIds.join(', ')}'),
                        ],
                        const SizedBox(height: 6),
                        Text('Provider: ${order.paymentProvider.isEmpty ? 'Dang cap nhat' : order.paymentProvider}'),
                        const SizedBox(height: 6),
                        Text('Reference: ${order.paymentReference.isEmpty ? 'Dang cap nhat' : order.paymentReference}'),
                        const SizedBox(height: 6),
                        Text('Tao luc: ${Formatters.fullDateTime(order.createdAt)}'),
                        const SizedBox(height: 6),
                        Text('Cap nhat luc: ${Formatters.fullDateTime(order.updatedAt)}'),
                        if (order.paymentExpiresAt != null) ...[
                          const SizedBox(height: 6),
                          Text('Payment expires: ${Formatters.fullDateTime(order.paymentExpiresAt)}'),
                        ],
                        if (order.invoiceNumber != null) ...[
                          const SizedBox(height: 6),
                          Text('Invoice: ${order.invoiceNumber}'),
                        ],
                        if (order.confirmedByUserName != null) ...[
                          const SizedBox(height: 6),
                          Text('Xac nhan cua hang: ${order.confirmedByUserName}'),
                        ],
                        if (order.preparingStaffName != null) ...[
                          const SizedBox(height: 6),
                          Text('Staff xu ly: ${order.preparingStaffName}'),
                        ],
                        if (order.deliveringShipperName != null) ...[
                          const SizedBox(height: 6),
                          Text('Shipper giao: ${order.deliveringShipperName}'),
                        ],
                      ],
                    ),
                  ),
>>>>>>> origin/main
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
                  'Payment and fulfillment details are shown below for quick review.',
            ),
            const SizedBox(height: 14),
            SummaryLine(
              label: 'Items subtotal',
              value: Formatters.currency(order.subtotalAmount),
            ),
            const SizedBox(height: 10),
            SummaryLine(
              label: 'Discount',
              value: Formatters.currency(order.discountAmount),
            ),
            const SizedBox(height: 10),
            SummaryLine(
              label: 'Promotion',
              value: order.promotionCode.isEmpty
                  ? 'Not applied'
                  : order.promotionCode,
            ),
            if (order.creditPointsAwarded > 0) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Credit earned',
                value: '+${order.creditPointsAwarded}',
                valueColor: const Color(0xFF5E7B62),
              ),
            ],
            if (order.promotionEligibleAmount > 0) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Eligible amount',
                value: Formatters.currency(order.promotionEligibleAmount),
              ),
            ],
            if (order.paymentProvider.isNotEmpty) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Provider',
                value: order.paymentProvider,
              ),
            ],
            if (order.paymentReference.isNotEmpty) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Reference',
                value: order.paymentReference,
              ),
            ],
            if (order.invoiceNumber != null) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Invoice',
                value: order.invoiceNumber!,
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
            if (order.preparingStaffName != null) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Store handler',
                value: order.preparingStaffName!,
              ),
            ],
            if (order.deliveringShipperName != null) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Assigned shipper',
                value: order.deliveringShipperName!,
              ),
            ],
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
    required this.onRefreshPayment,
    required this.onOpenInvoice,
  });

  final bool canRefreshPayment;
  final bool paymentRefreshing;
  final bool canViewInvoice;
  final VoidCallback onRefreshPayment;
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
            child: Row(
              children: [
                if (canViewInvoice)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onOpenInvoice,
                      icon: const Icon(Icons.receipt_long_outlined),
                      label: const Text('Open invoice'),
                    ),
                  ),
                if (canViewInvoice && canRefreshPayment)
                  const SizedBox(width: 12),
                if (canRefreshPayment)
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: paymentRefreshing ? null : onRefreshPayment,
                      icon: paymentRefreshing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.refresh),
                      label: Text(
                        paymentRefreshing
                            ? 'Refreshing...'
                            : 'Refresh payment',
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
