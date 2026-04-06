import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/services/api_service.dart';
import '../widgets/app_widgets.dart';
import 'order_qr_navigation.dart';
import 'order_qr_scanner_screen.dart';

class RoleOrderQrScanScreen extends StatelessWidget {
  const RoleOrderQrScanScreen({
    super.key,
    required this.title,
    required this.headerTitle,
    required this.headerSubtitle,
    required this.roleLabel,
  });

  final String title;
  final String headerTitle;
  final String headerSubtitle;
  final String roleLabel;

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
      await Navigator.of(context).push<void>(buildOrderQrRoute(controller, response));
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
      title: title,
      subtitle: 'Quet QR tren hoa don de mo thong tin don hang theo role hien tai cua ban.',
      header: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                headerTitle,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(headerSubtitle),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(label: roleLabel),
                  if (controller.session?.user.workingStoreName != null)
                    MetricChip(label: controller.session!.user.workingStoreName!),
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
