import 'dart:io';

import 'package:flutter/material.dart';

import '../../core/models/models.dart';
import '../../core/utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import 'employee_support.dart';

class EmployeeOrderFocusCard extends StatelessWidget {
  const EmployeeOrderFocusCard({
    super.key,
    required this.kind,
    required this.order,
    required this.currentUserId,
    this.onTap,
  });

  final EmployeeRoleKind kind;
  final JsonMap order;
  final int currentUserId;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final actionLabel = employeeActionLabel(kind, order, currentUserId);
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
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
                    child: Text(
                      '#${asInt(order['id'])} - ${asString(order['storeName'], 'Kamatcha')}',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  MetricChip(label: asString(order['status'], 'ORDER')),
                ],
              ),
              const SizedBox(height: 8),
              Text(employeeOrderSubtitle(order)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (asDouble(order['totalAmount']) > 0)
                    MetricChip(
                        label: Formatters.currency(
                            asDouble(order['totalAmount']))),
                  if (asString(order['paymentStatus']).isNotEmpty)
                    MetricChip(label: asString(order['paymentStatus'])),
                  if (actionLabel != null) MetricChip(label: actionLabel),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class EmployeeCompletedCard extends StatelessWidget {
  const EmployeeCompletedCard({
    super.key,
    required this.kind,
    required this.order,
    required this.completedAtLabel,
    this.photoPath,
    this.onTap,
  });

  final EmployeeRoleKind kind;
  final JsonMap order;
  final String completedAtLabel;
  final String? photoPath;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final photoFile = photoPath == null ? null : File(photoPath!);
    final hasPhoto = photoFile != null && photoFile.existsSync();

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (hasPhoto) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: SizedBox(
                    width: 88,
                    height: 88,
                    child: Image.file(
                      photoFile,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '#${asInt(order['id'])} - ${asString(order['storeName'], 'Kamatcha')}',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Text(asString(order['statusSummary'],
                        employeeCompletedQueueLabel(kind))),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MetricChip(label: employeeCompletedQueueLabel(kind)),
                        MetricChip(label: completedAtLabel),
                        if (hasPhoto) const MetricChip(label: 'Co anh proof'),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
