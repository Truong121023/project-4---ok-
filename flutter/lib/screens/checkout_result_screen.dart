import 'package:flutter/material.dart';

import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';

class CheckoutResultScreen extends StatelessWidget {
  const CheckoutResultScreen({
    super.key,
    required this.result,
  });

  final CheckoutResult result;

  @override
  Widget build(BuildContext context) {
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
                      MetricChip(label: result.deliveryType),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('Tong thanh toan: ${Formatters.currency(result.totalAmount)}'),
                  const SizedBox(height: 6),
                  Text('Nguoi nhan: ${result.deliveryFullName} - ${result.deliveryPhoneNumber}'),
                  const SizedBox(height: 6),
                  Text('Dia chi: ${result.deliveryAddress}'),
                  if (result.paymentCheckoutUrl.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text('Link thanh toan'),
                    const SizedBox(height: 6),
                    SelectableText(result.paymentCheckoutUrl),
                  ],
                ],
              ),
            ),
          ),
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
                    '${order.statusSummary}\n${Formatters.currency(order.totalAmount)} - ${order.paymentStatus}',
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
