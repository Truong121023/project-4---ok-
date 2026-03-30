import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'admin_query_screen.dart';
import 'admin_resource_list_screen.dart';
import 'admin_support.dart';
import 'admin_widgets.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  Future<_AdminDashboardBundle>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<_AdminDashboardBundle> _load() async {
    final controller = AppScope.of(context);
    final values = await Future.wait<dynamic>([
      controller.loadAdminSummary(),
      controller.loadAdminDashboard(),
    ]);
    return _AdminDashboardBundle(
      summary: values[0] as AdminSummary,
      dashboard: values[1] as AdminDashboard,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  void _openModule(BuildContext context, AdminModuleDefinition module) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => module.isQueryModule
            ? AdminQueryScreen(module: module)
            : AdminResourceListScreen(module: module),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Admin dashboard')),
      body: FutureBuilder<_AdminDashboardBundle>(
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

          final bundle = snapshot.data!;
          final quickModules = [
            moduleById('users'),
            moduleById('orders'),
            moduleById('stores'),
            moduleById('dishes'),
            moduleById('feedbacks'),
            moduleById('work-schedules'),
          ];

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Card(
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF17332A), Color(0xFF596F3B)],
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
                            _HeroChip(label: 'ADMIN'),
                            _HeroChip(label: controller.config.useMockData ? 'Mock mode' : 'Live API'),
                            _HeroChip(label: controller.session?.user.email ?? 'Guest'),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Phong dieu hanh mobile cho admin',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Tap trung nhin so lieu tong quan, mo nhanh module va doc chi tiet du lieu that tu /api/admin/*. ',
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
                  title: 'Tong quan',
                  subtitle: 'Summary nhe va de doc tren man nho.',
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
                    AdminMetricCard(label: 'Users', value: '${bundle.summary.userCount}', icon: Icons.group_outlined),
                    AdminMetricCard(label: 'Stores', value: '${bundle.summary.storeCount}', icon: Icons.storefront_outlined),
                    AdminMetricCard(label: 'Events', value: '${bundle.summary.eventCount}', icon: Icons.event_outlined),
                    AdminMetricCard(label: 'Categories', value: '${bundle.summary.categoryCount}', icon: Icons.category_outlined),
                    AdminMetricCard(label: 'Dishes', value: '${bundle.summary.dishCount}', icon: Icons.ramen_dining_outlined),
                    AdminMetricCard(label: 'News', value: '${bundle.summary.newsCount}', icon: Icons.newspaper_outlined),
                  ],
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: 'Quick control',
                  subtitle: 'Mo thang module dung nhieu nhat trong admin app.',
                ),
                const SizedBox(height: 12),
                ...quickModules.map(
                  (module) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: AdminModuleCard(
                      module: module,
                      onTap: () => _openModule(context, module),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const SectionHeader(
                  title: 'Dashboard preview',
                  subtitle: 'Lay tu GET /api/admin/dashboard de xem nhanh du lieu gan day.',
                ),
                const SizedBox(height: 12),
                _PreviewPanel(
                  title: 'Users',
                  entries: bundle.dashboard.users,
                  fallback: 'Chua co preview user.',
                ),
                const SizedBox(height: 12),
                _PreviewPanel(
                  title: 'Stores',
                  entries: bundle.dashboard.stores,
                  fallback: 'Chua co preview store.',
                ),
                const SizedBox(height: 12),
                _PreviewPanel(
                  title: 'Events',
                  entries: bundle.dashboard.events,
                  fallback: 'Chua co preview event.',
                ),
                const SizedBox(height: 12),
                _PreviewPanel(
                  title: 'Dishes',
                  entries: bundle.dashboard.dishes,
                  fallback: 'Chua co preview dish.',
                ),
                const SizedBox(height: 12),
                _PreviewPanel(
                  title: 'News',
                  entries: bundle.dashboard.news,
                  fallback: 'Chua co preview news.',
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _PreviewPanel extends StatelessWidget {
  const _PreviewPanel({
    required this.title,
    required this.entries,
    required this.fallback,
  });

  final String title;
  final List<JsonMap> entries;
  final String fallback;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            if (entries.isEmpty)
              Text(fallback)
            else
              ...entries.take(3).map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF6F3EA),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          adminPrimaryText(entry),
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        if (adminSecondaryText(entry).isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            adminSecondaryText(entry),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label});

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

class _AdminDashboardBundle {
  const _AdminDashboardBundle({
    required this.summary,
    required this.dashboard,
  });

  final AdminSummary summary;
  final AdminDashboard dashboard;
}
