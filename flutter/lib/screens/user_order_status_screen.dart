import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

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
    if (url == null || url.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chua co hoa don de mo.')),
      );
      return;
    }
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lien ket hoa don khong hop le.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Khong mo duoc $url')),
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
      appBar: AppBar(title: const Text('Thong tin don hang')),
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
                      MetricChip(label: asString(order['paymentStatus'], '')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    response.message.isEmpty ? 'Trang thai don hang da san sang.' : response.message,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    asString(order['statusSummary'], 'Theo doi tien do don hang ngay trong app.'),
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
                  if (invoiceNumber.isNotEmpty) Text('Hoa don: $invoiceNumber'),
                  if (totalAmount > 0) ...[
                    const SizedBox(height: 8),
                    Text('Tong tien: ${Formatters.currency(totalAmount)}'),
                  ],
                  if (asString(order['deliveryAddress']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Dia chi giao: ${asString(order['deliveryAddress'])}'),
                  ],
                  if (asString(order['deliveryPhoneNumber']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('So dien thoai: ${asString(order['deliveryPhoneNumber'])}'),
                  ],
                  if (asDateTime(order['createdAt']) != null) ...[
                    const SizedBox(height: 8),
                    Text('Tao luc: ${Formatters.fullDateTime(asDateTime(order['createdAt'])!)}'),
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
            title: 'Tuy chon hien co',
            subtitle: 'Nhung nut co san se doi theo trang thai thuc te cua don hang.',
          ),
          const SizedBox(height: 12),
          if (allowedActions.isEmpty)
            const EmptyStateCard(
              title: 'Khong co thao tac them',
              message: 'Ban co the theo doi trang thai don va quet lai neu can.',
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
                        label: const Text('Mo hoa don'),
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
