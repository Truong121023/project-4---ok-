import 'package:flutter/material.dart';

import '../core/utils/formatters.dart';
import 'app_widgets.dart';

class OrderProcessingTimeline extends StatelessWidget {
  const OrderProcessingTimeline({
    super.key,
    this.title = 'Tien trinh xu ly',
    this.subtitle = 'Theo doi nguoi xac nhan, bep va shipper theo thu tu xu ly.',
    this.confirmedByUserName,
    this.confirmedByUserRole,
    this.confirmedAt,
    this.preparingStaffName,
    this.deliveringShipperName,
    this.deliveryProofCapturedAt,
  });

  final String title;
  final String subtitle;
  final String? confirmedByUserName;
  final String? confirmedByUserRole;
  final DateTime? confirmedAt;
  final String? preparingStaffName;
  final String? deliveringShipperName;
  final DateTime? deliveryProofCapturedAt;

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
                  title: 'Xac nhan cua hang',
                  subtitle: confirmedByUserName == null
                      ? 'Dang cho manager/admin xac nhan don.'
                      : _joinParts(
                          [
                            confirmedByUserRole == null || confirmedByUserRole!.trim().isEmpty
                                ? confirmedByUserName!
                                : '$confirmedByUserName ($confirmedByUserRole)',
                            confirmedAt == null ? null : Formatters.fullDateTime(confirmedAt),
                          ],
                        ),
                  done: confirmedByUserName != null,
                ),
                const SizedBox(height: 14),
                _TimelineRow(
                  icon: Icons.local_cafe_outlined,
                  title: 'Nhan vien bep',
                  subtitle: preparingStaffName == null
                      ? 'Dang cho staff nhan va xu ly don.'
                      : '$preparingStaffName dang phu trach phan bep.',
                  done: preparingStaffName != null,
                ),
                const SizedBox(height: 14),
                _TimelineRow(
                  icon: Icons.delivery_dining_outlined,
                  title: 'Shipper giao hang',
                  subtitle: deliveringShipperName == null
                      ? 'Dang cho shipper nhan don giao.'
                      : _joinParts(
                          [
                            '$deliveringShipperName dang giao hoac da giao don.',
                            deliveryProofCapturedAt == null
                                ? null
                                : 'Proof luc ${Formatters.fullDateTime(deliveryProofCapturedAt)}',
                          ],
                        ),
                  done: deliveringShipperName != null,
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
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.done,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool done;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            color: done ? const Color(0xFFE8F0E0) : const Color(0xFFF2F1EC),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Icon(
              done ? Icons.check_circle : icon,
              color: done ? const Color(0xFF17332A) : null,
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
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
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
