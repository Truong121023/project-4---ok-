import 'package:flutter/material.dart';

import '../app/app.dart';
import '../widgets/app_widgets.dart';

class MobileRoleRestrictedScreen extends StatelessWidget {
  const MobileRoleRestrictedScreen({
    super.key,
    this.showAppBar = false,
  });

  final bool showAppBar;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final session = controller.session;

    final content = ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
      children: [
        EmptyStateCard(
          title: 'This account is not available on mobile',
          message: 'Please sign in with a supported mobile account.',
          actionLabel: 'Sign out',
          onAction: controller.logoutInProgress
              ? null
              : () async {
                  await controller.logout();
                },
        ),
        if (session != null) ...[
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.user.fullName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(session.user.email),
                  if ((session.user.workingStoreName ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    MetricChip(
                      label: session.user.workingStoreName!.trim(),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ],
    );

    if (!showAppBar) {
      return Scaffold(body: SafeArea(child: content));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Mobile access')),
      body: content,
    );
  }
}
