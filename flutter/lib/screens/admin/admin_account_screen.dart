import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';

class AdminAccountScreen extends StatelessWidget {
  const AdminAccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final session = controller.session;

    return Scaffold(
      appBar: AppBar(title: const Text('Admin account')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          if (session == null)
            const EmptyStateCard(
              title: 'Chua co session',
              message: 'Dang nhap lai de vao admin app.',
            )
          else ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.user.fullName,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(session.user.email),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MetricChip(label: session.user.role),
                        MetricChip(label: session.user.verified ? 'Verified' : 'Cho verify'),
                        MetricChip(label: controller.config.useMockData ? 'Mock mode' : 'Live API'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Backend',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(controller.config.normalizedBaseUrl),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => controller.logout(),
                        child: const Text('Dang xuat'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const EmptyStateCard(
              title: 'Huong phat trien tiep',
              message:
                  'Khung admin da tach rieng theo role. Buoc sau co the them form CRUD, upload image, cap nhat order status, reply feedback va scheduler editor ngay tren mobile.',
            ),
          ],
        ],
      ),
    );
  }
}
