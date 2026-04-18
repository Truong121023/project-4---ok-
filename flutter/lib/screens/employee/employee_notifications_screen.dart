import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'employee_order_detail_screen.dart';
import 'employee_support.dart';
import 'employee_widgets.dart';

class EmployeeNotificationsScreen extends StatefulWidget {
  const EmployeeNotificationsScreen({
    super.key,
    required this.kind,
  });

  final EmployeeRoleKind kind;

  @override
  State<EmployeeNotificationsScreen> createState() =>
      _EmployeeNotificationsScreenState();
}

class _EmployeeNotificationsScreenState
    extends State<EmployeeNotificationsScreen> {
  bool? _filterRead;
  Future<_EmployeeNotificationBundle>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<_EmployeeNotificationBundle> _load() async {
    final controller = AppScope.of(context);
    final values = await Future.wait<dynamic>([
      controller.loadEmployeeNotifications(page: 0, size: 30, read: _filterRead),
      controller.loadEmployeeNotificationUnreadCount(),
    ]);
    return _EmployeeNotificationBundle(
      notifications: (values[0] as AdminListResult).items,
      unreadCount: values[1] as int,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() {
      _future = future;
    });
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
        const SnackBar(content: Text('All notifications were marked as read.')),
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

  Future<void> _openNotification(JsonMap notification) async {
    final orderId = employeeNotificationOrderId(notification);
    if (orderId == null) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This notification is not linked to an order yet.')),
      );
      return;
    }

    final controller = AppScope.of(context);
    try {
      if (!asBool(notification['read'])) {
        await controller.markEmployeeNotification(
          notificationId: asInt(notification['id']),
          read: true,
        );
      }
      final detail = await controller.loadEmployeeOrderDetail(orderId);
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push<bool>(
        MaterialPageRoute<bool>(
          builder: (_) => EmployeeOrderDetailScreen(
            kind: widget.kind,
            initialOrder: detail,
            bannerMessage: asNullableString(notification['message']),
          ),
        ),
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
    final screenTitle = widget.kind == EmployeeRoleKind.shipper
        ? 'Pickup inbox'
        : 'Task notifications';
    return Scaffold(
      appBar: AppBar(title: Text(screenTitle)),
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
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('All'),
                      selected: _filterRead == null,
                      onSelected: (_) {
                        setState(() {
                          _filterRead = null;
                          _future = _load();
                        });
                      },
                    ),
                    ChoiceChip(
                      label: const Text('Unread'),
                      selected: _filterRead == false,
                      onSelected: (_) {
                        setState(() {
                          _filterRead = false;
                          _future = _load();
                        });
                      },
                    ),
                    ChoiceChip(
                      label: const Text('Read'),
                      selected: _filterRead == true,
                      onSelected: (_) {
                        setState(() {
                          _filterRead = true;
                          _future = _load();
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.kind == EmployeeRoleKind.shipper
                              ? 'New pickup tasks for your route'
                              : '${data.unreadCount} unread notifications',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          widget.kind == EmployeeRoleKind.shipper
                              ? 'When a manager assigns you to an order, it appears here. Open the task, go to the store, and scan the invoice QR to confirm pickup.'
                              : 'Tap a card to open the task quickly and manage its read status.',
                        ),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            MetricChip(
                              label: '${data.notifications.length} notifications',
                              icon: Icons.notifications_active_outlined,
                            ),
                            MetricChip(
                              label: '${data.unreadCount} unread',
                              backgroundColor: data.unreadCount == 0
                                  ? const Color(0xFFE8F0E0)
                                  : const Color(0xFFFFEED8),
                              foregroundColor: data.unreadCount == 0
                                  ? const Color(0xFF17332A)
                                  : const Color(0xFF9A6B1F),
                            ),
                            if (widget.kind == EmployeeRoleKind.shipper)
                              const MetricChip(
                                label: 'Scan required at pickup',
                                backgroundColor: Color(0xFFE7F1E3),
                              ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        FilledButton.tonalIcon(
                          onPressed:
                              data.notifications.isEmpty ? null : _markAllRead,
                          icon: const Icon(Icons.done_all_outlined),
                          label: const Text('Mark all read'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (data.notifications.isEmpty)
                  const EmptyStateCard(
                    title: 'No notifications',
                    message:
                        'Order notifications and work updates will appear here.',
                  )
                else
                  ...data.notifications.map(
                    (notification) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeNotificationCard(
                        kind: widget.kind,
                        notification: notification,
                        onToggleRead: () => _toggleRead(notification),
                        onTap: () => _openNotification(notification),
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
