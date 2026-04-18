import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../widgets/app_widgets.dart';
import 'dish_detail_screen.dart';

class DishesScreen extends StatefulWidget {
  const DishesScreen({super.key});

  @override
  State<DishesScreen> createState() => _DishesScreenState();
}

class _DishesScreenState extends State<DishesScreen> {
  final _searchController = TextEditingController();
  final _sorts = const ['top_rated', 'price_asc', 'price_desc', 'most_ordered'];
  String _selectedSort = 'top_rated';
  Future<List<DishCard>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).browseDishes();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final future = AppScope.of(context).browseDishes(
      search: _searchController.text.trim(),
      sort: _selectedSort,
    );
    setState(() {
      _future = future;
    });
    await future;
  }

  String _labelForSort(String sort) {
    switch (sort) {
      case 'price_asc':
        return 'Price: low to high';
      case 'price_desc':
        return 'Price: high to low';
      case 'most_ordered':
        return 'Best sellers';
      default:
        return 'Top rated';
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Dishes')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _reload(),
                  decoration: InputDecoration(
                    hintText: 'Search dishes, categories, or stores',
                    suffixIcon: IconButton(
                      onPressed: _reload,
                      icon: const Icon(Icons.search),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _sorts
                        .map(
                          (sort) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(_labelForSort(sort)),
                              selected: sort == _selectedSort,
                              onSelected: (_) {
                                setState(() => _selectedSort = sort);
                                _reload();
                              },
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<DishCard>>(
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
                final dishes = snapshot.data!;
                if (dishes.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: EmptyStateCard(
                      title: 'No dishes found',
                      message: 'Try a different keyword or sort option.',
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _reload,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
                    itemCount: dishes.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final dish = dishes[index];
                      return DishCardTile(
                        dish: dish,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => DishDetailScreen(dishId: dish.id),
                            ),
                          );
                        },
                        onQuickAdd: () async {
                          final store = dish.bestStore;
                          if (store == null) {
                            return;
                          }
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
                            SnackBar(content: Text('${dish.name} was added to the cart')),
                          );
                        },
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
