import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'admin_support.dart';

class AdminMetricCard extends StatelessWidget {
  const AdminMetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: const Color(0xFFE6EEDB),
                borderRadius: BorderRadius.circular(16),
              ),
              alignment: Alignment.center,
              child: Icon(icon, color: const Color(0xFF17332A)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(label),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AdminModuleCard extends StatelessWidget {
  const AdminModuleCard({
    super.key,
    required this.module,
    required this.onTap,
  });

  final AdminModuleDefinition module;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE6EEDB),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    alignment: Alignment.center,
                    child: Icon(module.icon, color: const Color(0xFF17332A)),
                  ),
                  const Spacer(),
                  MetricChip(
                    label: switch (module.mode) {
                      AdminModuleMode.pagedList => 'List',
                      AdminModuleMode.plainList => 'List thang',
                      AdminModuleMode.queryDetail => 'Query',
                    },
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                module.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                module.subtitle,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AdminRecordCard extends StatelessWidget {
  const AdminRecordCard({
    super.key,
    required this.module,
    required this.record,
    required this.onTap,
  });

  final AdminModuleDefinition module;
  final JsonMap record;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final subtitle = adminSecondaryText(record);
    final chips = adminChips(record);
    final imagePath = adminFirstImagePath(record);
    final updatedAt = record.containsKey('updatedAt')
        ? formatAdminValue('updatedAt', record['updatedAt'])
        : null;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (imagePath != null) ...[
                NetworkOrFallbackImage(
                  imageUrl: controller.config.resolveImageUrl(imagePath),
                  height: 132,
                  label: adminPrimaryText(record),
                ),
                const SizedBox(height: 14),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      adminPrimaryText(record),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '#${record['id'] ?? '-'}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  subtitle,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              if (chips.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: chips.map((chip) => MetricChip(label: chip)).toList(),
                ),
              ],
              if (updatedAt != null && updatedAt.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  'Updated: $updatedAt',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

List<Widget> buildAdminDetailSections(
  BuildContext context, {
  required AdminModuleDefinition module,
  required JsonMap data,
}) {
  final controller = AppScope.of(context);
  final imagePath = adminFirstImagePath(data);
  final textBlocks = adminTextBlocks(data);
  final scalarEntries = adminScalarEntries(data);
  final primitiveLists = adminPrimitiveLists(data)
      .where((entry) => entry.key != 'imagePaths')
      .toList();
  final objectEntries = adminObjectEntries(data);
  final objectLists = adminObjectLists(data)
      .where((entry) => entry.key != 'files')
      .toList();
  final sections = adminSections(data);
  final widgets = <Widget>[
    if (imagePath != null)
      NetworkOrFallbackImage(
        imageUrl: controller.config.resolveImageUrl(imagePath),
        height: 220,
        label: adminPrimaryText(data),
      ),
    if (imagePath != null) const SizedBox(height: 16),
    Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              adminPrimaryText(data),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            if (adminSecondaryText(data).isNotEmpty)
              Text(
                adminSecondaryText(data),
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            if (adminChips(data).isNotEmpty) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: adminChips(data).map((chip) => MetricChip(label: chip)).toList(),
              ),
            ],
          ],
        ),
      ),
    ),
  ];

  if (textBlocks.isNotEmpty) {
    widgets.add(const SizedBox(height: 16));
    widgets.addAll(
      textBlocks.map(
        (entry) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    adminFieldLabel(entry.key),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(entry.value),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  if (scalarEntries.isNotEmpty) {
    widgets.add(const SizedBox(height: 12));
    widgets.add(
      Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Thong tin chinh',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              ...scalarEntries.map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 132,
                        child: Text(
                          adminFieldLabel(entry.key),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          formatAdminValue(entry.key, entry.value),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  if (primitiveLists.isNotEmpty) {
    widgets.add(const SizedBox(height: 12));
    widgets.addAll(
      primitiveLists.map(
        (entry) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    adminFieldLabel(entry.key),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: entry.value.map((value) => MetricChip(label: value)).toList(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  if (sections.isNotEmpty) {
    widgets.add(const SizedBox(height: 12));
    widgets.add(
      SectionHeader(
        title: 'Sections',
        subtitle: 'Noi dung dai ma admin da nhap cho ${module.title.toLowerCase()}.',
      ),
    );
    widgets.add(const SizedBox(height: 12));
    widgets.addAll(
      sections.map(
        (section) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (section.title.isNotEmpty)
                    Text(
                      section.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  if (section.title.isNotEmpty) const SizedBox(height: 8),
                  if (section.imagePath != null) ...[
                    NetworkOrFallbackImage(
                      imageUrl: controller.config.resolveImageUrl(section.imagePath),
                      height: 170,
                      label: section.title.isEmpty ? module.title : section.title,
                    ),
                    const SizedBox(height: 12),
                  ],
                  Text(section.content),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  if (objectEntries.isNotEmpty) {
    widgets.add(const SizedBox(height: 12));
    widgets.addAll(
      objectEntries.map(
        (entry) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    adminFieldLabel(entry.key),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  ...adminScalarEntries(entry.value).map(
                    (field) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 132,
                            child: Text(
                              adminFieldLabel(field.key),
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Text(formatAdminValue(field.key, field.value))),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  if (objectLists.isNotEmpty) {
    widgets.add(const SizedBox(height: 12));
    widgets.addAll(
      objectLists.map(
        (entry) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    adminFieldLabel(entry.key),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  ...entry.value.map(
                    (item) => Padding(
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
                              adminPrimaryText(item),
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            if (adminSecondaryText(item).isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(adminSecondaryText(item)),
                            ],
                            if (adminChips(item).isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: adminChips(item).map((chip) => MetricChip(label: chip)).toList(),
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
          ),
        ),
      ),
    );
  }

  return widgets;
}
