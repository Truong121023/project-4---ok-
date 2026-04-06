import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'employee_widgets.dart';

class EmployeeNotificationsScreen extends StatefulWidget {
  const EmployeeNotificationsScreen({super.key});

  @override
  State<EmployeeNotificationsScreen> createState() =>
      _EmployeeNotificationsScreenState();
}

class _EmployeeNotificationsScreenState
    extends State<EmployeeNotificationsScreen> {
  Future<_EmployeeNotificationBundle>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<_EmployeeNotificationBundle> _load() async {
    final controller = AppScope.of(context);
    final values = await Future.wait<dynamic>([
      controller.loadEmployeeNotifications(page: 0, size: 30),
      controller.loadEmployeeNotificationUnreadCount(),
    ]);
    return _EmployeeNotificationBundle(
      notifications: (values[0] as AdminListResult).items,
      unreadCount: values[1] as int,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  Future<void> _toggleRead(JsonMap notification) async {
    try {
      await AppScope.of(context).markEmployeeNotification(
        notificationId: asInt(notification['id']),
        read: !asBool(notification['read']),
      );
      await _refresh();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _markAllRead() async {
    try {
      await AppScope.of(context).markAllEmployeeNotificationsRead();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Da danh dau da doc tat ca thong bao.')),
      );
      await _refresh();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: FutureBuilder<_EmployeeNotificationBundle>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: ErrorStateCard(
                message: snapshot.error.toString(),
                onRetry: _refresh,
              ),
            );
          }

          final data = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${data.unreadCount} thong bao chua doc',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                            'Tap vao tung card de doi read/unread nhanh.'),
                        const SizedBox(height: 12),
                        FilledButton.tonal(
                          onPressed:
                              data.notifications.isEmpty ? null : _markAllRead,
                          child: const Text('Read all'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (data.notifications.isEmpty)
                  const EmptyStateCard(
                    title: 'Khong co thong bao',
                    message:
                        'Thong bao don hang va cap nhat cong viec se hien tai day.',
                  )
                else
                  ...data.notifications.map(
                    (notification) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeNotificationCard(
                        notification: notification,
                        onToggleRead: () => _toggleRead(notification),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _EmployeeNotificationBundle {
  const _EmployeeNotificationBundle({
    required this.notifications,
    required this.unreadCount,
  });

  final List<JsonMap> notifications;
  final int unreadCount;
}
