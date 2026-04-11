import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';

class FeedbacksScreen extends StatefulWidget {
  const FeedbacksScreen({super.key});

  @override
  State<FeedbacksScreen> createState() => _FeedbacksScreenState();
}

class _FeedbacksScreenState extends State<FeedbacksScreen> {
  Future<List<CustomerFeedback>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= controller.loadUserFeedbacks();
    }
  }

  Future<void> _refresh() async {
    final future = AppScope.of(context).loadUserFeedbacks();
    setState(() {
      _future = future;
    });
    await future;
  }

  Future<void> _deleteFeedback(CustomerFeedback feedback) async {
    final controller = AppScope.of(context);
    try {
      await controller.deleteUserFeedback(feedback.id);
      if (!mounted) {
        return;
      }
      await _refresh();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Da xoa feedback')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feedback'),
        actions: [
          if (controller.isLoggedIn)
            IconButton(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute<bool>(builder: (_) => const FeedbackComposerScreen()),
                );
                if (created == true && mounted) {
                  _refresh();
                }
              },
              icon: const Icon(Icons.add_comment_outlined),
              tooltip: 'Tao feedback',
            ),
        ],
      ),
      body: controller.isLoggedIn
          ? FutureBuilder<List<CustomerFeedback>>(
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
                final items = snapshot.data!;
                if (items.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: const [
                        EmptyStateCard(
                          title: 'Chua co feedback',
                          message: 'Ban co the gui feedback ve delivery, order experience, store service va app.',
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final feedback = items[index];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      feedback.subject,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(fontWeight: FontWeight.w800),
                                    ),
                                  ),
                                  MetricChip(label: feedback.category),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(feedback.message),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (feedback.relatedStoreName != null)
                                    MetricChip(label: feedback.relatedStoreName!),
                                  if (feedback.relatedOrderId != null)
                                    MetricChip(label: 'Don #${feedback.relatedOrderId}'),
                                  MetricChip(label: Formatters.shortDate(feedback.createdAt)),
                                ],
                              ),
                              if (feedback.replyMessage != null && feedback.replyMessage!.isNotEmpty) ...[
                                const SizedBox(height: 14),
                                Card(
                                  color: const Color(0xFFF4F7F1),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Phan hoi tu ${feedback.repliedByUserName ?? 'Kamatcha'}',
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleSmall
                                              ?.copyWith(fontWeight: FontWeight.w800),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(feedback.replyMessage!),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 10),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () => _deleteFeedback(feedback),
                                  child: const Text('Xoa'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            )
          : Padding(
              padding: const EdgeInsets.all(16),
              child: EmptyStateCard(
                title: 'Can dang nhap',
                message: 'Dang nhap de gui feedback va theo doi phan hoi tu team.',
                actionLabel: 'Dang nhap',
                onAction: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                  );
                },
              ),
            ),
    );
  }
}

class FeedbackComposerScreen extends StatefulWidget {
  const FeedbackComposerScreen({super.key});

  @override
  State<FeedbackComposerScreen> createState() => _FeedbackComposerScreenState();
}

class _FeedbackComposerScreenState extends State<FeedbackComposerScreen> {
  static const List<String> _categories = [
    'GENERAL',
    'STORE_SERVICE',
    'PRODUCT_QUALITY',
    'DELIVERY',
    'ORDER_EXPERIENCE',
    'APP_EXPERIENCE',
    'OTHER',
  ];

  final _formKey = GlobalKey<FormState>();
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();

  String _category = 'GENERAL';
  OrderSummary? _selectedOrder;
  bool _submitting = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _submitting) {
      return;
    }
    final controller = AppScope.of(context);
    setState(() {
      _submitting = true;
    });
    try {
      await controller.createUserFeedback(
        category: _category,
        relatedOrderId: _selectedOrder?.id,
        subject: _subjectController.text.trim(),
        message: _messageController.text.trim(),
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Da gui feedback')),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Tao feedback')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'Loai feedback'),
              items: _categories
                  .map(
                    (item) => DropdownMenuItem<String>(
                      value: item,
                      child: Text(item),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value == null) {
                  return;
                }
                setState(() {
                  _category = value;
                });
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<OrderSummary?>(
              initialValue: _selectedOrder,
              decoration: const InputDecoration(
                labelText: 'Gan voi don hang (khong bat buoc)',
              ),
              items: [
                const DropdownMenuItem<OrderSummary?>(
                  value: null,
                  child: Text('Khong gan don cu the'),
                ),
                ...controller.orders.map(
                  (order) => DropdownMenuItem<OrderSummary?>(
                    value: order,
                    child: Text('#${order.id} • ${order.storeName}'),
                  ),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedOrder = value;
                });
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _subjectController,
              decoration: const InputDecoration(
                labelText: 'Tieu de',
                hintText: 'VD: Giao hang tre hoac can ho tro app',
              ),
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'Nhap tieu de feedback';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _messageController,
              maxLines: 7,
              decoration: const InputDecoration(
                labelText: 'Noi dung',
                hintText: 'Mo ta cu the de team xu ly nhanh hon',
              ),
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'Nhap noi dung feedback';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_outlined),
              label: Text(_submitting ? 'Dang gui...' : 'Gui feedback'),
            ),
          ],
        ),
      ),
    );
  }
}
