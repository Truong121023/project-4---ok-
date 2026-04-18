import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';
import '../backoffice_notifications_screen.dart';
import '../backoffice_support_chat_screen.dart';
import 'admin_modules_screen.dart';

class AdminAccountScreen extends StatefulWidget {
  const AdminAccountScreen({super.key});

  @override
  State<AdminAccountScreen> createState() => _AdminAccountScreenState();
}

class _AdminAccountScreenState extends State<AdminAccountScreen> {
  Future<int>? _unreadFuture;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _unreadFuture ??= AppScope.of(context).loadAdminNotificationUnreadCount();
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final session = controller.session;

    return Scaffold(
      appBar: AppBar(title: const Text('Admin more')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          if (session == null)
            const EmptyStateCard(
              title: 'Chua co session',
              message: 'Sign in again to open the admin app.',
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
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(session.user.email),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MetricChip(label: session.user.role),
                        MetricChip(
                            label: session.user.verified
                                ? 'Verified'
                                : 'Cho verify'),
                        MetricChip(
                            label: controller.config.useMockData
                                ? 'Che do demo'
                                : 'Live connection'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'May chu',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(controller.config.normalizedBaseUrl),
                    const SizedBox(height: 18),
                    ActionMenuCard(
                      icon: Icons.dashboard_customize_outlined,
                      title: 'All modules',
                      subtitle:
                          'Open the admin module list to jump straight to the area that needs attention.',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const AdminModulesScreen(),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    FutureBuilder<int>(
                      future: _unreadFuture,
                      builder: (context, snapshot) {
                        final unread = snapshot.data ?? 0;
                        return ActionMenuCard(
                          icon: Icons.notifications_active_outlined,
                          title: 'Backoffice notifications',
                          subtitle:
                              'Read system notifications and quickly open orders that need review.',
                          badgeLabel: unread == 0 ? null : '$unread',
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                  builder: (_) =>
                                      const BackofficeNotificationsScreen()),
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
                          'Track support chat sessions across the system and reply directly from mobile.',
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
                  'The admin area is now split by role. CRUD, AI draft, support inbox, and core content management are available directly on mobile.',
            ),
          ],
        ],
      ),
    );
  }
}

