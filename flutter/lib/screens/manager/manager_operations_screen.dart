import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../widgets/app_widgets.dart';
import '../admin/admin_resource_detail_screen.dart';
import '../admin/admin_resource_list_screen.dart';
import '../admin/admin_support.dart';
import '../admin/admin_widgets.dart';

class ManagerOperationsScreen extends StatelessWidget {
  const ManagerOperationsScreen({super.key});

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

  Map<String, String?> _storeScopedQuery(String moduleId, int storeId) {
    if (storeId <= 0) {
      return const {};
    }
    return switch (moduleId) {
      'users' => {'workingStoreId': '$storeId'},
      'news' => {'relatedStoreId': '$storeId'},
      'feedbacks' => {'relatedStoreId': '$storeId'},
      _ => {'storeId': '$storeId'},
    };
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
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.storefront_outlined),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Store profile',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                      'Manager chi sua store cua minh, khong tao/xoa chi nhanh moi.'),
                  const SizedBox(height: 12),
                  FilledButton.tonal(
                    onPressed: storeId > 0
                        ? () => _openStoreDetail(context, storeId)
                        : null,
                    child: const Text('Mo'),
                  ),
                ],
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
                onTap: () => _openList(
                  context,
                  module,
                  query: _storeScopedQuery(module.id, storeId),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const SectionHeader(
            title: 'People',
            subtitle:
                'Quan ly STAFF va SHIPPER trong dung cua hang duoc phan cong.',
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('users'),
            onTap: () => _openList(
              context,
              moduleById('users'),
              query: _storeScopedQuery('users', storeId),
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
            onTap: () => _openList(
              context,
              moduleById('reviews'),
              query: _storeScopedQuery('reviews', storeId),
            ),
          ),
          const SizedBox(height: 12),
          AdminModuleCard(
            module: moduleById('feedbacks'),
            onTap: () => _openList(
              context,
              moduleById('feedbacks'),
              query: _storeScopedQuery('feedbacks', storeId),
            ),
          ),
        ],
      ),
    );
  }
}
