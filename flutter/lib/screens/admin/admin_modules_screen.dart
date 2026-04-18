import 'package:flutter/material.dart';

import '../../widgets/app_widgets.dart';
import 'admin_query_screen.dart';
import 'admin_resource_list_screen.dart';
import 'admin_support.dart';
import 'admin_widgets.dart';

class AdminModulesScreen extends StatelessWidget {
  const AdminModulesScreen({super.key});

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
    final groups = const ['Operations', 'Catalog', 'Content'];

    return Scaffold(
      appBar: AppBar(title: const Text('Admin modules')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          const EmptyStateCard(
            title: 'Admin mobile v1',
            message:
                'This board prioritizes dashboard, list, query, and detail viewers for all admin modules. CRUD forms can continue to grow without redesigning the navigation shell.',
          ),
          const SizedBox(height: 24),
          ...groups.map(
            (group) {
              final modules = modulesForGroup(group);
              if (modules.isEmpty) {
                return const SizedBox.shrink();
              }
              return Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SectionHeader(
                      title: group,
                      subtitle: switch (group) {
                        'Operations' => 'Users, orders, branches, and feedback moderation.',
                        'Catalog' => 'Items, categories, promotions, and level logic.',
                        'Content' => 'Event, news va review moderation.',
                        _ => '',
                      },
                    ),
                    const SizedBox(height: 12),
                    ...modules.map(
                      (module) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: AdminModuleCard(
                          module: module,
                          onTap: () => _openModule(context, module),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

