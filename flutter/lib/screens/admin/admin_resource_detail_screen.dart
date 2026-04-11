import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import 'admin_editor_support.dart';
import 'admin_resource_editor_screen.dart';
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
  JsonMap? _resource;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<JsonMap> _load() async {
    final data = await AppScope.of(context).loadAdminResource(
      path: '${widget.module.path}/${widget.resourceId}',
    );
    _resource = data;
    return data;
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  Future<void> _openEditor() async {
    final editable = adminEditableModule(widget.module);
    if (editable == null ||
        !canEditAdminModule(
          role: AppScope.of(context).currentRole,
          module: widget.module,
        ) ||
        _resource == null) {
      return;
    }
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => AdminResourceEditorScreen(
          module: widget.module,
          resourceId: widget.resourceId,
          initialData: _resource!,
        ),
      ),
    );
    if (changed == true) {
      await _refresh();
    }
  }

  Future<void> _deleteResource() async {
    final allowDelete = canDeleteAdminModule(
          role: AppScope.of(context).currentRole,
          module: widget.module,
        ) ||
        widget.module.id == 'reviews' ||
        widget.module.id == 'feedbacks';
    if (!allowDelete) {
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Xoa ${widget.module.title}?'),
        content: const Text('Thao tac nay khong the hoan tac.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Huy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Xoa'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    try {
      final response = await AppScope.of(context).deleteAdminResource(
        path: '${widget.module.path}/${widget.resourceId}',
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response.message)),
      );
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  Future<void> _toggleVerification() async {
    final resource = _resource;
    if (resource == null) {
      return;
    }
    final current = asBool(resource['verified']);
    try {
      final updated = await AppScope.of(context).updateAdminUserVerification(
        userId: widget.resourceId,
        verified: !current,
      );
      if (!mounted) {
        return;
      }
      setState(() => _resource = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(!current ? 'Da verify tai khoan.' : 'Da bo verify tai khoan.')),
      );
      await _refresh();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  Future<void> _editOrderStatus() async {
    final resource = _resource;
    if (resource == null) {
      return;
    }
    final statusController = TextEditingController(text: asString(resource['status']));
    final paymentController = TextEditingController(text: asString(resource['paymentStatus']));
    final preparingController = TextEditingController(
      text: asNullableInt(resource['preparingStaffId'])?.toString() ?? '',
    );
    final shipperController = TextEditingController(
      text: asNullableInt(resource['deliveringShipperId'])?.toString() ?? '',
    );

    final result = await showModalBottomSheet<JsonMap>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        final bottomInset = MediaQuery.of(context).viewInsets.bottom;
        return SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 20, 16, bottomInset + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: statusController,
                decoration: const InputDecoration(labelText: 'Status', hintText: 'PREPARING, COMPLETED...'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: paymentController,
                decoration: const InputDecoration(labelText: 'Payment Status', hintText: 'PAID, PENDING...'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: preparingController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Preparing Staff ID'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: shipperController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Delivering Shipper ID'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    Navigator.of(context).pop({
                      'status': statusController.text.trim(),
                      'paymentStatus': paymentController.text.trim(),
                      'preparingStaffId': preparingController.text.trim().isEmpty
                          ? null
                          : int.parse(preparingController.text.trim()),
                      'deliveringShipperId': shipperController.text.trim().isEmpty
                          ? null
                          : int.parse(shipperController.text.trim()),
                    });
                  },
                  child: const Text('Cap nhat'),
                ),
              ),
            ],
          ),
        );
      },
    );

    statusController.dispose();
    paymentController.dispose();
    preparingController.dispose();
    shipperController.dispose();

    if (result == null || !mounted) {
      return;
    }

    try {
      final updated = await AppScope.of(context).updateAdminOrderStatus(
        orderId: widget.resourceId,
        body: result,
      );
      if (!mounted) {
        return;
      }
      setState(() => _resource = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Da cap nhat trang thai don hang.')),
      );
      await _refresh();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  Future<void> _editFeedbackReply() async {
    final controller = AppScope.of(context);
    final reply = await controller.loadAdminFeedbackReply(widget.resourceId);
    if (!mounted) {
      return;
    }
    final textController = TextEditingController(
      text: asString(reply?['replyMessage']),
    );
    final replyMessage = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        final bottomInset = MediaQuery.of(context).viewInsets.bottom;
        return SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 20, 16, bottomInset + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Reply feedback',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: textController,
                minLines: 4,
                maxLines: 6,
                decoration: const InputDecoration(
                  labelText: 'Reply Message',
                  hintText: 'Kamatcha da ghi nhan feedback...',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(textController.text.trim()),
                  child: const Text('Luu reply'),
                ),
              ),
            ],
          ),
        );
      },
    );
    textController.dispose();

    if ((replyMessage ?? '').trim().isEmpty || !mounted) {
      return;
    }
    try {
      await controller.upsertAdminFeedbackReply(
        feedbackId: widget.resourceId,
        replyMessage: replyMessage!.trim(),
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Da luu reply cho feedback.')),
      );
      await _refresh();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  Future<void> _deleteFeedbackReply() async {
    try {
      final message = await AppScope.of(context).deleteAdminFeedbackReply(widget.resourceId);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message.message)),
      );
      await _refresh();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  List<PopupMenuEntry<String>> _buildActionMenu() {
    final currentRole = AppScope.of(context).currentRole;
    final items = <PopupMenuEntry<String>>[];
    if (widget.module.id == 'users') {
      items.add(
        PopupMenuItem<String>(
          value: 'verify',
          child: Text(asBool(_resource?['verified']) ? 'Bo verify' : 'Verify tai khoan'),
        ),
      );
    }
    if (widget.module.id == 'orders') {
      items.add(const PopupMenuItem<String>(value: 'order-status', child: Text('Cap nhat status')));
    }
    if (widget.module.id == 'feedbacks') {
      items.add(const PopupMenuItem<String>(value: 'feedback-reply', child: Text('Sua reply')));
      items.add(const PopupMenuItem<String>(value: 'feedback-reply-delete', child: Text('Xoa reply')));
    }
    if (canDeleteAdminModule(
          role: currentRole,
          module: widget.module,
        ) ||
        widget.module.id == 'reviews' ||
        widget.module.id == 'feedbacks') {
      if (items.isNotEmpty) {
        items.add(const PopupMenuDivider());
      }
      items.add(const PopupMenuItem<String>(value: 'delete', child: Text('Xoa record')));
    }
    return items;
  }

  Future<void> _handleAction(String value) async {
    switch (value) {
      case 'verify':
        await _toggleVerification();
        break;
      case 'order-status':
        await _editOrderStatus();
        break;
      case 'feedback-reply':
        await _editFeedbackReply();
        break;
      case 'feedback-reply-delete':
        await _deleteFeedbackReply();
        break;
      case 'delete':
        await _deleteResource();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final editable = adminEditableModule(widget.module);
    final currentRole = AppScope.of(context).currentRole;
    final actions = _buildActionMenu();
    final canEdit = editable != null &&
        canEditAdminModule(
          role: currentRole,
          module: widget.module,
        );

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.module.title),
        actions: [
          if (canEdit)
            IconButton(
              onPressed: _openEditor,
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Sua',
            ),
          if (actions.isNotEmpty)
            PopupMenuButton<String>(
              onSelected: _handleAction,
              itemBuilder: (_) => actions,
            ),
        ],
      ),
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

          final data = snapshot.data!;
          _resource = data;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: buildAdminDetailSections(
                context,
                module: widget.module,
                data: data,
              ),
            ),
          );
        },
      ),
    );
  }
}
