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
    final shipperSummary = employeeAssignedShipperSummary(order);
    final customerName = asString(order['deliveryFullName']).trim();
    final phone = asString(order['deliveryPhoneNumber']).trim();
    final address = asString(order['deliveryAddress']).trim();
    final totalAmount = asDouble(order['totalAmount']);
    final shippingFee = asDouble(order['shippingFeeAmount']);

    if (kind == EmployeeRoleKind.shipper) {
      return Card(
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
                            asString(order['storeName'], 'Kamatcha'),
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Order #${asInt(order['id'])}',
                            style:
                                Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                      fontWeight: FontWeight.w700,
                                    ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    MetricChip(
                      label: asString(order['status'], 'ORDER'),
                      backgroundColor: const Color(0xFFE7F1E3),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F3E9),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFE8DECE)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (customerName.isNotEmpty)
                          Text(
                            customerName,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        if (phone.isNotEmpty) ...[
                          if (customerName.isNotEmpty) const SizedBox(height: 6),
                          Text(phone),
                        ],
                        if (address.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            address,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style:
                                Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      height: 1.35,
                                    ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (totalAmount > 0)
                      MetricChip(label: Formatters.currency(totalAmount)),
                    if (shippingFee > 0)
                      MetricChip(
                        label: 'Ship ${Formatters.currency(shippingFee)}',
                      ),
                    if (asString(order['paymentStatus']).isNotEmpty)
                      MetricChip(label: asString(order['paymentStatus'])),
                    if (actionLabel != null)
                      MetricChip(
                        label: actionLabel,
                        backgroundColor: const Color(0xFFFFEED8),
                        foregroundColor: const Color(0xFF9A6B1F),
                      ),
                  ],
                ),
                if (shipperSummary != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    shipperSummary,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

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
    final shipperSummary = employeeAssignedShipperSummary(order);
    final customerName = asString(order['deliveryFullName']).trim();
    final address = asString(order['deliveryAddress']).trim();
    final totalAmount = asDouble(order['totalAmount']);

    if (kind == EmployeeRoleKind.shipper) {
      return Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(28),
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
                      width: 92,
                      height: 92,
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
                        asString(order['storeName'], 'Kamatcha'),
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Order #${asInt(order['id'])}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 8),
                      if (customerName.isNotEmpty)
                        Text(
                          customerName,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      if (address.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          address,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          MetricChip(label: employeeCompletedQueueLabel(kind)),
                          MetricChip(label: completedAtLabel, maxWidth: 170),
                          if (totalAmount > 0)
                            MetricChip(label: Formatters.currency(totalAmount)),
                          if (hasPhoto)
                            const MetricChip(
                              label: 'Proof photo',
                              backgroundColor: Color(0xFFE7F1E3),
                            ),
                        ],
                      ),
                      if (shipperSummary != null) ...[
                        const SizedBox(height: 10),
                        Text(
                          shipperSummary,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

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
                    if (shipperSummary != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        shipperSummary,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFF4A5A53),
                            ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MetricChip(label: employeeCompletedQueueLabel(kind)),
                        MetricChip(label: completedAtLabel),
                        if (hasPhoto) const MetricChip(label: 'Proof photo'),
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
