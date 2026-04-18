import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';
import '../backoffice_notifications_screen.dart';
import '../backoffice_support_chat_screen.dart';
import 'manager_operations_screen.dart';

class ManagerAccountScreen extends StatefulWidget {
  const ManagerAccountScreen({super.key});

  @override
  State<ManagerAccountScreen> createState() => _ManagerAccountScreenState();
}

class _ManagerAccountScreenState extends State<ManagerAccountScreen> {
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
      appBar: AppBar(title: const Text('Manager more')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          if (session == null)
            const EmptyStateCard(
              title: 'Chua co session',
              message: 'Sign in again to open the manager panel.',
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
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MetricChip(label: session.user.role),
                        if (session.user.workingStoreName != null)
                          MetricChip(label: session.user.workingStoreName!),
                        MetricChip(
                            label: session.user.verified
                                ? 'Verified'
                                : 'Cho verify'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    if (session.user.workingStoreAddress != null) ...[
                      Text(
                        'Store scope',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text(session.user.workingStoreAddress!),
                      const SizedBox(height: 18),
                    ],
                    const EmptyStateCard(
                      title: 'Pham vi quan ly',
                      message:
                          'A manager account only operates inside its assigned store, including orders, staff, and customer feedback.',
                    ),
                    const SizedBox(height: 18),
                    ActionMenuCard(
                      icon: Icons.dashboard_customize_outlined,
                      title: 'Cong cu manager',
                      subtitle:
                          'Open the store operations tools, moderation area, and current scope configuration.',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const ManagerOperationsScreen(),
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
                          icon: Icons.notifications_none,
                          title: 'Store notifications',
                          subtitle:
                              'Read new order notifications and other store updates that need action.',
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
                      title: 'Store support',
                      subtitle:
                          'Open the support inbox limited to the store you are responsible for.',
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

