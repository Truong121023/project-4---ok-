import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';
import 'store_detail_screen.dart';

class LoyaltyLevelsScreen extends StatefulWidget {
  const LoyaltyLevelsScreen({super.key});

  @override
  State<LoyaltyLevelsScreen> createState() => _LoyaltyLevelsScreenState();
}

class _LoyaltyLevelsScreenState extends State<LoyaltyLevelsScreen> {
  Future<List<UserLevel>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= controller.loadUserLevels();
    }
  }

  Future<void> _refresh() async {
    final future = AppScope.of(context).loadUserLevels();
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Loyalty levels')),
      body: controller.isLoggedIn
          ? FutureBuilder<List<UserLevel>>(
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
                          title: 'Chua co level hien tai',
                          message: 'Sau khi chi tieu du o mot store, level theo quy se duoc hien tai day.',
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
                      final level = items[index];
                      return Card(
                        child: InkWell(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => StoreDetailScreen(
                                  storeKey: level.storeSlug.isEmpty ? level.storeId.toString() : level.storeSlug,
                                ),
                              ),
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        level.storeName,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(fontWeight: FontWeight.w800),
                                      ),
                                    ),
                                    MetricChip(label: level.levelName ?? 'Chua dat level'),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'So tien xet level: ${Formatters.currency(level.qualifyingPaidAmount)}',
                                ),
                                const SizedBox(height: 6),
                                if (level.levelMinPaidAmount != null)
                                  Text('Nguong toi thieu: ${Formatters.currency(level.levelMinPaidAmount!)}'),
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    MetricChip(label: 'Q${level.currentQuarter}/${level.currentYear}'),
                                    MetricChip(label: 'Xet tu Q${level.evaluatedQuarter}/${level.evaluatedYear}'),
                                  ],
                                ),
                              ],
                            ),
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
                message: 'Dang nhap de xem level hien tai cua ban theo tung store.',
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
