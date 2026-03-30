import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'admin_support.dart';
import 'admin_widgets.dart';

class AdminResourceDetailScreen extends StatefulWidget {
  const AdminResourceDetailScreen({
    super.key,
    required this.module,
    required this.resourceId,
  });

  final AdminModuleDefinition module;
  final int resourceId;

  @override
  State<AdminResourceDetailScreen> createState() => _AdminResourceDetailScreenState();
}

class _AdminResourceDetailScreenState extends State<AdminResourceDetailScreen> {
  Future<JsonMap>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<JsonMap> _load() {
    return AppScope.of(context).loadAdminResource(
      path: '${widget.module.path}/${widget.resourceId}',
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.module.title)),
      body: FutureBuilder<JsonMap>(
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

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: buildAdminDetailSections(
                context,
                module: widget.module,
                data: snapshot.data!,
              ),
            ),
          );
        },
      ),
    );
  }
}
