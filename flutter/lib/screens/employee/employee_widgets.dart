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
    final shipperSummary = employeeAssignedShipperSummary(order);
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
                    '#${asInt(order['id'])} - ${asString(order['storeName'])}',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
                MetricChip(label: status.isEmpty ? 'Order' : status),
              ],
            ),
            const SizedBox(height: 8),
            Text(employeeOrderSubtitle(order)),
            if (shipperSummary != null) ...[
              const SizedBox(height: 8),
              Text(
                shipperSummary,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF4A5A53),
                    ),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (totalAmount != null)
                  MetricChip(label: Formatters.currency(asDouble(totalAmount))),
                if (asString(order['paymentStatus']).isNotEmpty)
                  MetricChip(label: asString(order['paymentStatus'])),
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
    required this.kind,
    required this.notification,
    required this.onToggleRead,
    this.onTap,
  });

  final EmployeeRoleKind kind;
  final JsonMap notification;
  final VoidCallback onToggleRead;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final read = asBool(notification['read']);
    final orderId = employeeNotificationOrderId(notification);
    final createdAt = asDateTime(notification['createdAt']);
    final storeName = asString(notification['relatedStoreName']).trim();
    final title = asString(notification['title'], 'Notification');
    final message = asString(notification['message']).trim();

    if (kind == EmployeeRoleKind.shipper) {
      return Card(
        color: read ? null : const Color(0xFFF2F7EE),
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
                            title,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: read ? null : const Color(0xFF17332A),
                                ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            message.isEmpty
                                ? 'Open this task to review the delivery details.'
                                : message,
                            style:
                                Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      height: 1.35,
                                    ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: read
                            ? const Color(0xFFF1EBDD)
                            : const Color(0xFFE7F1E3),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        child: Text(
                          read ? 'Read' : 'New',
                          style:
                              Theme.of(context).textTheme.labelLarge?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF17332A),
                                  ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (orderId != null) MetricChip(label: 'Order #$orderId'),
                    if (storeName.isNotEmpty) MetricChip(label: storeName),
                    if (createdAt != null)
                      MetricChip(
                        label: Formatters.fullDateTime(createdAt),
                        maxWidth: 180,
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onToggleRead,
                        child: Text(read ? 'Mark unread' : 'Mark read'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: onTap,
                        child: const Text('Open order'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      color: read ? null : const Color(0xFFF4F7F1),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: read ? null : const Color(0xFF17332A),
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                message.isEmpty
                    ? 'Open this notification to review the related order.'
                    : message,
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (asString(notification['type']).isNotEmpty)
                    MetricChip(label: asString(notification['type'])),
                  if (orderId != null) MetricChip(label: 'Order #$orderId'),
                  if (storeName.isNotEmpty) MetricChip(label: storeName),
                  if (createdAt != null)
                    MetricChip(label: Formatters.fullDateTime(createdAt)),
                ],
              ),
            ],
          ),
        ),
        trailing: FilledButton.tonal(
          onPressed: onToggleRead,
          child: Text(read ? 'Unread' : 'Read'),
        ),
        isThreeLine: true,
        onTap: onTap,
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
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Text(asString(schedule['storeName'])),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (asString(schedule['workDate']).isNotEmpty)
                  MetricChip(label: asString(schedule['workDate'])),
                if (asString(schedule['scheduledStartTime']).isNotEmpty &&
                    asString(schedule['scheduledEndTime']).isNotEmpty)
                  MetricChip(
                    label:
                        '${asString(schedule['scheduledStartTime'])} - ${asString(schedule['scheduledEndTime'])}',
                  ),
                if (asString(schedule['note']).isNotEmpty)
                  MetricChip(label: asString(schedule['note'])),
                if (asString(schedule['scheduleNote']).isNotEmpty)
                  MetricChip(label: asString(schedule['scheduleNote'])),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
