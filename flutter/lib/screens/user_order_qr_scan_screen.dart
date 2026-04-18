import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/services/api_service.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';
import 'order_qr_navigation.dart';
import 'order_qr_scanner_screen.dart';

class UserOrderQrScanScreen extends StatelessWidget {
  const UserOrderQrScanScreen({super.key});

  Future<void> _resolveToken(BuildContext context, String token) async {
    final controller = AppScope.of(context);
    var currentToken = token;

    if (!controller.isLoggedIn) {
      await controller.savePendingOrderQrToken(token);
      if (!context.mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => const LoginScreen(),
        ),
      );
      if (!context.mounted || !controller.isLoggedIn) {
        return;
      }
      currentToken = controller.pendingOrderQrToken ?? token;
    }

    try {
      final response = await controller.resolveOrderQr(currentToken);
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response.message)),
      );
      await Navigator.of(context).push(
        buildOrderQrRoute(controller, response),
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
      title: 'Scan order QR',
      subtitle: 'Scan the code on the invoice to view order details and open the right screen for the current signed-in role.',
      header: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Look up an order by QR',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                controller.isLoggedIn
                    ? 'You are signed in, so the app will open the order status screen right after scanning.'
                    : 'If you are not signed in yet, the app will continue right after login.',
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(label: controller.isLoggedIn ? 'Signed in' : 'Sign in required'),
                  MetricChip(label: controller.currentRole),
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
