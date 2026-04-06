import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';
import '../backoffice_notifications_screen.dart';
import '../backoffice_support_chat_screen.dart';

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
                      title: 'Pham vi quan ly',
                      message:
                          'Tai khoan manager chi thao tac trong cua hang duoc phan cong, gom don hang, nhan su va phan hoi khach hang.',
                    ),
                    const SizedBox(height: 18),
                    FutureBuilder<int>(
                      future: controller.loadAdminNotificationUnreadCount(),
                      builder: (context, snapshot) {
                        final unread = snapshot.data ?? 0;
                        return ActionMenuCard(
                          icon: Icons.notifications_none,
                          title: 'Thong bao cua hang',
                          subtitle: 'Doc thong bao don moi va cac cap nhat can xu ly cho cua hang.',
                          badgeLabel: unread == 0 ? null : '$unread',
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(builder: (_) => const BackofficeNotificationsScreen()),
                            );
                          },
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    ActionMenuCard(
                      icon: Icons.support_agent_outlined,
                      title: 'Support cua hang',
                      subtitle:
                          'Mo inbox ho tro scope theo cua hang ban dang phu trach.',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const BackofficeSupportChatScreen(),
                          ),
                        );
                      },
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
