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
      title: 'QR scanner',
      subtitle: kind == EmployeeRoleKind.staff
          ? 'Scan the invoice QR to open the assigned store task.'
          : 'Scan the invoice QR to confirm pickup and open the delivery task.',
      requireManualCameraOpen: true,
      openCameraLabel: kind == EmployeeRoleKind.staff ? 'Open store camera' : 'Open delivery camera',
      cameraIntroTitle: kind == EmployeeRoleKind.staff ? 'Ready to scan store tasks' : 'Ready to scan pickup QR',
      cameraIntroMessage: kind == EmployeeRoleKind.staff
          ? 'Turn on the camera when you are ready, then place the invoice QR inside the frame.'
          : 'Turn on the camera at the store, then place the invoice QR inside the frame to confirm pickup.',
      header: Card(
        clipBehavior: Clip.antiAlias,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: kind == EmployeeRoleKind.shipper
                  ? const [Color(0xFF17332A), Color(0xFF365B4A)]
                  : const [Color(0xFF17332A), Color(0xFF4A7253)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(
                    label: employeeRoleLabel(kind),
                    backgroundColor: Colors.white.withValues(alpha: 0.14),
                    foregroundColor: Colors.white,
                  ),
                  if (controller.session?.user.workingStoreName != null)
                    MetricChip(
                      label: controller.session!.user.workingStoreName!,
                      backgroundColor: Colors.white.withValues(alpha: 0.14),
                      foregroundColor: Colors.white,
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                employeePanelTitle(kind),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                employeePanelSubtitle(kind),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 14),
              MetricChip(
                label: kind == EmployeeRoleKind.shipper
                    ? 'Scan to confirm pickup'
                    : 'Scan to open task',
                backgroundColor: Colors.white.withValues(alpha: 0.14),
                foregroundColor: Colors.white,
                icon: kind == EmployeeRoleKind.shipper
                    ? Icons.local_shipping_outlined
                    : Icons.qr_code_scanner_outlined,
                maxWidth: 220,
              ),
            ],
          ),
        ),
      ),
      onTokenResolved: (token) => _resolveToken(context, token),
    );
  }
}
