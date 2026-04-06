import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';
import 'user_review_editor_screen.dart';

class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key});

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  Future<List<UserReview>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= controller.loadUserReviews();
    }
  }

  Future<void> _refresh() async {
    final future = AppScope.of(context).loadUserReviews();
    setState(() {
      _future = future;
    });
    await future;
  }

  Future<void> _deleteReview(UserReview review) async {
    final controller = AppScope.of(context);
    try {
      await controller.deleteUserReview(review.id);
      if (!mounted) {
        return;
      }
      await _refresh();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Da xoa review')),
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
      appBar: AppBar(title: const Text('Review cua toi')),
      body: controller.isLoggedIn
          ? FutureBuilder<List<UserReview>>(
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
                final reviews = snapshot.data!;
                if (reviews.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: const [
                        EmptyStateCard(
                          title: 'Chua co review',
                          message: 'Vao store, dish hoac event detail de viet review theo dung doi tuong.',
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    itemCount: reviews.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final review = reviews[index];
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
                                      review.targetLabel,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(fontWeight: FontWeight.w800),
                                    ),
                                  ),
                                  MetricChip(label: '${review.rating.toStringAsFixed(1)} sao'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                review.title,
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 6),
                              Text(review.comment),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  MetricChip(label: review.approved ? 'Da duyet' : 'Cho duyet'),
                                  MetricChip(label: Formatters.shortDate(review.updatedAt ?? review.createdAt)),
                                ],
                              ),
                              const SizedBox(height: 14),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  OutlinedButton(
                                    onPressed: () async {
                                      final changed = await Navigator.of(context).push<bool>(
                                        MaterialPageRoute<bool>(
                                          builder: (_) => UserReviewEditorScreen(
                                            targetType: review.targetType,
                                            targetId: review.targetId,
                                            targetLabel: review.targetLabel,
                                            targetImagePaths: review.targetImagePaths,
                                            existing: review,
                                          ),
                                        ),
                                      );
                                      if (changed == true && mounted) {
                                        _refresh();
                                      }
                                    },
                                    child: const Text('Sua'),
                                  ),
                                  TextButton(
                                    onPressed: () => _deleteReview(review),
                                    child: const Text('Xoa'),
                                  ),
                                ],
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
                message: 'Dang nhap de quan ly cac review ban da gui.',
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
