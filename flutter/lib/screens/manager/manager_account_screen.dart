import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';

class ManagerAccountScreen extends StatelessWidget {
  const ManagerAccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final session = controller.session;

    return Scaffold(
      appBar: AppBar(title: const Text('Manager account')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          if (session == null)
            const EmptyStateCard(
              title: 'Chua co session',
              message: 'Dang nhap lai de vao manager panel.',
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
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MetricChip(label: session.user.role),
                        if (session.user.workingStoreName != null) MetricChip(label: session.user.workingStoreName!),
                        MetricChip(label: session.user.verified ? 'Verified' : 'Cho verify'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    if (session.user.workingStoreAddress != null) ...[
                      Text(
                        'Store scope',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text(session.user.workingStoreAddress!),
                      const SizedBox(height: 18),
                    ],
                    const EmptyStateCard(
                      title: 'Rule hien tai',
                      message:
                          'Theo FRONTEND_ROLE_API_NOTE.md, manager khong duoc mo dashboard tong, promotions, user levels, hay tao/xoa store branch. UI nay giu dung nhung tac vu trong pham vi store.',
                    ),
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
          ],
        ],
      ),
    );
  }
}
