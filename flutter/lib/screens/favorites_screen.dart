import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../widgets/app_widgets.dart';
import 'dish_detail_screen.dart';
import 'events_screen.dart';
import 'login_screen.dart';
import 'store_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  String? _filter;
  Future<List<FavoriteItem>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= _load();
    }
  }

  Future<List<FavoriteItem>> _load() {
    return AppScope.of(context).loadFavorites(targetType: _filter);
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() {
      _future = future;
    });
    await future;
  }

  void _openFavorite(FavoriteItem item) {
    if (item.targetType == 'STORE') {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => StoreDetailScreen(
            storeKey: item.targetSlug ?? item.targetId.toString(),
          ),
        ),
      );
      return;
    }
    if (item.targetType == 'DISH') {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DishDetailScreen(dishId: item.targetId),
        ),
      );
      return;
    }
    if (item.targetType == 'EVENT') {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              EventDetailScreen(eventKey: item.targetSlug ?? item.targetId.toString()),
        ),
      );
    }
  }

  Future<void> _removeFavorite(FavoriteItem item) async {
    final controller = AppScope.of(context);
    try {
      await controller.toggleFavorite(
        targetType: item.targetType,
        targetId: item.targetId,
      );
      if (!mounted) {
        return;
      }
      await _refresh();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Removed from favorites')),
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
      appBar: AppBar(title: const Text('Favorites')),
      body: controller.isLoggedIn
          ? Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('All'),
                        selected: _filter == null,
                        onSelected: (_) {
                          setState(() {
                            _filter = null;
                          });
                          _refresh();
                        },
                      ),
                      ...const ['STORE', 'DISH', 'EVENT'].map(
                        (item) => ChoiceChip(
                          label: Text(item),
                          selected: _filter == item,
                          onSelected: (_) {
                            setState(() {
                              _filter = item;
                            });
                            _refresh();
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: FutureBuilder<List<FavoriteItem>>(
                    future: _future,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState != ConnectionState.done &&
                          controller.favoriteItems.isEmpty) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      if (snapshot.hasError && controller.favoriteItems.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.all(16),
                          child: ErrorStateCard(
                            message: snapshot.error.toString(),
                            onRetry: _refresh,
                          ),
                        );
                      }
                      final items = snapshot.data ?? controller.favoriteItems;
                      if (items.isEmpty) {
                        return RefreshIndicator(
                          onRefresh: _refresh,
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: const [
                              EmptyStateCard(
                                title: 'No favorites yet',
                                message:
                                    'You can add stores, dishes, or events from their detail screens.',
                              ),
                            ],
                          ),
                        );
                      }
                      return RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                          itemCount: items.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final item = items[index];
                            return Card(
                              child: ListTile(
                                contentPadding: const EdgeInsets.all(16),
                                leading: SizedBox(
                                  width: 56,
                                  child: NetworkOrFallbackImage(
                                    imageUrl: controller.config.resolveImageUrl(
                                      item.targetImagePaths.isEmpty
                                          ? null
                                          : item.targetImagePaths.first,
                                    ),
                                    height: 56,
                                    borderRadius: BorderRadius.circular(16),
                                    label: item.targetType,
                                  ),
                                ),
                                title: Text(
                                  item.targetLabel,
                                  style: const TextStyle(fontWeight: FontWeight.w800),
                                ),
                                subtitle: Text(
                                  item.purchased
                                      ? '${item.targetType} • Purchased'
                                      : item.targetType,
                                ),
                                trailing: IconButton(
                                  onPressed: () => _removeFavorite(item),
                                  icon: const Icon(Icons.favorite),
                                  tooltip: 'Remove favorite',
                                ),
                                onTap: () => _openFavorite(item),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            )
          : Padding(
              padding: const EdgeInsets.all(16),
              child: EmptyStateCard(
                title: 'Sign in required',
                message:
                    'Sign in to save and sync your favorite stores, dishes, and events.',
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
