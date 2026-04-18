import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app/app.dart';
import '../app/app_controller.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'cart_screen.dart';
import 'dish_detail_screen.dart';
import 'dishes_screen.dart';
import 'events_screen.dart';
import 'login_screen.dart';
import 'news_detail_screen.dart';
import 'news_list_screen.dart';
import 'notifications_screen.dart';
import 'store_detail_screen.dart';
import 'stores_screen.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  Future<_ExploreViewData>? _future;
  String? _lastSessionKey;
  String? _lastPrimaryAddressKey;
  late final PageController _storeCarouselController;
  late final PageController _dishCarouselController;
  late final PageController _eventCarouselController;
  late final PageController _newsCarouselController;
  int _storeCarouselIndex = 0;
  int _dishCarouselIndex = 0;
  int _eventCarouselIndex = 0;
  int _newsCarouselIndex = 0;

  @override
  void initState() {
    super.initState();
    _storeCarouselController = PageController(viewportFraction: 0.9);
    _dishCarouselController = PageController(viewportFraction: 0.9);
    _eventCarouselController = PageController(viewportFraction: 0.9);
    _newsCarouselController = PageController(viewportFraction: 0.9);
  }

  @override
  void dispose() {
    _storeCarouselController.dispose();
    _dishCarouselController.dispose();
    _eventCarouselController.dispose();
    _newsCarouselController.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _ensureFutureSynced();
  }

  void _ensureFutureSynced() {
    final controller = AppScope.of(context);
    final nextSessionKey = controller.session?.accessToken;
    final nextPrimaryAddressKey = _primaryAddressKey(controller.primaryDeliveryAddress);
    if (_future != null &&
        _lastSessionKey == nextSessionKey &&
        _lastPrimaryAddressKey == nextPrimaryAddressKey) {
      return;
    }
    _lastSessionKey = nextSessionKey;
    _lastPrimaryAddressKey = nextPrimaryAddressKey;
    _resetCarousels();
    _future = Future<_ExploreViewData>.microtask(_load);
  }

  Future<_ExploreViewData> _load() async {
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      await Future.wait([
        _ignorePreloadError(controller.loadUserNotificationUnreadCount()),
        _ignorePreloadError(controller.loadDeliveryAddresses()),
      ]);
      final primaryAddress = controller.primaryDeliveryAddress;
      if (!controller.config.useMockData &&
          primaryAddress != null &&
          !primaryAddress.hasCoordinates) {
        await _ignorePreloadError(
          controller.ensureDeliveryAddressCoordinates(primaryAddress.id),
        );
      }
    }

    final home = await controller.loadHome();
    final primaryAddress = controller.primaryDeliveryAddress;

    List<StoreCard> stores;
    try {
      stores = await controller.browseStores(
        sort: primaryAddress?.hasCoordinates == true
            ? 'distance_asc'
            : 'rating_desc',
        latitude: primaryAddress?.latitude,
        longitude: primaryAddress?.longitude,
      );
    } catch (_) {
      stores = List<StoreCard>.from(home.featuredStores);
    }

    return _ExploreViewData(
      brand: _displayBrand(home.brand),
      primaryAddress: primaryAddress,
      stores: _sortStoresByAddress(
        stores.isEmpty ? home.featuredStores : stores,
        primaryAddress,
      ).take(8).toList(),
      dishes: _sortSignatureDishes(home.featuredDishes).take(8).toList(),
      events: home.upcomingEvents.take(8).toList(),
      news: home.latestNews.take(8).toList(),
    );
  }

  Future<void> _ignorePreloadError(Future<dynamic> future) async {
    try {
      await future;
    } catch (_) {
      // Keep explore usable even if side requests fail.
    }
  }

  Future<void> _refresh() async {
    final future = Future<_ExploreViewData>.microtask(_load);
    setState(() {
      _resetCarousels();
      _future = future;
    });
    await future;
  }

  void _resetCarousels() {
    _storeCarouselIndex = 0;
    _dishCarouselIndex = 0;
    _eventCarouselIndex = 0;
    _newsCarouselIndex = 0;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      if (_storeCarouselController.hasClients) {
        _storeCarouselController.jumpToPage(0);
      }
      if (_dishCarouselController.hasClients) {
        _dishCarouselController.jumpToPage(0);
      }
      if (_eventCarouselController.hasClients) {
        _eventCarouselController.jumpToPage(0);
      }
      if (_newsCarouselController.hasClients) {
        _newsCarouselController.jumpToPage(0);
      }
    });
  }

  void _openNotifications(AppController controller) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => controller.isLoggedIn
            ? const NotificationsScreen()
            : const LoginScreen(),
      ),
    );
  }

  void _openCart() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const CartScreen()),
    );
  }

  Future<void> _addDishToCart(
    BuildContext context,
    AppController controller,
    DishCard dish,
  ) async {
    final bestStore = dish.bestStore;
    if (bestStore == null) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DishDetailScreen(dishId: dish.id),
        ),
      );
      return;
    }
    try {
      await controller.addToCart(
        storeId: bestStore.storeId,
        storeName: bestStore.storeName,
        dishId: dish.id,
        dishName: dish.name,
        unitPrice: bestStore.price,
        imagePaths: dish.imagePaths,
      );
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${dish.name} was added to the cart')),
      );
    } catch (error) {
      if (!context.mounted) {
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
    _ensureFutureSynced();
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return Scaffold(
          appBar: AppBar(
            title: const KamatchaBrandMark(
              compact: true,
              showSubtitle: false,
            ),
            actions: [
              IconButton(
                onPressed: () => _openNotifications(controller),
                tooltip: controller.isLoggedIn
                    ? 'Notice'
                    : 'Sign in to view notifications',
                icon: Badge(
                  isLabelVisible: controller.isLoggedIn &&
                      controller.userNotificationUnreadCount > 0,
                  label: Text('${controller.userNotificationUnreadCount}'),
                  child: const Icon(Icons.notifications_none_rounded),
                ),
              ),
              IconButton(
                onPressed: _openCart,
                tooltip: 'Cart',
                icon: Badge(
                  isLabelVisible: controller.cart.totalItems > 0,
                  label: Text('${controller.cart.totalItems}'),
                  child: const Icon(Icons.shopping_bag_outlined),
                ),
              ),
            ],
          ),
          body: FutureBuilder<_ExploreViewData>(
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
              return RefreshIndicator(
                onRefresh: _refresh,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                  children: [
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: KamatchaBrandMark(centered: true),
                      ),
                    ),
                    const SizedBox(height: 18),
                    _ExploreShortcutPanel(),
                    const SizedBox(height: 18),
                    _buildStoreSection(data),
                    const SizedBox(height: 18),
                    _buildDishSection(controller, data),
                    const SizedBox(height: 18),
                    _buildEventSection(data),
                    const SizedBox(height: 18),
                    _buildNewsSection(data),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildStoreSection(_ExploreViewData data) {
    return _ExploreSectionPanel(
      backgroundColor: const Color(0xFFF8FBF5),
      borderColor: const Color(0xFFDCE7D3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'Stores',
            subtitle: data.primaryAddress?.hasCoordinates == true
                ? 'Stores are prioritized using your default address.'
                : 'A curated list of highlighted stores right now.',
            actionLabel: 'All',
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const StoresScreen(),
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          _ExploreCarousel(
            controller: _storeCarouselController,
            itemCount: data.stores.length,
            currentIndex: _storeCarouselIndex,
            height: 350,
            onPageChanged: (index) {
              setState(() {
                _storeCarouselIndex = index;
              });
            },
            itemBuilder: (context, index) {
              final store = data.stores[index];
              return _ExploreStoreCard(
                store: store,
                distanceKm: _resolveStoreDistanceKm(store, data.primaryAddress),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => StoreDetailScreen(
                        storeKey: store.slug.isEmpty
                            ? store.id.toString()
                            : store.slug,
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildDishSection(AppController controller, _ExploreViewData data) {
    return _ExploreSectionPanel(
      backgroundColor: const Color(0xFFFFFBF3),
      borderColor: const Color(0xFFE8DECB),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'Dishes',
            subtitle:
                'Signature best sellers ready for quick detail view or add-to-cart.',
            actionLabel: 'All',
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const DishesScreen(),
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          _ExploreCarousel(
            controller: _dishCarouselController,
            itemCount: data.dishes.length,
            currentIndex: _dishCarouselIndex,
            height: 388,
            onPageChanged: (index) {
              setState(() {
                _dishCarouselIndex = index;
              });
            },
            itemBuilder: (context, index) {
              final dish = data.dishes[index];
              return _ExploreDishCard(
                dish: dish,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => DishDetailScreen(dishId: dish.id),
                    ),
                  );
                },
                onAddToCart: () => _addDishToCart(context, controller, dish),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildEventSection(_ExploreViewData data) {
    return _ExploreSectionPanel(
      backgroundColor: const Color(0xFFF9F7FC),
      borderColor: const Color(0xFFE2DCEF),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'Events',
            subtitle:
                'Open events and workshops currently getting attention.',
            actionLabel: 'All',
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const EventsScreen(),
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          _ExploreCarousel(
            controller: _eventCarouselController,
            itemCount: data.events.length,
            currentIndex: _eventCarouselIndex,
            height: 348,
            onPageChanged: (index) {
              setState(() {
                _eventCarouselIndex = index;
              });
            },
            itemBuilder: (context, index) {
              final event = data.events[index];
              return _ExploreEventCard(
                event: event,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => EventDetailScreen(eventKey: event.slug),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildNewsSection(_ExploreViewData data) {
    return _ExploreSectionPanel(
      backgroundColor: const Color(0xFFF7FAFC),
      borderColor: const Color(0xFFD7E3EB),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'News',
            subtitle: 'Latest brand updates and quick reads for mobile.',
            actionLabel: 'All',
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const NewsListScreen(),
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          _ExploreCarousel(
            controller: _newsCarouselController,
            itemCount: data.news.length,
            currentIndex: _newsCarouselIndex,
            height: 384,
            onPageChanged: (index) {
              setState(() {
                _newsCarouselIndex = index;
              });
            },
            itemBuilder: (context, index) {
              final news = data.news[index];
              return _ExploreNewsCard(
                news: news,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => NewsDetailScreen(newsKey: news.slug),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  List<DishCard> _sortSignatureDishes(List<DishCard> dishes) {
    final signatureDishes = dishes
        .where((dish) => _isSignatureDish(dish.categoryName))
        .toList();
    final items = signatureDishes.isEmpty ? [...dishes] : signatureDishes;
    items.sort((left, right) {
      final orderCompare = right.orderCount.compareTo(left.orderCount);
      if (orderCompare != 0) {
        return orderCompare;
      }
      final ratingCompare = right.averageRating.compareTo(left.averageRating);
      if (ratingCompare != 0) {
        return ratingCompare;
      }
      return left.name.toLowerCase().compareTo(right.name.toLowerCase());
    });
    return items;
  }

  List<StoreCard> _sortStoresByAddress(
    List<StoreCard> stores,
    DeliveryAddress? address,
  ) {
    final items = [...stores];
    items.sort((left, right) {
      final leftDistance = _resolveStoreDistanceKm(left, address);
      final rightDistance = _resolveStoreDistanceKm(right, address);
      final distanceCompare = (leftDistance ?? double.infinity)
          .compareTo(rightDistance ?? double.infinity);
      if (distanceCompare != 0) {
        return distanceCompare;
      }
      return right.averageRating.compareTo(left.averageRating);
    });
    return items;
  }

  bool _isSignatureDish(String categoryName) {
    final normalized = categoryName.trim().toUpperCase();
    return normalized == 'SIGNATURE' || normalized.contains('SIGNATURE');
  }

  String _primaryAddressKey(DeliveryAddress? address) {
    if (address == null) {
      return 'guest';
    }
    return [
      address.id,
      address.deliveryAddress.trim(),
      address.latitude?.toStringAsFixed(6) ?? 'na',
      address.longitude?.toStringAsFixed(6) ?? 'na',
      address.primary,
    ].join('|');
  }
}

class _ExploreShortcutPanel extends StatelessWidget {
  const _ExploreShortcutPanel();

  @override
  Widget build(BuildContext context) {
    return _ExploreSectionPanel(
      backgroundColor: const Color(0xFFFFFBF3),
      borderColor: const Color(0xFFE8DECB),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Explore categories',
            subtitle:
                'Choose the area you want to explore quickly; each section has its own data carousel below.',
          ),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.84,
            children: [
              ExploreShortcutCard(
                icon: Icons.storefront_outlined,
                title: 'Stores',
                subtitle: 'Branches, areas, opening hours, and stores near you.',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const StoresScreen(),
                    ),
                  );
                },
              ),
              ExploreShortcutCard(
                icon: Icons.ramen_dining_outlined,
                title: 'Dishes',
                subtitle: 'Signature items, current prices, and quick add-to-cart.',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const DishesScreen(),
                    ),
                  );
                },
              ),
              ExploreShortcutCard(
                icon: Icons.celebration_outlined,
                title: 'Events',
                subtitle: 'Events, workshops, and pop-ups that are open for registration.',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const EventsScreen(),
                    ),
                  );
                },
              ),
              ExploreShortcutCard(
                icon: Icons.article_outlined,
                title: 'News',
                subtitle: 'Latest articles, guides, and updates from the brand.',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const NewsListScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExploreSectionPanel extends StatelessWidget {
  const _ExploreSectionPanel({
    required this.child,
    required this.backgroundColor,
    required this.borderColor,
  });

  final Widget child;
  final Color backgroundColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: child,
      ),
    );
  }
}

class _ExploreCarousel extends StatelessWidget {
  const _ExploreCarousel({
    required this.controller,
    required this.itemCount,
    required this.currentIndex,
    required this.height,
    required this.onPageChanged,
    required this.itemBuilder,
  });

  final PageController controller;
  final int itemCount;
  final int currentIndex;
  final double height;
  final ValueChanged<int> onPageChanged;
  final Widget Function(BuildContext context, int index) itemBuilder;

  @override
  Widget build(BuildContext context) {
    if (itemCount == 0) {
      return const EmptyStateCard(
        title: 'No data yet',
        message: 'Content will appear here when the backend returns matching data.',
      );
    }
    return Column(
      children: [
        SizedBox(
          height: height,
          child: PageView.builder(
            controller: controller,
            itemCount: itemCount,
            onPageChanged: onPageChanged,
            itemBuilder: (context, index) => Padding(
              padding: EdgeInsets.only(
                right: index == itemCount - 1 ? 0 : 10,
              ),
              child: itemBuilder(context, index),
            ),
          ),
        ),
        if (itemCount > 1) ...[
          const SizedBox(height: 12),
          _CarouselDots(
            itemCount: itemCount,
            currentIndex: currentIndex,
          ),
        ],
      ],
    );
  }
}

class _CarouselDots extends StatelessWidget {
  const _CarouselDots({
    required this.itemCount,
    required this.currentIndex,
  });

  final int itemCount;
  final int currentIndex;

  @override
  Widget build(BuildContext context) {
    final activeIndex = itemCount == 0
        ? 0
        : currentIndex.clamp(0, itemCount - 1);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(itemCount, (index) {
        final isActive = index == activeIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          height: 8,
          width: isActive ? 20 : 8,
          decoration: BoxDecoration(
            color: isActive
                ? const Color(0xFF17332A)
                : const Color(0xFFD6DEC9),
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
    );
  }
}

class _ExploreStoreCard extends StatelessWidget {
  const _ExploreStoreCard({
    required this.store,
    required this.distanceKm,
    required this.onTap,
  });

  final StoreCard store;
  final double? distanceKm;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  store.imagePaths.isEmpty ? null : store.imagePaths.first,
                ),
                height: 124,
                label: store.name,
              ),
              const SizedBox(height: 10),
              Text(
                store.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                store.highlightSummary.isEmpty
                    ? store.address
                    : store.highlightSummary,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  MetricChip(
                    label: store.open ? 'Open now' : 'Temporarily closed',
                    backgroundColor: store.open
                        ? const Color(0xFFE8F0E0)
                        : const Color(0xFFF6E3DE),
                    foregroundColor: store.open
                        ? const Color(0xFF17332A)
                        : const Color(0xFF8A463A),
                  ),
                  MetricChip(label: Formatters.distance(distanceKm)),
                  MetricChip(
                    label: '${Formatters.rating(store.averageRating)} stars',
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${store.area} - ${store.availableItemCount} items available',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExploreDishCard extends StatelessWidget {
  const _ExploreDishCard({
    required this.dish,
    required this.onTap,
    required this.onAddToCart,
  });

  final DishCard dish;
  final VoidCallback onTap;
  final VoidCallback onAddToCart;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final bestStore = dish.bestStore;
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                NetworkOrFallbackImage(
                  imageUrl: controller.config.resolveImageUrl(
                    dish.imagePaths.isEmpty ? null : dish.imagePaths.first,
                  ),
                  height: 104,
                  label: dish.name,
                ),
                const SizedBox(height: 8),
                Text(
                  dish.name,
                  maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      height: 1.12,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                dish.highlightSummary.isEmpty
                    ? dish.description
                    : dish.highlightSummary,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
              ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    MetricChip(label: '${Formatters.compact(dish.orderCount)} sold'),
                    MetricChip(label: '${Formatters.rating(dish.averageRating)} stars'),
                    if (bestStore != null)
                      MetricChip(
                        label: bestStore.storeName,
                        icon: Icons.storefront_outlined,
                        maxWidth: 156,
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  Formatters.currency(bestStore?.price ?? dish.price),
                  style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Spacer(),
                    IconButton.filled(
                      onPressed: onAddToCart,
                      tooltip: 'Add to cart',
                      style: IconButton.styleFrom(
                        minimumSize: const Size.square(38),
                      ),
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ),
    );
  }
}

class _ExploreEventCard extends StatelessWidget {
  const _ExploreEventCard({
    required this.event,
    required this.onTap,
  });

  final EventCard event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                NetworkOrFallbackImage(
                  imageUrl: controller.config.resolveImageUrl(
                    event.imagePaths.isEmpty ? null : event.imagePaths.first,
                  ),
                  height: 116,
                  label: event.name,
                ),
                const SizedBox(height: 8),
                Text(
                  event.name,
                  maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                event.highlightSummary,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
              ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                children: [
                  MetricChip(label: event.storeName, maxWidth: 210),
                  MetricChip(label: event.scheduleText),
                  MetricChip(
                    label: event.remainingSlots > 0
                        ? '${event.remainingSlots} cho'
                        : 'Updating',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExploreNewsCard extends StatelessWidget {
  const _ExploreNewsCard({
    required this.news,
    required this.onTap,
  });

  final NewsCard news;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  news.imagePaths.isEmpty ? null : news.imagePaths.first,
                ),
                height: 124,
                label: news.title,
              ),
              const SizedBox(height: 10),
              Text(
                news.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                news.summary,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (news.relatedStoreName.trim().isNotEmpty)
                    MetricChip(label: news.relatedStoreName, maxWidth: 210),
                  MetricChip(label: Formatters.shortDate(news.publishedAt)),
                  if (news.featured) const MetricChip(label: 'Featured'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExploreViewData {
  const _ExploreViewData({
    required this.brand,
    required this.primaryAddress,
    required this.stores,
    required this.dishes,
    required this.events,
    required this.news,
  });

  final String brand;
  final DeliveryAddress? primaryAddress;
  final List<StoreCard> stores;
  final List<DishCard> dishes;
  final List<EventCard> events;
  final List<NewsCard> news;
}

String _displayBrand(String rawBrand) {
  final trimmed = rawBrand.trim();
  if (trimmed.isEmpty) {
    return 'Kamatcha';
  }
  return trimmed;
}

double? _resolveStoreDistanceKm(
  StoreCard store,
  DeliveryAddress? address,
) {
  if (address != null &&
      address.hasCoordinates &&
      store.latitude != null &&
      store.longitude != null) {
    return _haversineKm(
      address.latitude!,
      address.longitude!,
      store.latitude!,
      store.longitude!,
    );
  }
  return store.distanceKm;
}

double _haversineKm(
  double startLat,
  double startLng,
  double endLat,
  double endLng,
) {
  const earthRadiusKm = 6371.0;
  final dLat = _degreesToRadians(endLat - startLat);
  final dLng = _degreesToRadians(endLng - startLng);
  final lat1 = _degreesToRadians(startLat);
  final lat2 = _degreesToRadians(endLat);
  final a = math.pow(math.sin(dLat / 2), 2) +
      math.pow(math.sin(dLng / 2), 2) * math.cos(lat1) * math.cos(lat2);
  final c = 2 *
      math.atan2(math.sqrt(a.toDouble()), math.sqrt(1 - a.toDouble()));
  return earthRadiusKm * c;
}

double _degreesToRadians(double value) => value * math.pi / 180;
