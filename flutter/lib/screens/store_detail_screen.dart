import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'dish_detail_screen.dart';
import 'user_review_editor_screen.dart';

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
  bool _favoriteBusy = false;

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

  Future<void> _toggleFavorite(StoreCard store) async {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn || _favoriteBusy) {
      return;
    }
    setState(() {
      _favoriteBusy = true;
    });
    try {
      final saved = await controller.toggleFavorite(
        targetType: 'STORE',
        targetId: store.id,
        targetLabel: store.name,
        targetImagePaths: store.imagePaths,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(saved
                ? 'Added to favorites'
                : 'Removed from favorites')),
      );
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
          _favoriteBusy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return FutureBuilder<StoreDetail>(
      future: _future,
      builder: (context, snapshot) {
        final detail = snapshot.data;
        final store = detail?.store;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Store details'),
            actions: [
              if (store != null && controller.isLoggedIn)
                IconButton(
                  onPressed:
                      _favoriteBusy ? null : () => _toggleFavorite(store),
                  icon: Icon(
                    controller.isFavorite('STORE', store.id)
                        ? Icons.favorite
                        : Icons.favorite_border,
                  ),
                  tooltip: 'Favorite',
                ),
            ],
          ),
          body: Builder(
            builder: (context) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError || detail == null) {
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: ErrorStateCard(
                    message: snapshot.error.toString(),
                    onRetry: _reload,
                  ),
                );
              }

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
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(store.address),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      MetricChip(
                          label:
                              '${Formatters.rating(detail.stats.averageRating)} stars'),
                      MetricChip(
                          label: '${detail.stats.availableItemCount} items ready'),
                      MetricChip(label: store.open ? 'Open now' : 'Temporarily closed'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(store.highlightSummary),
                  if (controller.isLoggedIn) ...[
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => UserReviewEditorScreen(
                              targetType: 'STORE',
                              targetId: store.id,
                              targetLabel: store.name,
                              targetImagePaths: store.imagePaths,
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.rate_review_outlined),
                      label: const Text('Write review'),
                    ),
                  ],
                  if (store.sections.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const SectionHeader(
                      title: 'Store story',
                      subtitle: 'Content sections mapped from store.sections.',
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
                                    imageUrl: controller.config
                                        .resolveImageUrl(section.imagePath),
                                    height: 150,
                                    label: section.title,
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                Text(
                                  section.title,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(height: 8),
                                Text(section.content),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  const SectionHeader(
                    title: 'Store menu',
                    subtitle:
                        'Focused on items that are easy to order quickly on mobile.',
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
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
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
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800),
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
                                          ScaffoldMessenger.of(context)
                                              .showSnackBar(
                                            SnackBar(
                                                content:
                                                    Text(error.toString())),
                                          );
                                          return;
                                        }
                                        if (!context.mounted) {
                                          return;
                                        }
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                              content: Text(
                                                  '${item.name} was added to the cart')),
                                        );
                                      },
                                      child:
                                          Text(Formatters.currency(item.price)),
                                    ),
                                    onTap: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute<void>(
                                          builder: (_) =>
                                              DishDetailScreen(dishId: item.id),
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
      },
    );
  }
}
