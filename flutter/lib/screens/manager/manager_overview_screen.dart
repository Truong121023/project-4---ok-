import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import '../admin/admin_query_screen.dart';
import '../admin/admin_resource_detail_screen.dart';
import '../admin/admin_resource_list_screen.dart';
import '../admin/admin_support.dart';
import '../admin/admin_widgets.dart';

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

  String get _todayDate {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  String get _currentMonth {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}';
  }

  Future<_ManagerOverviewBundle> _load() async {
    final controller = AppScope.of(context);
    final storeId = controller.session?.user.workingStoreId;
    if (storeId == null || storeId <= 0) {
      throw ApiException('Tai khoan manager chua co workingStoreId hop le.');
    }
    final values = await Future.wait<dynamic>([
      controller.loadAdminResource(path: '/api/admin/stores/$storeId'),
      controller.loadAdminResource(
        path: '/api/admin/attendances/summary',
        query: {
          'storeId': '$storeId',
          'workDate': _todayDate,
        },
      ),
    ]);
    return _ManagerOverviewBundle(
      store: values[0] as JsonMap,
      attendanceSummary: values[1] as JsonMap,
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

  void _openTeam(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminResourceListScreen(
          module: moduleById('users'),
        ),
      ),
    );
  }

  void _openFeedbacks(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminResourceListScreen(module: moduleById('feedbacks')),
      ),
    );
  }

  void _openTodayAttendance(BuildContext context, int storeId) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminQueryScreen(
          module: moduleById('attendance-summary'),
          initialQuery: {
            'storeId': '$storeId',
            'workDate': _todayDate,
          },
          autoSubmit: true,
        ),
      ),
    );
  }

  void _openSchedules(BuildContext context, int storeId) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminQueryScreen(
          module: moduleById('work-schedules'),
          initialQuery: {
            'storeId': '$storeId',
            'month': _currentMonth,
          },
          autoSubmit: true,
        ),
      ),
    );
  }

  void _openStoreDetail(BuildContext context, int storeId) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminResourceDetailScreen(
          module: moduleById('stores'),
          resourceId: storeId,
        ),
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
                            if (session?.user.workingStoreName != null) _ManagerChip(label: session!.user.workingStoreName!),
                            _ManagerChip(label: 'Store-scoped control'),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          asString(data.store['name'], 'Store cua ban'),
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          asString(data.store['address'], session?.user.workingStoreAddress ?? ''),
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
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
                  subtitle: 'Chi so manager can nhin dau tien khi mo app.',
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.35,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    AdminMetricCard(
                      label: 'Assigned',
                      value: '${asInt(data.attendanceSummary['totalAssignedEmployees'])}',
                      icon: Icons.badge_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Present',
                      value: '${asInt(data.attendanceSummary['presentCount'])}',
                      icon: Icons.how_to_reg_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Working now',
                      value: '${asInt(data.attendanceSummary['currentlyWorkingCount'])}',
                      icon: Icons.timelapse_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Checked out',
                      value: '${asInt(data.attendanceSummary['checkedOutCount'])}',
                      icon: Icons.task_alt_outlined,
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
                  onTap: () => _openTeam(context),
                ),
                const SizedBox(height: 12),
                AdminModuleCard(
                  module: moduleById('feedbacks'),
                  onTap: () => _openFeedbacks(context),
                ),
                const SizedBox(height: 12),
                AdminModuleCard(
                  module: moduleById('attendance-summary'),
                  onTap: () => _openTodayAttendance(context, storeId),
                ),
                const SizedBox(height: 12),
                AdminModuleCard(
                  module: moduleById('work-schedules'),
                  onTap: () => _openSchedules(context, storeId),
                ),
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: const Icon(Icons.support_agent_outlined),
                    title: const Text(
                      'Support chat inbox',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Theo note moi, manager chi nhin session cua workingStoreId. Khung UI co the them tiep sau khi noi Socket.IO.',
                      ),
                    ),
                    trailing: FilledButton.tonal(
                      onPressed: storeId > 0 ? () => _openStoreDetail(context, storeId) : null,
                      child: const Text('Store'),
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
    required this.attendanceSummary,
  });

  final JsonMap store;
  final JsonMap attendanceSummary;
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
