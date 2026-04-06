import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../core/services/api_service.dart';
import '../../core/utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import '../admin/admin_resource_list_screen.dart';
import '../admin/admin_support.dart';
import '../admin/admin_widgets.dart';
import '../backoffice_support_chat_screen.dart';

class ManagerOverviewScreen extends StatefulWidget {
  const ManagerOverviewScreen({super.key});

  @override
  State<ManagerOverviewScreen> createState() => _ManagerOverviewScreenState();
}

class _ManagerOverviewScreenState extends State<ManagerOverviewScreen> {
  Future<_ManagerOverviewBundle>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<_ManagerOverviewBundle> _load() async {
    final controller = AppScope.of(context);
    final storeId = controller.session?.user.workingStoreId;
    if (storeId == null || storeId <= 0) {
      throw ApiException('Tai khoan manager chua co workingStoreId hop le.');
    }
    final values = await Future.wait<dynamic>([
      controller.loadAdminResource(path: '/api/admin/stores/$storeId'),
      controller.loadAdminSummary(storeId: storeId),
      controller.loadAdminDashboard(storeId: storeId),
      controller.loadAdminNotificationUnreadCount(),
    ]);
    return _ManagerOverviewBundle(
      store: values[0] as JsonMap,
      summary: values[1] as AdminSummary,
      dashboard: values[2] as AdminDashboard,
      unreadNotificationCount: values[3] as int,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  void _openOrders(BuildContext context, int storeId) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminResourceListScreen(
          module: moduleById('orders'),
          initialQuery: {'storeId': '$storeId'},
        ),
      ),
    );
  }

  void _openTeam(BuildContext context, int storeId) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminResourceListScreen(
          module: moduleById('users'),
          initialQuery: {'workingStoreId': '$storeId'},
        ),
      ),
    );
  }

  void _openFeedbacks(BuildContext context, int storeId) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminResourceListScreen(
          module: moduleById('feedbacks'),
          initialQuery: {'relatedStoreId': '$storeId'},
        ),
      ),
    );
  }

  void _openSupportInbox(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const BackofficeSupportChatScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final session = controller.session;
    final storeId = session?.user.workingStoreId ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Store manager')),
      body: FutureBuilder<_ManagerOverviewBundle>(
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
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF17332A), Color(0xFF6A7A36)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.all(Radius.circular(24)),
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _ManagerChip(label: 'MANAGER'),
                            if (session?.user.workingStoreName != null)
                              _ManagerChip(
                                  label: session!.user.workingStoreName!),
                            _ManagerChip(label: 'Store-scoped control'),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          asString(data.store['name'], 'Store cua ban'),
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          asString(data.store['address'],
                              session?.user.workingStoreAddress ?? ''),
                          style:
                              Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.92),
                                  ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const SectionHeader(
                  title: 'Store health hom nay',
                  subtitle:
                      'Chi so manager can nhin dau tien khi mo app theo pham vi cua hang.',
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.1,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    AdminMetricCard(
                      label: 'Orders',
                      value: '${data.summary.orderCount}',
                      icon: Icons.receipt_long_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Team',
                      value: '${data.summary.userCount}',
                      icon: Icons.group_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Feedbacks',
                      value: '${data.dashboard.feedbacks.length}',
                      icon: Icons.forum_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Unread',
                      value: '${data.unreadNotificationCount}',
                      icon: Icons.notifications_active_outlined,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const SectionHeader(
                  title: 'Revenue cua hang',
                  subtitle:
                      'Manager nhin nhanh doanh thu scope theo workingStoreId.',
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.1,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    AdminMetricCard(
                      label: 'Today',
                      value: Formatters.currency(
                          data.summary.revenue.todayRevenue),
                      icon: Icons.today_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Week',
                      value:
                          Formatters.currency(data.summary.revenue.weekRevenue),
                      icon: Icons.date_range_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Month',
                      value: Formatters.currency(
                          data.summary.revenue.monthRevenue),
                      icon: Icons.calendar_month_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Year',
                      value:
                          Formatters.currency(data.summary.revenue.yearRevenue),
                      icon: Icons.auto_graph_outlined,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const SectionHeader(
                  title: 'Quick control',
                  subtitle: 'Mo thang viec manager can dung nhieu nhat.',
                ),
                const SizedBox(height: 12),
                AdminModuleCard(
                  module: moduleById('orders'),
                  onTap: () => _openOrders(context, storeId),
                ),
                const SizedBox(height: 12),
                AdminModuleCard(
                  module: moduleById('users'),
                  onTap: () => _openTeam(context, storeId),
                ),
                const SizedBox(height: 12),
                AdminModuleCard(
                  module: moduleById('feedbacks'),
                  onTap: () => _openFeedbacks(context, storeId),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.support_agent_outlined),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Support chat inbox',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Theo doi phien chat cua user trong pham vi cua hang, nhan session dang cho va tra loi ngay.',
                        ),
                        const SizedBox(height: 12),
                        FilledButton.tonal(
                          onPressed:
                              storeId > 0 ? () => _openSupportInbox(context) : null,
                          child: const Text('Mo inbox'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Top selling dishes',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 12),
                        if (data.dashboard.topSellingDishes.isEmpty)
                          const Text(
                              'Chua co du lieu best seller cho cua hang nay.')
                        else
                          ...data.dashboard.topSellingDishes.take(5).map(
                                (entry) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF6F3EA),
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          entry.dishName,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleSmall
                                              ?.copyWith(
                                                  fontWeight: FontWeight.w800),
                                        ),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 8,
                                          children: [
                                            MetricChip(
                                                label:
                                                    '${entry.quantitySold} da ban'),
                                            MetricChip(
                                                label:
                                                    '${entry.orderCount} don'),
                                            MetricChip(
                                                label: Formatters.currency(
                                                    entry.revenue)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                      ],
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

class _ManagerOverviewBundle {
  const _ManagerOverviewBundle({
    required this.store,
    required this.summary,
    required this.dashboard,
    required this.unreadNotificationCount,
  });

  final JsonMap store;
  final AdminSummary summary;
  final AdminDashboard dashboard;
  final int unreadNotificationCount;
}

class _ManagerChip extends StatelessWidget {
  const _ManagerChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
    );
  }
}
