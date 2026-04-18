import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'events_screen.dart';
import 'login_screen.dart';
import 'news_detail_screen.dart';
import 'order_detail_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool? _filterRead;
  Future<List<UserNotificationItem>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= _load();
    }
  }

  Future<List<UserNotificationItem>> _load() {
    return AppScope.of(context).loadUserNotifications(read: _filterRead);
  }

  Future<void> _refresh() async {
    final controller = AppScope.of(context);
    final future = _load();
    setState(() {
      _future = future;
    });
    await controller.loadUserNotificationUnreadCount();
    await future;
  }

  void _openNotification(UserNotificationItem item) {
    if (item.relatedOrderId != null || item.orderId != null) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OrderDetailScreen(orderId: item.relatedOrderId ?? item.orderId!),
        ),
      );
      return;
    }
    if ((item.relatedNewsSlug ?? item.newsSlug) != null) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => NewsDetailScreen(newsKey: item.relatedNewsSlug ?? item.newsSlug!),
        ),
      );
      return;
    }
    if ((item.relatedEventSlug ?? item.eventSlug) != null) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => EventDetailScreen(eventKey: item.relatedEventSlug ?? item.eventSlug!),
        ),
      );
    }
  }

  Future<void> _toggleRead(UserNotificationItem item) async {
    final controller = AppScope.of(context);
    try {
      await controller.markUserNotification(
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

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (controller.isLoggedIn)
            TextButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                await controller.markAllUserNotificationsRead();
                if (!mounted) {
                  return;
                }
                await _refresh();
                if (!mounted) {
                  return;
                }
                messenger.showSnackBar(
                  const SnackBar(content: Text('All notifications were marked as read.')),
                );
              },
              child: const Text('Read all'),
            ),
        ],
      ),
      body: controller.isLoggedIn
          ? Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: Text('All (${controller.userNotificationUnreadCount})'),
                        selected: _filterRead == null,
                        onSelected: (_) {
                          setState(() {
                            _filterRead = null;
                          });
                          _refresh();
                        },
                      ),
                      ChoiceChip(
                        label: const Text('Unread'),
                        selected: _filterRead == false,
                        onSelected: (_) {
                          setState(() {
                            _filterRead = false;
                          });
                          _refresh();
                        },
                      ),
                      ChoiceChip(
                        label: const Text('Read'),
                        selected: _filterRead == true,
                        onSelected: (_) {
                          setState(() {
                            _filterRead = true;
                          });
                          _refresh();
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: FutureBuilder<List<UserNotificationItem>>(
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
                      final items = snapshot.data!;
                      if (items.isEmpty) {
                        return RefreshIndicator(
                          onRefresh: _refresh,
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: const [
                              EmptyStateCard(
                                title: 'No notifications yet',
                                message: 'Order, event, and news notifications will appear here.',
                              ),
                            ],
                          ),
                        );
                      }
                      return RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                          itemCount: items.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final item = items[index];
                            return Card(
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
                                  tooltip: item.read ? 'Mark unread' : 'Mark read',
                                ),
                                onTap: () => _openNotification(item),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            )
          : Padding(
              padding: const EdgeInsets.all(16),
              child: EmptyStateCard(
                title: 'Sign in required',
                message: 'Sign in to receive order, event, and news updates for your account.',
                actionLabel: 'Sign in',
                onAction: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                  );
                },
              ),
            ),
    );
  }
}
