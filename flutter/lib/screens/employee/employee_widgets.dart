import 'package:flutter/material.dart';

import '../../core/models/models.dart';
import '../../core/utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import 'employee_support.dart';

class EmployeeTaskCard extends StatelessWidget {
  const EmployeeTaskCard({
    super.key,
    required this.kind,
    required this.order,
    required this.currentUserId,
    this.onAction,
  });

  final EmployeeRoleKind kind;
  final JsonMap order;
  final int currentUserId;
  final Future<void> Function()? onAction;

  @override
  Widget build(BuildContext context) {
    final actionLabel = employeeActionLabel(kind, order, currentUserId);
    final totalAmount = order['totalAmount'];
    final status = asString(order['status']).trim();

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
                  child: Text(
                    '#${asInt(order['id'])} • ${asString(order['storeName'])}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
                MetricChip(label: status.isEmpty ? 'Order' : status),
              ],
            ),
            const SizedBox(height: 8),
            Text(employeeOrderSubtitle(order)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (totalAmount != null) MetricChip(label: Formatters.currency(asDouble(totalAmount))),
                if (asString(order['paymentStatus']).isNotEmpty) MetricChip(label: asString(order['paymentStatus'])),
                if (asString(order['deliveryPhoneNumber']).isNotEmpty)
                  MetricChip(label: asString(order['deliveryPhoneNumber'])),
              ],
            ),
            if (onAction != null && actionLabel != null) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async => onAction?.call(),
                  child: Text(actionLabel),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class EmployeeNotificationCard extends StatelessWidget {
  const EmployeeNotificationCard({
    super.key,
    required this.notification,
    required this.onToggleRead,
  });

  final JsonMap notification;
  final VoidCallback onToggleRead;

  @override
  Widget build(BuildContext context) {
    final read = asBool(notification['read']);
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Text(
          asString(notification['title'], 'Thong bao'),
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            asString(notification['message']).isEmpty
                ? 'Tap de doi trang thai da doc.'
                : asString(notification['message']),
          ),
        ),
        trailing: FilledButton.tonal(
          onPressed: onToggleRead,
          child: Text(read ? 'Unread' : 'Read'),
        ),
      ),
    );
  }
}

class EmployeeScheduleSummaryCard extends StatelessWidget {
  const EmployeeScheduleSummaryCard({
    super.key,
    required this.title,
    required this.schedule,
  });

  final String title;
  final JsonMap schedule;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Text(asString(schedule['storeName'])),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (asString(schedule['workDate']).isNotEmpty) MetricChip(label: asString(schedule['workDate'])),
                if (asString(schedule['scheduledStartTime']).isNotEmpty && asString(schedule['scheduledEndTime']).isNotEmpty)
                  MetricChip(
                    label: '${asString(schedule['scheduledStartTime'])} - ${asString(schedule['scheduledEndTime'])}',
                  ),
                if (asString(schedule['note']).isNotEmpty) MetricChip(label: asString(schedule['note'])),
                if (asString(schedule['scheduleNote']).isNotEmpty) MetricChip(label: asString(schedule['scheduleNote'])),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
