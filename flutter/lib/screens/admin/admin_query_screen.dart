import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'admin_support.dart';
import 'admin_widgets.dart';

class AdminQueryScreen extends StatefulWidget {
  const AdminQueryScreen({
    super.key,
    required this.module,
    this.initialQuery = const {},
    this.autoSubmit = false,
  });

  final AdminModuleDefinition module;
  final Map<String, String?> initialQuery;
  final bool autoSubmit;

  @override
  State<AdminQueryScreen> createState() => _AdminQueryScreenState();
}

class _AdminQueryScreenState extends State<AdminQueryScreen> {
  late final Map<String, TextEditingController> _controllers;
  Future<JsonMap>? _future;
  String? _formError;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final field in widget.module.filters)
        field.key: TextEditingController(
          text: widget.initialQuery[field.key] ?? initialValueForField(field),
        ),
    };
    if (widget.autoSubmit) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _submit();
        }
      });
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final query = <String, String?>{};
    String? validationError;

    for (final field in widget.module.filters) {
      final value = _controllers[field.key]!.text.trim();
      if (field.required && value.isEmpty) {
        validationError = 'Can nhap ${field.label}.';
        break;
      }
      if (value.isNotEmpty) {
        query[field.key] = value;
      }
    }

    if (validationError != null) {
      setState(() => _formError = validationError);
      return;
    }

    setState(() {
      _formError = null;
      _future = AppScope.of(context).loadAdminResource(
        path: widget.module.path,
        query: query,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.module.title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.module.subtitle,
                    style: Theme.of(context).textTheme.bodyLarge,
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
                  if (_formError != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      _formError!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _submit,
                      child: const Text('Xem du lieu'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_future == null)
            const EmptyStateCard(
              title: 'Cho truy van',
              message: 'Nhap bo loc o tren de goi endpoint query-detail va hien thi ket qua.',
            )
          else
            FutureBuilder<JsonMap>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snapshot.hasError || !snapshot.hasData) {
                  return ErrorStateCard(
                    message: snapshot.error.toString(),
                    onRetry: _submit,
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: buildAdminDetailSections(
                    context,
                    module: widget.module,
                    data: snapshot.data!,
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
