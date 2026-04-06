import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/order_processing_timeline.dart';

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
        const SnackBar(content: Text('Server chua tra URL de mo.')),
      );
      return;
    }
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL khong hop le.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Khong mo duoc $url')),
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
        SnackBar(content: Text(order.statusSummary.isEmpty ? 'Da refresh thanh toan' : order.statusSummary)),
      );
      if (order.paymentCheckoutUrl.isNotEmpty) {
        await _openExternalUrl(order.paymentCheckoutUrl);
      }
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
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiet don hang')),
      body: FutureBuilder<OrderDetail>(
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

          final order = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
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
                            if (order.paymentCheckoutUrl.isNotEmpty)
                              OutlinedButton.icon(
                                onPressed: () => _openExternalUrl(order.paymentCheckoutUrl),
                                icon: const Icon(Icons.open_in_browser_outlined),
                                label: const Text('Mo PayOS'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                OrderProcessingTimeline(
                  confirmedByUserName: order.confirmedByUserName,
                  confirmedByUserRole: order.confirmedByUserRole,
                  confirmedAt: order.confirmedAt,
                  preparingStaffName: order.preparingStaffName,
                  deliveringShipperName: order.deliveringShipperName,
                  deliveryProofCapturedAt: order.deliveryProofCapturedAt,
                ),
                if (order.deliveryProofImagePath != null) ...[
                  const SizedBox(height: 20),
                  const SectionHeader(
                    title: 'Anh giao hang',
                    subtitle: 'Anh xac nhan giao hang da duoc luu tren he thong.',
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          NetworkOrFallbackImage(
                            imageUrl: controller.config.resolveImageUrl(order.deliveryProofImagePath),
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
                            Text('Luu luc: ${Formatters.fullDateTime(order.deliveryProofUploadedAt!)}'),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                const SectionHeader(
                  title: 'Thong tin giao hang',
                  subtitle: 'Dia chi va cach giao da chot cho don nay.',
                ),
                const SizedBox(height: 12),
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
                        Text('Kieu giao: ${order.deliveryType}'),
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
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
