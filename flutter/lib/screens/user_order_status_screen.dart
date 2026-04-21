import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/order_processing_timeline.dart';

class UserOrderStatusScreen extends StatelessWidget {
  const UserOrderStatusScreen({
    super.key,
    required this.response,
  });

  final MobileOrderQrResolveResponse response;

  Future<void> _openExternalUrl(BuildContext context, String? url) async {
    final resolvedUrl = AppScope.of(context).config.resolveExternalUrl(url);
    if (resolvedUrl == null || resolvedUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('There is no invoice to open yet.')),
      );
      return;
    }
    final uri = Uri.tryParse(resolvedUrl);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The invoice link is invalid.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open $resolvedUrl')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = response.order;
    final allowedActions = asStringList(order['allowedActions']);
    final totalAmount = asDouble(order['totalAmount']);
    final invoiceNumber = asString(order['invoiceNumber']);
    final canViewInvoice = asBool(order['invoiceAvailable']) || allowedActions.contains('VIEW_INVOICE');
    final invoiceUrl = asNullableString(order['invoicePreviewUrl']) ?? asNullableString(order['invoiceDownloadUrl']);

    return Scaffold(
      appBar: AppBar(title: const Text('Order details')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          Card(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF17332A), Color(0xFF4A7253)],
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
                      const MetricChip(label: 'USER QR'),
                      MetricChip(label: asString(order['status'], 'ORDER')),
                      if (asString(order['paymentStatus']).isNotEmpty)
                        MetricChip(label: asString(order['paymentStatus'])),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    response.message.isEmpty ? 'The order status view is ready.' : response.message,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    asString(order['statusSummary'], 'Track the order progress directly inside the app.'),
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.white.withValues(alpha: 0.92),
                        ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '#${asInt(order['id'])} - ${asString(order['storeName'], 'Kamatcha')}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  if (invoiceNumber.isNotEmpty) Text('Invoice: $invoiceNumber'),
                  if (asString(order['storePhoneNumber']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Store phone: ${asString(order['storePhoneNumber'])}'),
                  ],
                  if (asString(order['storeAddress']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Store address: ${asString(order['storeAddress'])}'),
                  ],
                  if (totalAmount > 0) ...[
                    const SizedBox(height: 8),
                    Text('Total amount: ${Formatters.currency(totalAmount)}'),
                  ],
                  if (asString(order['deliveryAddress']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Delivery address: ${asString(order['deliveryAddress'])}'),
                  ],
                  if (asString(order['deliveryPhoneNumber']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Phone: ${asString(order['deliveryPhoneNumber'])}'),
                  ],
                  if (asDateTime(order['createdAt']) != null) ...[
                    const SizedBox(height: 8),
                    Text('Created at: ${Formatters.fullDateTime(asDateTime(order['createdAt'])!)}'),
                  ],
                  if (asString(order['cancellationNote']).isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Cancellation note: ${asString(order['cancellationNote'])}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFF9A3412),
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          OrderProcessingTimeline(
            confirmedByUserName: asNullableString(order['confirmedByUserName']),
            confirmedByUserRole: asNullableString(order['confirmedByUserRole']),
            confirmedAt: asDateTime(order['confirmedAt']),
            preparingStaffName: asNullableString(order['preparingStaffName']),
            deliveringShipperName: asNullableString(order['deliveringShipperName']),
            deliveryStatus: asString(order['status']),
            deliveryProofCapturedAt: asDateTime(order['deliveryProofCapturedAt']),
          ),
          const SizedBox(height: 20),
          SectionHeader(
            title: 'Available actions',
            subtitle: 'The available buttons change based on the live order status.',
          ),
          const SizedBox(height: 12),
          if (allowedActions.isEmpty)
            const EmptyStateCard(
              title: 'No additional actions',
              message: 'You can keep tracking the order here and scan again if needed.',
            )
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: allowedActions.map((action) => MetricChip(label: action)).toList(),
                    ),
                    if (canViewInvoice) ...[
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: () => _openExternalUrl(context, invoiceUrl),
                        icon: const Icon(Icons.receipt_long_outlined),
                        label: const Text('Open invoice'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
