import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import '../order_qr_scanner_screen.dart';
import 'employee_order_detail_screen.dart';
import 'employee_support.dart';

class EmployeeScanScreen extends StatelessWidget {
  const EmployeeScanScreen({
    super.key,
    required this.kind,
  });

  final EmployeeRoleKind kind;

  Future<void> _resolveToken(BuildContext context, String token) async {
    final controller = AppScope.of(context);
    try {
      final response = await controller.resolveOrderQr(token);
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response.message)),
      );
      await Navigator.of(context).push<bool>(
        MaterialPageRoute<bool>(
          builder: (_) => EmployeeOrderDetailScreen(
            kind: kind,
            initialOrder: response.order,
            bannerMessage: response.message,
          ),
        ),
      );
    } on ApiException catch (error) {
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return OrderQrScannerScreen(
      title: 'Camera QR',
      subtitle: kind == EmployeeRoleKind.staff
          ? 'Quet ma tren hoa don de nhan don vao bep va mo ngay thong tin can xu ly.'
          : 'Quet ma tren hoa don de nhan don giao va mo ngay thong tin giao hang.',
      requireManualCameraOpen: true,
      openCameraLabel: kind == EmployeeRoleKind.staff ? 'Mo camera bep' : 'Mo camera giao hang',
      cameraIntroTitle: kind == EmployeeRoleKind.staff ? 'San sang nhan don vao bep' : 'San sang nhan don giao',
      cameraIntroMessage: kind == EmployeeRoleKind.staff
          ? 'Camera chi bat khi ban bam mo camera. Sau do dua ma QR vao khung de nhan don cho bep.'
          : 'Camera chi bat khi ban bam mo camera. Sau do dua ma QR vao khung de nhan don giao hang.',
      header: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                employeePanelTitle(kind),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(employeePanelSubtitle(kind)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(label: employeeRoleLabel(kind)),
                  if (controller.session?.user.workingStoreName != null)
                    MetricChip(label: controller.session!.user.workingStoreName!),
                  const MetricChip(label: 'Quet va nhan don'),
                ],
              ),
            ],
          ),
        ),
      ),
      onTokenResolved: (token) => _resolveToken(context, token),
    );
  }
}
