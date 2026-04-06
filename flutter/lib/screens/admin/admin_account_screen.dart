import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';
import '../backoffice_notifications_screen.dart';
import '../backoffice_support_chat_screen.dart';

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
                        MetricChip(label: controller.config.useMockData ? 'Che do demo' : 'Ket noi live'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'May chu',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(controller.config.normalizedBaseUrl),
                    const SizedBox(height: 18),
                    FutureBuilder<int>(
                      future: controller.loadAdminNotificationUnreadCount(),
                      builder: (context, snapshot) {
                        final unread = snapshot.data ?? 0;
                        return ActionMenuCard(
                          icon: Icons.notifications_active_outlined,
                          title: 'Backoffice notifications',
                          subtitle: 'Doc thong bao he thong va mo nhanh cac don can kiem tra.',
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
                      title: 'Support inbox',
                      subtitle:
                          'Theo doi cac phien chat ho tro tren toan he thong va tra loi ngay tren mobile.',
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
            const SizedBox(height: 16),
            const EmptyStateCard(
              title: 'Huong phat trien tiep',
              message:
                  'Khung admin da tach rieng theo role. Hien da co CRUD, AI draft, support inbox va quan ly noi dung chinh ngay tren mobile.',
            ),
          ],
        ],
      ),
    );
  }
}
