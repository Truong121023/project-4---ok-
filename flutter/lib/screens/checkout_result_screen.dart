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
        const SnackBar(content: Text('The payment URL is invalid.')),
      );
      return;
    }
    final launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open ${result.paymentCheckoutUrl}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPaymentPayload = result.paymentQrCode.isNotEmpty ||
        result.paymentCheckoutUrl.isNotEmpty ||
        result.paymentExpiresAt != null;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout result')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _CheckoutResultHeroCard(result: result),
          if (hasPaymentPayload) ...[
            const SizedBox(height: 18),
            PaymentQrSection(
              qrCode: result.paymentQrCode,
              checkoutUrl: result.paymentCheckoutUrl,
              expiresAt: result.paymentExpiresAt,
              title: 'PayOS QR',
              subtitle: 'Scan the code to complete payment for the order you just created.',
              onOpenCheckoutUrl: result.paymentCheckoutUrl.isEmpty
                  ? null
                  : () => _openPaymentUrl(context),
            ),
          ],
          const SizedBox(height: 18),
          _CheckoutResultShippingCard(result: result),
          const SizedBox(height: 18),
          _CheckoutResultDeliveryCard(result: result),
          const SizedBox(height: 20),
          const SectionHeader(
            title: 'Created orders',
            subtitle:
                'Each store becomes its own order so it is easier to track.',
          ),
          const SizedBox(height: 12),
          ...result.orders.map(
            (order) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _CheckoutCreatedOrderCard(order: order),
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckoutResultHeroCard extends StatelessWidget {
  const _CheckoutResultHeroCard({required this.result});

  final CheckoutResult result;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF17332A), Color(0xFF345547)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MetricChip(
              label: result.statusSummary,
              icon: Icons.receipt_long_outlined,
              backgroundColor: Colors.white.withValues(alpha: 0.14),
              foregroundColor: Colors.white,
              maxWidth: 320,
            ),
            const SizedBox(height: 18),
            Text(
              'Total payment',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.white.withValues(alpha: 0.82),
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              Formatters.currency(result.totalAmount),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            if (result.promotionCode.isNotEmpty) ...[
              const SizedBox(height: 18),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.12),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.local_offer_outlined,
                        color: Colors.white,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          result.promotionCode,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                  ),
                        ),
                      ),
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

class _CheckoutResultShippingCard extends StatelessWidget {
  const _CheckoutResultShippingCard({required this.result});

  final CheckoutResult result;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: SectionHeader(
                    title: 'Shipping fee',
                    subtitle:
                        'Shown separately from payment so it is easier to review.',
                  ),
                ),
                if (result.hasShippingSummary)
                  const MetricChip(
                    label: 'Final',
                    icon: Icons.verified_outlined,
                    backgroundColor: Color(0xFFE7F1E3),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (!result.hasShippingSummary)
              const SoftInfoBanner(
                message:
                    'Shipping fee will be finalized after address coordinates are available.',
                icon: Icons.location_searching_outlined,
              )
            else ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      'Shipping fee',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      Formatters.currency(result.shippingFeeAmount),
                      textAlign: TextAlign.end,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                ],
              ),
              if (result.shippingDistanceKm != null) ...[
                const SizedBox(height: 10),
                SummaryLine(
                  label: 'Shipping distance',
                  value: Formatters.distance(result.shippingDistanceKm),
                ),
              ],
              if (result.shippingFeeBreakdown.isNotEmpty) ...[
                const SizedBox(height: 16),
                ShippingBreakdownList(items: result.shippingFeeBreakdown),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _CheckoutResultDeliveryCard extends StatelessWidget {
  const _CheckoutResultDeliveryCard({required this.result});

  final CheckoutResult result;

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
              subtitle: 'Recipient and delivery method for this checkout.',
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
                      result.deliveryFullName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(result.deliveryPhoneNumber),
                    const SizedBox(height: 8),
                    Text(result.deliveryAddress),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(label: result.paymentStatus),
                MetricChip(label: deliveryTypeLabel(result.deliveryType)),
                if (result.scheduledDeliveryAt != null)
                  MetricChip(
                    label: Formatters.fullDateTime(result.scheduledDeliveryAt),
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

class _CheckoutCreatedOrderCard extends StatelessWidget {
  const _CheckoutCreatedOrderCard({required this.order});

  final OrderSummary order;

  @override
  Widget build(BuildContext context) {
    final promo = (order.promotionCode ?? '').trim();
    return Card(
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
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
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
                  maxWidth: 124,
                ),
              ],
            ),
            const SizedBox(height: 16),
            SummaryLine(
              label: 'Total',
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
    );
  }
}
