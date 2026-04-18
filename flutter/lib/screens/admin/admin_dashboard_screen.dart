import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../core/utils/formatters.dart';
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
  late final TextEditingController _storeScopeController;

  @override
  void initState() {
    super.initState();
    _storeScopeController = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  void dispose() {
    _storeScopeController.dispose();
    super.dispose();
  }

  int? get _selectedStoreId {
    final raw = _storeScopeController.text.trim();
    if (raw.isEmpty) {
      return null;
    }
    return int.tryParse(raw);
  }

  Future<_AdminDashboardBundle> _load() async {
    final controller = AppScope.of(context);
    final scopedStoreId = controller.isAdmin
        ? _selectedStoreId
        : controller.session?.user.workingStoreId;
    final values = await Future.wait<dynamic>([
      controller.loadAdminSummary(storeId: scopedStoreId),
      controller.loadAdminDashboard(storeId: scopedStoreId),
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
            moduleById('news'),
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
                            _HeroChip(
                                label: controller.config.useMockData
                                    ? 'Che do demo'
                                    : 'Live connection'),
                            _HeroChip(
                                label:
                                    controller.session?.user.email ?? 'Guest'),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Phong dieu hanh mobile cho admin',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Focus on high-level metrics, jump into modules quickly, and inspect live data from /api/admin/*.',
                          style:
                              Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.92),
                                  ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (controller.isAdmin) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _storeScopeController,
                            keyboardType: TextInputType.number,
                            onSubmitted: (_) => _refresh(),
                            decoration: const InputDecoration(
                              labelText: 'Scope theo Store ID',
                              hintText: 'Leave empty to view all stores',
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              FilledButton.tonal(
                                onPressed: _refresh,
                                child: const Text('Loc'),
                              ),
                              TextButton(
                                onPressed: () {
                                  _storeScopeController.clear();
                                  _refresh();
                                },
                                child: const Text('All'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
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
                  childAspectRatio: 1.1,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    AdminMetricCard(
                        label: 'Users',
                        value: '${bundle.summary.userCount}',
                        icon: Icons.group_outlined),
                    AdminMetricCard(
                        label: 'Orders',
                        value: '${bundle.summary.orderCount}',
                        icon: Icons.receipt_long_outlined),
                    AdminMetricCard(
                        label: 'Stores',
                        value: '${bundle.summary.storeCount}',
                        icon: Icons.storefront_outlined),
                    AdminMetricCard(
                        label: 'Events',
                        value: '${bundle.summary.eventCount}',
                        icon: Icons.event_outlined),
                    AdminMetricCard(
                        label: 'Categories',
                        value: '${bundle.summary.categoryCount}',
                        icon: Icons.category_outlined),
                    AdminMetricCard(
                        label: 'Dishes',
                        value: '${bundle.summary.dishCount}',
                        icon: Icons.ramen_dining_outlined),
                    AdminMetricCard(
                        label: 'Store Dishes',
                        value: '${bundle.summary.storeDishCount}',
                        icon: Icons.local_mall_outlined),
                    AdminMetricCard(
                        label: 'Promotions',
                        value: '${bundle.summary.promotionCount}',
                        icon: Icons.local_offer_outlined),
                    AdminMetricCard(
                        label: 'Reviews',
                        value: '${bundle.summary.reviewCount}',
                        icon: Icons.reviews_outlined),
                    AdminMetricCard(
                        label: 'News',
                        value: '${bundle.summary.newsCount}',
                        icon: Icons.newspaper_outlined),
                  ],
                ),
                const SizedBox(height: 24),
                const SectionHeader(
                  title: 'Revenue',
                  subtitle: 'Scope theo note backend moi nhat.',
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
                          bundle.summary.revenue.todayRevenue),
                      icon: Icons.today_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Week',
                      value: Formatters.currency(
                          bundle.summary.revenue.weekRevenue),
                      icon: Icons.date_range_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Month',
                      value: Formatters.currency(
                          bundle.summary.revenue.monthRevenue),
                      icon: Icons.calendar_month_outlined,
                    ),
                    AdminMetricCard(
                      label: 'Year',
                      value: Formatters.currency(
                          bundle.summary.revenue.yearRevenue),
                      icon: Icons.auto_graph_outlined,
                    ),
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
                  subtitle:
                      'Loaded from GET /api/admin/dashboard for a quick view of recent data.',
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
                const SizedBox(height: 12),
                _TopSellingPanel(entries: bundle.dashboard.topSellingDishes),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TopSellingPanel extends StatelessWidget {
  const _TopSellingPanel({
    required this.entries,
  });

  final List<AdminTopSellingDish> entries;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Card(
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
            if (entries.isEmpty)
              const Text('Chua co du lieu best seller.')
            else
              ...entries.take(5).map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF6F3EA),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 72,
                              height: 72,
                              child: NetworkOrFallbackImage(
                                imageUrl: controller.config.resolveImageUrl(
                                  entry.imagePaths.isEmpty
                                      ? null
                                      : entry.imagePaths.first,
                                ),
                                height: 72,
                                label: entry.dishName,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    entry.dishName,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall
                                        ?.copyWith(fontWeight: FontWeight.w800),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    entry.storeName,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      MetricChip(
                                          label:
                                              '${entry.quantitySold} da ban'),
                                      MetricChip(
                                          label: '${entry.orderCount} don'),
                                      MetricChip(
                                          label: Formatters.currency(
                                              entry.revenue)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
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
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
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
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w800),
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

