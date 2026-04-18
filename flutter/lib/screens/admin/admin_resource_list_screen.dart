import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'admin_editor_support.dart';
import 'admin_resource_editor_screen.dart';
import 'admin_resource_detail_screen.dart';
import 'admin_support.dart';
import 'admin_widgets.dart';

class AdminResourceListScreen extends StatefulWidget {
  const AdminResourceListScreen({
    super.key,
    required this.module,
    this.initialQuery = const {},
    this.initialSearch = '',
  });

  final AdminModuleDefinition module;
  final Map<String, String?> initialQuery;
  final String initialSearch;

  @override
  State<AdminResourceListScreen> createState() =>
      _AdminResourceListScreenState();
}

class _AdminResourceListScreenState extends State<AdminResourceListScreen> {
  late final TextEditingController _searchController;
  Future<AdminListResult>? _future;
  late Map<String, String?> _query;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.initialSearch);
    _query = {...widget.initialQuery};
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<AdminListResult> _load() {
    return AppScope.of(context).loadAdminCollection(
      path: widget.module.path,
      paged: widget.module.paged,
      search: widget.module.supportsSearch ? _searchController.text.trim() : '',
      page: _page,
      query: _query,
    );
  }

  Future<void> _refresh({int? page, bool resetPage = false}) async {
    if (page != null) {
      _page = page;
    } else if (resetPage) {
      _page = 0;
    }
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  Future<void> _editFilters() async {
    final result = await showModalBottomSheet<Map<String, String?>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _AdminFiltersSheet(
        module: widget.module,
        initialValues: _query,
      ),
    );
    if (!mounted || result == null) {
      return;
    }
    setState(() => _query = result);
    await _refresh(resetPage: true);
  }

  Future<void> _createResource() async {
    final editable = adminEditableModule(widget.module);
    if (editable == null ||
        !canCreateAdminModule(
          role: AppScope.of(context).currentRole,
          module: widget.module,
        )) {
      return;
    }
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => AdminResourceEditorScreen(module: widget.module),
      ),
    );
    if (changed == true) {
      await _refresh(resetPage: true);
    }
  }

  Future<void> _openDetail(JsonMap item) async {
    final id = asInt(item['id'], -1);
    if (id <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('This record does not have a valid id to open the detail view.')),
      );
      return;
    }
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => AdminResourceDetailScreen(
          module: widget.module,
          resourceId: id,
        ),
      ),
    );
    if (changed == true) {
      await _refresh(page: _page);
    }
  }

  String _pagingLabel(AdminListResult result) {
    if (!result.paged) {
      return '${result.totalItems} records';
    }
    final totalPages = result.totalPages == 0 ? 1 : result.totalPages;
    return 'Page ${result.page + 1}/$totalPages • ${result.totalItems} records';
  }

  @override
  Widget build(BuildContext context) {
    final activeFilters = _query.entries
        .where((entry) => (entry.value ?? '').trim().isNotEmpty)
        .toList();
    final editable = adminEditableModule(widget.module);
    final currentRole = AppScope.of(context).currentRole;
    final canCreate = editable != null &&
        canCreateAdminModule(
          role: currentRole,
          module: widget.module,
        );

    return Scaffold(
      appBar: AppBar(title: Text(widget.module.title)),
      body: FutureBuilder<AdminListResult>(
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
                onRetry: () => _refresh(),
              ),
            );
          }

          final result = snapshot.data!;
          return RefreshIndicator(
            onRefresh: () => _refresh(page: _page),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextField(
                          controller: _searchController,
                          enabled: widget.module.supportsSearch,
                          onSubmitted: (_) => _refresh(resetPage: true),
                          decoration: InputDecoration(
                            labelText: widget.module.searchHint,
                            prefixIcon: const Icon(Icons.search),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (widget.module.filters.isNotEmpty)
                              FilledButton.tonalIcon(
                                onPressed: _editFilters,
                                icon: const Icon(Icons.tune),
                                label: const Text('Loc'),
                              ),
                            if (widget.module.supportsSearch)
                              TextButton(
                                onPressed: () => _refresh(resetPage: true),
                                child: const Text('Goi lai'),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          widget.module.subtitle,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        if (activeFilters.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: activeFilters
                                .map((entry) => MetricChip(
                                    label:
                                        '${adminFieldLabel(entry.key)}: ${entry.value}'))
                                .toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (result.items.isEmpty)
                  const EmptyStateCard(
                    title: 'Khong co du lieu',
                    message:
                        'Try changing the search or filters, or check the permissions of the current account.',
                  )
                else ...[
                  ...result.items.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: AdminRecordCard(
                        module: widget.module,
                        record: item,
                        onTap: () {
                          _openDetail(item);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_pagingLabel(result)),
                          if (result.paged) ...[
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                OutlinedButton(
                                  onPressed: result.hasPrevious
                                      ? () => _refresh(page: _page - 1)
                                      : null,
                                  child: const Text('Prev'),
                                ),
                                OutlinedButton(
                                  onPressed: result.hasNext
                                      ? () => _refresh(page: _page + 1)
                                      : null,
                                  child: const Text('Next'),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: _createResource,
              icon: const Icon(Icons.add),
              label: const Text('Tao moi'),
            )
          : null,
    );
  }
}

class _AdminFiltersSheet extends StatefulWidget {
  const _AdminFiltersSheet({
    required this.module,
    required this.initialValues,
  });

  final AdminModuleDefinition module;
  final Map<String, String?> initialValues;

  @override
  State<_AdminFiltersSheet> createState() => _AdminFiltersSheetState();
}

class _AdminFiltersSheetState extends State<_AdminFiltersSheet> {
  late final Map<String, TextEditingController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final field in widget.module.filters)
        field.key: TextEditingController(
          text: widget.initialValues[field.key] ?? initialValueForField(field),
        ),
    };
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(16, 20, 16, bottomInset + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bo loc ${widget.module.title}',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 16),
          ...widget.module.filters.map(
            (field) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: TextField(
                controller: _controllers[field.key],
                decoration: InputDecoration(
                  labelText: field.label,
                  hintText: field.hint,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).pop(
                      <String, String?>{
                        for (final field in widget.module.filters)
                          field.key: '',
                      },
                    );
                  },
                  child: const Text('Xoa loc'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop(
                      <String, String?>{
                        for (final field in widget.module.filters)
                          field.key: _controllers[field.key]!.text.trim(),
                      },
                    );
                  },
                  child: const Text('Ap dung'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

