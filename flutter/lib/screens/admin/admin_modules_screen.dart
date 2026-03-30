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
    final groups = const ['Operations', 'Catalog', 'Content', 'Staffing'];

    return Scaffold(
      appBar: AppBar(title: const Text('Admin modules')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          const EmptyStateCard(
            title: 'Admin mobile v1',
            message:
                'Ban nay uu tien dashboard, list, query va detail viewer cho tat ca module quan tri. CRUD form co the bo sung tiep ma khong can doi lai khung dieu huong.',
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
                        'Operations' => 'Nguoi dung, don hang, chi nhanh va feedback moderation.',
                        'Catalog' => 'Mon, category, promotions va level logic.',
                        'Content' => 'Event, news va review moderation.',
                        _ => 'Lich lam va cham cong.',
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
