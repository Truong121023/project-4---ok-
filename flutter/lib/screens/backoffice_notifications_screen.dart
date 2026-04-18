import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'admin/admin_resource_detail_screen.dart';
import 'admin/admin_support.dart';

class BackofficeNotificationsScreen extends StatefulWidget {
  const BackofficeNotificationsScreen({super.key});

  @override
  State<BackofficeNotificationsScreen> createState() => _BackofficeNotificationsScreenState();
}

class _BackofficeNotificationsScreenState extends State<BackofficeNotificationsScreen> {
  bool? _filterRead;
  Future<_BackofficeNotificationBundle>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isBackoffice) {
      _future ??= _load();
    }
  }

  Future<_BackofficeNotificationBundle> _load() async {
    final controller = AppScope.of(context);
    final values = await Future.wait<dynamic>([
      controller.loadAdminNotifications(read: _filterRead, page: 0, size: 30),
      controller.loadAdminNotificationUnreadCount(),
    ]);
    return _BackofficeNotificationBundle(
      notifications: values[0] as List<UserNotificationItem>,
      unreadCount: values[1] as int,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  void _openNotification(UserNotificationItem item) {
    final orderId = item.relatedOrderId ?? item.orderId;
    if (orderId != null) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => AdminResourceDetailScreen(
            module: moduleById('orders'),
            resourceId: orderId,
          ),
        ),
      );
    }
  }

  Future<void> _toggleRead(UserNotificationItem item) async {
    try {
      await AppScope.of(context).markAdminNotification(
        notificationId: item.id,
        read: !item.read,
      );
      if (!mounted) {
        return;
      }
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
      await AppScope.of(context).markAllAdminNotificationsRead();
      if (!mounted) {
        return;
      }
      await _refresh();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All notifications were marked as read.')),
      );
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
    final controller = AppScope.of(context);
    final title = controller.isManager ? 'Store notifications' : 'Backoffice notifications';

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: FutureBuilder<_BackofficeNotificationBundle>(
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
                          '${data.unreadCount} unread notifications',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                          Text(
                            controller.isManager
                                ? 'New order notifications for your assigned store appear here.'
                                : 'Admin notifications and actionable updates appear here.',
                          ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ChoiceChip(
                              label: const Text('All'),
                              selected: _filterRead == null,
                              onSelected: (_) {
                                setState(() => _filterRead = null);
                                _refresh();
                              },
                            ),
                            ChoiceChip(
                              label: const Text('Unread'),
                              selected: _filterRead == false,
                              onSelected: (_) {
                                setState(() => _filterRead = false);
                                _refresh();
                              },
                            ),
                            ChoiceChip(
                              label: const Text('Read'),
                              selected: _filterRead == true,
                              onSelected: (_) {
                                setState(() => _filterRead = true);
                                _refresh();
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.tonal(
                            onPressed: data.notifications.isEmpty ? null : _markAllRead,
                            child: const Text('Read all'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (data.notifications.isEmpty)
                  const EmptyStateCard(
                    title: 'No notifications yet',
                    message: 'Order and moderation notifications will appear here.',
                  )
                else
                  ...data.notifications.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        color: item.read ? null : const Color(0xFFF4F7F1),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          title: Text(
                            item.title,
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: item.read ? null : const Color(0xFF17332A),
                            ),
                          ),
                          subtitle: Text(
                            '${item.message}\n${Formatters.fullDateTime(item.createdAt)}',
                          ),
                          isThreeLine: true,
                          trailing: IconButton(
                            onPressed: () => _toggleRead(item),
                            icon: Icon(item.read ? Icons.mark_email_unread_outlined : Icons.mark_email_read_outlined),
                            tooltip: item.read ? 'Mark as unread' : 'Mark as read',
                          ),
                          onTap: () => _openNotification(item),
                        ),
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

class _BackofficeNotificationBundle {
  const _BackofficeNotificationBundle({
    required this.notifications,
    required this.unreadCount,
  });

  final List<UserNotificationItem> notifications;
  final int unreadCount;
}
