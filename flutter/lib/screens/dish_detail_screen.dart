import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';

class DishDetailScreen extends StatefulWidget {
  const DishDetailScreen({
    super.key,
    required this.dishId,
  });

  final int dishId;

  @override
  State<DishDetailScreen> createState() => _DishDetailScreenState();
}

class _DishDetailScreenState extends State<DishDetailScreen> {
  Future<DishDetail>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).loadDishDetail(widget.dishId);
  }

  Future<void> _reload() async {
    final future = AppScope.of(context).loadDishDetail(widget.dishId);
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiet mon')),
      body: FutureBuilder<DishDetail>(
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
          final dish = detail.dish;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  dish.imagePaths.isEmpty ? null : dish.imagePaths.first,
                ),
                height: 240,
                label: dish.name,
              ),
              const SizedBox(height: 18),
              Text(
                dish.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(dish.description),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(label: Formatters.currency(dish.price)),
                  MetricChip(label: '${Formatters.rating(detail.stats.averageRating)} sao'),
                  MetricChip(label: '${detail.stats.totalStock} stock'),
                ],
              ),
              const SizedBox(height: 18),
              if (dish.sections.isNotEmpty) ...[
                const SectionHeader(
                  title: 'Noi dung mon',
                  subtitle: 'Map tu dish.sections trong API.',
                ),
                const SizedBox(height: 12),
                ...dish.sections.map(
                  (section) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
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
                title: 'Store co san',
                subtitle: 'Chon store de them dung gia va ton kho.',
              ),
              const SizedBox(height: 12),
              ...detail.stores.map(
                (store) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      title: Text(
                        store.storeName,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text('${store.address}\n${store.stock} stock - ${Formatters.distance(store.distanceKm)}'),
                      isThreeLine: true,
                      trailing: FilledButton.tonal(
                        onPressed: () async {
                          try {
                            await controller.addToCart(
                              storeId: store.storeId,
                              storeName: store.storeName,
                              dishId: dish.id,
                              dishName: dish.name,
                              unitPrice: store.price,
                              imagePaths: dish.imagePaths,
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
                            SnackBar(content: Text('${dish.name} da duoc them vao gio hang')),
                          );
                        },
                        child: Text(Formatters.currency(store.price)),
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
