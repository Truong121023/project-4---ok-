import 'package:flutter/material.dart';

import '../core/utils/formatters.dart';
import 'app_widgets.dart';

class OrderProcessingTimeline extends StatelessWidget {
  const OrderProcessingTimeline({
    super.key,
    this.title = 'Order timeline',
    this.subtitle = 'Track confirmation, preparation, pickup, and delivery in order.',
    this.confirmedByUserName,
    this.confirmedByUserRole,
    this.confirmedAt,
    this.preparingStaffName,
    this.deliveringShipperName,
    this.deliveryStatus,
    this.deliveryProofCapturedAt,
  });

  final String title;
  final String subtitle;
  final String? confirmedByUserName;
  final String? confirmedByUserRole;
  final DateTime? confirmedAt;
  final String? preparingStaffName;
  final String? deliveringShipperName;
  final String? deliveryStatus;
  final DateTime? deliveryProofCapturedAt;

  String get _normalizedStatus => deliveryStatus?.trim().toUpperCase() ?? '';

  bool get _hasConfirmedIdentity =>
      (confirmedByUserName ?? '').trim().isNotEmpty;

  bool get _hasPreparingIdentity =>
      (preparingStaffName ?? '').trim().isNotEmpty;

  bool get _hasShipperIdentity =>
      (deliveringShipperName ?? '').trim().isNotEmpty;

  bool _storeConfirmed() {
    return _hasConfirmedIdentity ||
        confirmedAt != null ||
        const {
          'CONFIRMED',
          'PREPARING',
          'READY_FOR_SHIPPER',
          'OUT_FOR_DELIVERY',
          'COMPLETED',
        }.contains(_normalizedStatus);
  }

  bool _preparationStarted() {
    return _hasPreparingIdentity ||
        const {
          'PREPARING',
          'READY_FOR_SHIPPER',
          'OUT_FOR_DELIVERY',
          'COMPLETED',
        }.contains(_normalizedStatus);
  }

  bool _preparationDone() {
    return const {
      'READY_FOR_SHIPPER',
      'OUT_FOR_DELIVERY',
      'COMPLETED',
    }.contains(_normalizedStatus);
  }

  bool _deliveryStarted() {
    return _hasShipperIdentity ||
        const {
          'READY_FOR_SHIPPER',
          'OUT_FOR_DELIVERY',
          'COMPLETED',
        }.contains(_normalizedStatus);
  }

  _TimelineStageState _confirmationState() {
    return _storeConfirmed()
        ? _TimelineStageState.done
        : _TimelineStageState.inactive;
  }

  _TimelineStageState _preparationState() {
    if (_preparationDone()) {
      return _TimelineStageState.done;
    }
    if (_preparationStarted()) {
      return _TimelineStageState.current;
    }
    return _TimelineStageState.inactive;
  }

  _TimelineStageState _deliveryState() {
    if (_deliveryDone()) {
      return _TimelineStageState.done;
    }
    if (_deliveryStarted()) {
      return _TimelineStageState.current;
    }
    return _TimelineStageState.inactive;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: title,
          subtitle: subtitle,
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              children: [
                _TimelineRow(
                  icon: Icons.verified_user_outlined,
                  title: 'Store confirmation',
                  subtitle: _confirmationSubtitle(),
                  state: _confirmationState(),
                ),
                const SizedBox(height: 14),
                _TimelineRow(
                  icon: Icons.local_cafe_outlined,
                  title: 'Store preparation',
                  subtitle: _preparationSubtitle(),
                  state: _preparationState(),
                ),
                const SizedBox(height: 14),
                _TimelineRow(
                  icon: Icons.delivery_dining_outlined,
                  title: 'Delivery',
                  subtitle: _deliverySubtitle(),
                  state: _deliveryState(),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _joinParts(List<String?> values) {
    return values.whereType<String>().where((value) => value.trim().isNotEmpty).join(' | ');
  }

  String _confirmationSubtitle() {
    if (!_storeConfirmed()) {
      return 'Waiting for the store manager to confirm the order.';
    }

    if (_hasConfirmedIdentity || confirmedAt != null) {
      return _joinParts(
        [
          _hasConfirmedIdentity
              ? confirmedByUserRole == null || confirmedByUserRole!.trim().isEmpty
                  ? confirmedByUserName!
                  : '${confirmedByUserName!} (${confirmedByUserRole!})'
              : 'The store manager confirmed the order.',
          confirmedAt == null
              ? null
              : 'Confirmed at ${Formatters.fullDateTime(confirmedAt)}',
        ],
      );
    }

    return 'The store manager confirmed the order.';
  }

  String _preparationSubtitle() {
    final handlerName = preparingStaffName?.trim();

    if (_preparationDone()) {
      return handlerName == null || handlerName.isEmpty
          ? 'The store finished preparing the order and handed it to delivery.'
          : '$handlerName finished preparing the order for pickup.';
    }

    if (_preparationStarted()) {
      return handlerName == null || handlerName.isEmpty
          ? 'The store is preparing your order now.'
          : '$handlerName is preparing your order now.';
    }

    return 'Waiting for the store team to begin preparing the order.';
  }

  String _deliverySubtitle() {
    final shipperName = deliveringShipperName?.trim();
    final normalizedStatus = _normalizedStatus;

    if (!_deliveryStarted()) {
      return 'Waiting for the store to finish preparation and assign a shipper.';
    }

    final identity =
        shipperName == null || shipperName.isEmpty ? 'The assigned shipper' : shipperName;

    return switch (normalizedStatus) {
      'READY_FOR_SHIPPER' =>
        '$identity has been assigned and is waiting to accept the order for delivery.',
      'OUT_FOR_DELIVERY' => _joinParts(
          [
            '$identity is on the way with your order.',
            deliveryProofCapturedAt == null
                ? null
                : 'Proof captured at ${Formatters.fullDateTime(deliveryProofCapturedAt)}',
          ],
        ),
      'COMPLETED' => _joinParts(
          [
            '$identity delivered the order successfully.',
            deliveryProofCapturedAt == null
                ? null
                : 'Proof captured at ${Formatters.fullDateTime(deliveryProofCapturedAt)}',
          ],
        ),
      _ => _joinParts(
          [
            '$identity is currently assigned to this order.',
            deliveryProofCapturedAt == null
                ? null
                : 'Proof captured at ${Formatters.fullDateTime(deliveryProofCapturedAt)}',
          ],
        ),
    };
  }

  bool _deliveryDone() {
    final normalizedStatus = _normalizedStatus;
    return normalizedStatus == 'COMPLETED' ||
        deliveryProofCapturedAt != null;
  }
}

enum _TimelineStageState {
  inactive,
  current,
  done,
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.state,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final _TimelineStageState state;

  @override
  Widget build(BuildContext context) {
    final isDone = state == _TimelineStageState.done;
    final isCurrent = state == _TimelineStageState.current;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            color: isDone
                ? const Color(0xFFE8F0E0)
                : isCurrent
                    ? const Color(0xFFF5EEDB)
                    : const Color(0xFFF2F1EC),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Icon(
              isDone ? Icons.check_circle : icon,
              color: isDone
                  ? const Color(0xFF17332A)
                  : isCurrent
                      ? const Color(0xFF8A5A11)
                      : null,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: isCurrent ? const Color(0xFF6E4C18) : null,
                    ),
              ),
              const SizedBox(height: 4),
              Text(subtitle),
            ],
          ),
        ),
      ],
    );
  }
}
