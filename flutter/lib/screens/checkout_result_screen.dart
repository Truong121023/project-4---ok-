import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/payment_widgets.dart';

class CheckoutResultScreen extends StatelessWidget {
  const CheckoutResultScreen({
    super.key,
    required this.result,
  });

  final CheckoutResult result;

  Future<void> _openPaymentUrl(BuildContext context) async {
    if (result.paymentCheckoutUrl.isEmpty) {
      return;
    }
    final uri = Uri.tryParse(result.paymentCheckoutUrl);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL thanh toan khong hop le.')),
      );
      return;
    }
    final launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Khong mo duoc ${result.paymentCheckoutUrl}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPaymentPayload = result.paymentQrCode.isNotEmpty ||
        result.paymentCheckoutUrl.isNotEmpty ||
        result.paymentExpiresAt != null;
    return Scaffold(
      appBar: AppBar(title: const Text('Ket qua checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    result.statusSummary,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      MetricChip(label: result.paymentStatus),
                      MetricChip(label: result.paymentProvider.isEmpty ? 'N/A' : result.paymentProvider),
                      MetricChip(label: deliveryTypeLabel(result.deliveryType)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('Tam tinh: ${Formatters.currency(result.subtotalAmount)}'),
                  const SizedBox(height: 6),
                  Text('Giam gia: ${Formatters.currency(result.discountAmount)}'),
                  const SizedBox(height: 6),
                  Text('Shipping fee: ${Formatters.currency(result.shippingFeeAmount)}'),
                  if (result.shippingDistanceKm != null) ...[
                    const SizedBox(height: 6),
                    Text('Shipping distance: ${Formatters.distance(result.shippingDistanceKm)}'),
                  ],
                  const SizedBox(height: 6),
                  Text('Tong thanh toan: ${Formatters.currency(result.totalAmount)}'),
                  const SizedBox(height: 6),
                  Text(
                    'Promo: ${result.promotionCode.isEmpty ? 'Khong ap dung' : result.promotionCode}',
                  ),
                  if (result.scheduledDeliveryAt != null) ...[
                    const SizedBox(height: 6),
                    Text('Hen giao: ${Formatters.fullDateTime(result.scheduledDeliveryAt)}'),
                  ],
                  const SizedBox(height: 6),
                  Text('Nguoi nhan: ${result.deliveryFullName} - ${result.deliveryPhoneNumber}'),
                  const SizedBox(height: 6),
                  Text('Dia chi: ${result.deliveryAddress}'),
                  const SizedBox(height: 12),
                  Text(
                    'Provider: ${result.paymentProvider.isEmpty ? 'Dang cap nhat' : result.paymentProvider}',
                  ),
                  const SizedBox(height: 6),
                  SelectableText(
                    'Reference: ${result.paymentReference.isEmpty ? 'Dang cap nhat' : result.paymentReference}',
                  ),
                ],
              ),
            ),
          ),
          if (result.hasShippingSummary) ...[
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(
                      title: 'Shipping fee',
                      subtitle: 'So tien va quang duong duoi day la gia tri backend da chot cho checkout nay.',
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Shipping fee: ${Formatters.currency(result.shippingFeeAmount)}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    if (result.shippingDistanceKm != null) ...[
                      const SizedBox(height: 6),
                      Text('Shipping distance: ${Formatters.distance(result.shippingDistanceKm)}'),
                    ],
                    if (result.shippingFeeBreakdown.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ...result.shippingFeeBreakdown.map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Text(
                            '${item.storeName}: ${Formatters.distance(item.distanceKm)} - ${Formatters.currency(item.shippingFeeAmount)}',
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
          if (hasPaymentPayload) ...[
            const SizedBox(height: 20),
            PaymentQrSection(
              qrCode: result.paymentQrCode,
              checkoutUrl: result.paymentCheckoutUrl,
              expiresAt: result.paymentExpiresAt,
              subtitle: 'Uu tien quet QR PayOS. Neu can, ban van co the mo trang thanh toan tu nut ben duoi.',
              onOpenCheckoutUrl: result.paymentCheckoutUrl.isEmpty
                  ? null
                  : () => _openPaymentUrl(context),
            ),
          ],
          const SizedBox(height: 20),
          const SectionHeader(
            title: 'Don hang tao ra',
            subtitle: 'Lay tu truong orders trong CheckoutResponse.',
          ),
          const SizedBox(height: 12),
          ...result.orders.map(
            (order) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text(
                    '#${order.id} - ${order.storeName}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: Text(
                    '${order.statusSummary}\n${Formatters.currency(order.totalAmount)} - ${order.paymentStatus}'
                    '${order.promotionCode == null ? '' : '\nPromo: ${order.promotionCode}'}'
                    '${order.promotionEligibleAmount == null ? '' : '\nEligible amount: ${Formatters.currency(order.promotionEligibleAmount!)}'}'
                    '${order.hasShippingSummary ? '\nShipping: ${Formatters.currency(order.shippingFeeAmount)}${order.shippingDistanceKm == null ? '' : ' - ${Formatters.distance(order.shippingDistanceKm)}'}' : ''}',
                  ),
                  isThreeLine: true,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
