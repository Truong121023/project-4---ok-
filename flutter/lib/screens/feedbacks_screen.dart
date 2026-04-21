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
      _future ??= _load();
    }
  }

  Future<List<CustomerFeedback>> _load() async {
    final controller = AppScope.of(context);
    await controller.refreshOrders();
    return controller.loadUserFeedbacks();
  }

  Future<void> _refresh() async {
    final future = _load();
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
        const SnackBar(content: Text('Feedback deleted')),
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
        title: const Text('Order feedback'),
        actions: [
          if (controller.isLoggedIn)
            IconButton(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute<bool>(
                    builder: (_) => const FeedbackComposerScreen(),
                  ),
                );
                if (created == true && mounted) {
                  _refresh();
                }
              },
              icon: const Icon(Icons.rate_review_outlined),
              tooltip: 'Leave feedback',
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
                          title: 'No order feedback yet',
                          message:
                              'Feedback becomes available after a paid order has been completed.',
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
                                      feedback.relatedStoreName ??
                                          'Order #${feedback.relatedOrderId ?? feedback.id}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(fontWeight: FontWeight.w800),
                                    ),
                                  ),
                                  MetricChip(
                                    label: feedback.replyMessage != null &&
                                            feedback.replyMessage!.trim().isNotEmpty
                                        ? 'Replied'
                                        : 'Awaiting reply',
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (feedback.relatedOrderId != null)
                                    MetricChip(label: 'Order #${feedback.relatedOrderId}'),
                                  MetricChip(label: Formatters.shortDate(feedback.updatedAt ?? feedback.createdAt)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                feedback.message,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              if (feedback.replyMessage != null &&
                                  feedback.replyMessage!.trim().isNotEmpty) ...[
                                const SizedBox(height: 14),
                                Card(
                                  color: const Color(0xFFF4F7F1),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Store reply',
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleSmall
                                              ?.copyWith(fontWeight: FontWeight.w800),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(feedback.replyMessage!),
                                        if (feedback.repliedAt != null) ...[
                                          const SizedBox(height: 8),
                                          Text(
                                            'Updated ${Formatters.fullDateTime(feedback.repliedAt!)}',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(color: const Color(0xFF6D675C)),
                                          ),
                                        ],
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
                                  child: const Text('Delete'),
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
                title: 'Sign in required',
                message:
                    'Sign in to review completed orders and leave feedback for the store.',
                actionLabel: 'Sign in',
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
  const FeedbackComposerScreen({
    super.key,
    this.initialOrderId,
  });

  final int? initialOrderId;

  @override
  State<FeedbackComposerScreen> createState() => _FeedbackComposerScreenState();
}

class _FeedbackComposerScreenState extends State<FeedbackComposerScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _messageController = TextEditingController();

  OrderSummary? _selectedOrder;
  bool _submitting = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn && controller.orders.isEmpty) {
      controller.refreshOrders();
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _submitting) {
      return;
    }
    if (_selectedOrder == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose a completed order first.')),
      );
      return;
    }
    final controller = AppScope.of(context);
    setState(() {
      _submitting = true;
    });
    try {
      await controller.createUserFeedback(
        relatedOrderId: _selectedOrder!.id,
        message: _messageController.text.trim(),
      );
      if (!mounted) {
        return;
      }
      await controller.refreshOrders();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Feedback sent')),
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
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final feedbackOrderIds = <int>{
          ...controller.orders
              .where((order) => order.feedbackSubmitted)
              .map((order) => order.id),
        };
        final eligibleOrders = controller.orders
            .where((order) => order.status.toUpperCase() == 'COMPLETED')
            .where((order) => order.paymentStatus.toUpperCase() == 'PAID')
            .where((order) => !feedbackOrderIds.contains(order.id))
            .toList()
          ..sort((left, right) {
            final rightTime = right.createdAt?.millisecondsSinceEpoch ?? 0;
            final leftTime = left.createdAt?.millisecondsSinceEpoch ?? 0;
            return rightTime.compareTo(leftTime);
          });

        _selectedOrder ??= eligibleOrders.cast<OrderSummary?>().firstWhere(
              (order) => order?.id == widget.initialOrderId,
              orElse: () => eligibleOrders.isEmpty ? null : eligibleOrders.first,
            );

        return Scaffold(
          appBar: AppBar(title: const Text('Leave order feedback')),
          body: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                if (eligibleOrders.isEmpty)
                  const EmptyStateCard(
                    title: 'No eligible orders',
                    message:
                        'Feedback becomes available after an order is paid and completed, and each order can only receive feedback once.',
                  )
                else ...[
                  DropdownButtonFormField<OrderSummary>(
                    initialValue:
                        eligibleOrders.contains(_selectedOrder) ? _selectedOrder : null,
                    decoration: const InputDecoration(
                      labelText: 'Completed order',
                    ),
                    items: eligibleOrders
                        .map(
                          (order) => DropdownMenuItem<OrderSummary>(
                            value: order,
                            child: Text('#${order.id} - ${order.storeName}'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedOrder = value;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _messageController,
                    maxLines: 7,
                    decoration: const InputDecoration(
                      labelText: 'Feedback message',
                      hintText: 'Tell the store how the completed order experience went.',
                    ),
                    validator: (value) {
                      if ((value ?? '').trim().isEmpty) {
                        return 'Enter your feedback message';
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
                    label: Text(_submitting ? 'Sending...' : 'Send feedback'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
