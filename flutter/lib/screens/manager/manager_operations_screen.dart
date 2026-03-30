import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';
import '../admin/admin_query_screen.dart';
import '../admin/admin_resource_detail_screen.dart';
import '../admin/admin_resource_list_screen.dart';
import '../admin/admin_support.dart';
import '../admin/admin_widgets.dart';

class ManagerOperationsScreen extends StatelessWidget {
  const ManagerOperationsScreen({super.key});

  String _currentMonth() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}';
  }

  String _todayDate() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
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

  void _openList(
    BuildContext context,
    AdminModuleDefinition module, {
    Map<String, String?> query = const {},
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminResourceListScreen(
          module: module,
          initialQuery: query,
        ),
      ),
    );
  }

  void _openQuery(
    BuildContext context,
    AdminModuleDefinition module, {
    Map<String, String?> query = const {},
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AdminQueryScreen(
          module: module,
          initialQuery: query,
          autoSubmit: true,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final storeId = controller.session?.user.workingStoreId ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Manager operations')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          const EmptyStateCard(
            title: 'Manager panel theo role note moi',
            message:
                'Chi giu cac module manager duoc dung va an phan toan he thong. Cac action ben duoi deu xoay quanh mot store duy nhat.',
          ),
          const SizedBox(height: 24),
          const SectionHeader(
            title: 'Store',
            subtitle: 'Nhung gi can de dieu hanh cua hang hien tai.',
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const Icon(Icons.storefront_outlined),
              title: const Text('Store profile', style: TextStyle(fontWeight: FontWeight.w800)),
              subtitle: const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Manager chi sua store cua minh, khong tao/xoa chi nhanh moi.'),
              ),
              trailing: FilledButton.tonal(
                onPressed: storeId > 0 ? () => _openStoreDetail(context, storeId) : null,
                child: const Text('Mo'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          ...[
            moduleById('categories'),
            moduleById('dishes'),
            moduleById('events'),
            moduleById('news'),
            moduleById('store-dishes'),
          ].map(
            (module) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AdminModuleCard(
                module: module,
                onTap: () => _openList(context, module),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const SectionHeader(
            title: 'People & shifts',
            subtitle: 'Nhan vien, lich thang va attendance cua store hien tai.',
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('users'),
            onTap: () => _openList(context, moduleById('users')),
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('work-schedules'),
            onTap: () => _openQuery(
              context,
              moduleById('work-schedules'),
              query: {
                'storeId': '$storeId',
                'month': _currentMonth(),
              },
            ),
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('attendances'),
            onTap: () => _openList(
              context,
              moduleById('attendances'),
              query: {'storeId': '$storeId'},
            ),
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('attendance-summary'),
            onTap: () => _openQuery(
              context,
              moduleById('attendance-summary'),
              query: {
                'storeId': '$storeId',
                'workDate': _todayDate(),
              },
            ),
          ),
          const SizedBox(height: 24),
          const SectionHeader(
            title: 'Moderation',
            subtitle: 'Don hang, review va feedback trong pham vi cua hang.',
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('orders'),
            onTap: () => _openList(
              context,
              moduleById('orders'),
              query: {'storeId': '$storeId'},
            ),
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('reviews'),
            onTap: () => _openList(context, moduleById('reviews')),
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('feedbacks'),
            onTap: () => _openList(context, moduleById('feedbacks')),
          ),
        ],
      ),
    );
  }
}
