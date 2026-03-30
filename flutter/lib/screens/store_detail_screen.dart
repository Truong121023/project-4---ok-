import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'dish_detail_screen.dart';

class StoreDetailScreen extends StatefulWidget {
  const StoreDetailScreen({
    super.key,
    required this.storeKey,
  });

  final String storeKey;

  @override
  State<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends State<StoreDetailScreen> {
  Future<StoreDetail>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).loadStoreDetail(widget.storeKey);
  }

  Future<void> _reload() async {
    final future = AppScope.of(context).loadStoreDetail(widget.storeKey);
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiet store')),
      body: FutureBuilder<StoreDetail>(
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
                onRetry: _reload,
              ),
            );
          }

          final detail = snapshot.data!;
          final store = detail.store;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  store.imagePaths.isEmpty ? null : store.imagePaths.first,
                ),
                height: 230,
                label: store.name,
              ),
              const SizedBox(height: 18),
              Text(
                store.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(store.address),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(label: '${Formatters.rating(detail.stats.averageRating)} sao'),
                  MetricChip(label: '${detail.stats.availableItemCount} mon san'),
                  MetricChip(label: store.open ? 'Dang mo' : 'Sap mo lai'),
                ],
              ),
              const SizedBox(height: 16),
              Text(store.highlightSummary),
              const SizedBox(height: 24),
              if (store.sections.isNotEmpty) ...[
                const SectionHeader(
                  title: 'Khong gian',
                  subtitle: 'Noi dung section duoc map tu store.sections.',
                ),
                const SizedBox(height: 12),
                ...store.sections.map(
                  (section) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (section.imagePath != null) ...[
                              NetworkOrFallbackImage(
                                imageUrl: controller.config.resolveImageUrl(section.imagePath),
                                height: 150,
                                label: section.title,
                              ),
                              const SizedBox(height: 12),
                            ],
                            Text(
                              section.title,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Text(section.content),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              const SectionHeader(
                title: 'Menu tai store',
                subtitle: 'Tap trung vao mon co the order nhanh tren mobile.',
              ),
              const SizedBox(height: 12),
              ...detail.categories.map(
                (category) => Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            category.title,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 6),
                          Text(category.description),
                          const SizedBox(height: 14),
                          ...category.items.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(
                                  item.name,
                                  style: const TextStyle(fontWeight: FontWeight.w800),
                                ),
                                subtitle: Text(item.description),
                                trailing: FilledButton.tonal(
                                  onPressed: () async {
                                    try {
                                      await controller.addToCart(
                                        storeId: store.id,
                                        storeName: store.name,
                                        dishId: item.id,
                                        dishName: item.name,
                                        unitPrice: item.price,
                                        imagePaths: item.imagePaths,
                                      );
                                    } catch (error) {
                                      if (!context.mounted) {
                                        return;
                                      }
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text(error.toString())),
                                      );
                                      return;
                                    }
                                    if (!context.mounted) {
                                      return;
                                    }
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('${item.name} da duoc them vao gio hang')),
                                    );
                                  },
                                  child: Text(Formatters.currency(item.price)),
                                ),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => DishDetailScreen(dishId: item.id),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
