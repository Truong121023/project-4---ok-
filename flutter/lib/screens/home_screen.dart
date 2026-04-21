import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/app.dart';
import '../app/app_controller.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'cart_screen.dart';
import 'checkout_screen.dart';
import 'dish_detail_screen.dart';
import 'dishes_screen.dart';
import 'login_screen.dart';
import 'loyalty_levels_screen.dart';
import 'notifications_screen.dart';
import 'store_detail_screen.dart';
import 'stores_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<_HomeViewData>? _future;
  String? _lastSessionKey;
  String? _lastPrimaryAddressKey;
  late final PageController _promotionCarouselController;
  late final PageController _storeCarouselController;
  int _promotionCarouselIndex = 0;
  int _storeCarouselIndex = 0;

  @override
  void initState() {
    super.initState();
    _promotionCarouselController = PageController(viewportFraction: 0.9);
    _storeCarouselController = PageController(viewportFraction: 0.9);
  }

  @override
  void dispose() {
    _promotionCarouselController.dispose();
    _storeCarouselController.dispose();
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
    _resetHomeCarousels();
    _future = Future<_HomeViewData>.microtask(_load);
  }

  Future<_HomeViewData> _load() async {
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
    final voucherPromotions = controller.isLoggedIn
        ? await controller.loadUserVouchers()
        : home.promotions;
    final primaryAddress = controller.primaryDeliveryAddress;

    List<StoreCard> nearbyStores;
    try {
      nearbyStores = await controller.browseStores(
        sort: primaryAddress?.hasCoordinates == true
            ? 'distance_asc'
            : 'rating_desc',
        latitude: primaryAddress?.latitude,
        longitude: primaryAddress?.longitude,
      );
    } catch (_) {
      nearbyStores = List<StoreCard>.from(home.featuredStores);
    }

    return _HomeViewData(
      home: home,
      promotions: voucherPromotions,
      signatureDishes: _sortSignatureDishes(home.featuredDishes),
      nearbyStores:
          _sortStoresByAddress(nearbyStores.isEmpty ? home.featuredStores : nearbyStores, primaryAddress)
              .take(6)
              .toList(),
      primaryAddress: primaryAddress,
    );
  }

  Future<void> _ignorePreloadError(Future<dynamic> future) async {
    try {
      await future;
    } catch (_) {
      // Keep home usable even if a side request fails.
    }
  }

  Future<void> _refresh() async {
    final future = Future<_HomeViewData>.microtask(_load);
    setState(() {
      _resetHomeCarousels();
      _future = future;
    });
    await future;
  }

  void _resetHomeCarousels() {
    _promotionCarouselIndex = 0;
    _storeCarouselIndex = 0;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      if (_promotionCarouselController.hasClients) {
        _promotionCarouselController.jumpToPage(0);
      }
      if (_storeCarouselController.hasClients) {
        _storeCarouselController.jumpToPage(0);
      }
    });
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

  Future<void> _copyPromotionCode(
    BuildContext context,
    PromotionCard promotion,
  ) async {
    await Clipboard.setData(ClipboardData(text: promotion.code));
    if (!context.mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Copied code ${promotion.code}')),
    );
  }

  Future<void> _openPromotionAction(
    BuildContext context,
    AppController controller,
    PromotionCard promotion,
  ) async {
    if (!controller.isLoggedIn) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      );
      return;
    }
    if (controller.cart.items.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              CheckoutScreen(initialPromotionCode: promotion.code),
        ),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const DishesScreen()),
    );
  }

  String _promotionActionLabel(
    AppController controller,
    PromotionCard promotion,
  ) {
    if (!controller.isLoggedIn) {
      return 'Sign in';
    }
    if (controller.cart.items.isNotEmpty) {
      return 'Use at checkout';
    }
    return 'Browse menu';
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

  void _openLoyaltyOrLogin(AppController controller) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => controller.isLoggedIn
            ? const LoyaltyLevelsScreen()
            : const LoginScreen(),
      ),
    );
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
            title: const Text('Kamatcha'),
            actions: [
              IconButton(
                onPressed: () => _openNotifications(controller),
                tooltip: controller.isLoggedIn
                    ? 'Notifications'
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
          body: FutureBuilder<_HomeViewData>(
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
                final home = data.home;
                final promotions = data.promotions;
                final creditPoints = controller.session?.user.creditPoints ?? 0;
              final screenWidth = MediaQuery.sizeOf(context).width;
              final compactHome = screenWidth < 390;
              final promotionCarouselHeight = compactHome ? 548.0 : 500.0;
              final storeCarouselHeight = compactHome ? 548.0 : 520.0;
              final signaturePreview = data.signatureDishes.take(6).toList();

              return RefreshIndicator(
                onRefresh: _refresh,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                  children: [
                    _HomeHeroBanner(
                      brand: _displayBrand(home.brand),
                      loggedIn: controller.isLoggedIn,
                      signatureCount: data.signatureDishes.length,
                      promotionCount: promotions.length,
                      storeCount: data.nearbyStores.length,
                      primaryAddress: data.primaryAddress,
                      creditPoints: creditPoints,
                      onPrimaryAction: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => controller.cart.totalItems > 0
                                ? const CartScreen()
                                : const DishesScreen(),
                          ),
                        );
                      },
                      onSecondaryAction: () => _openLoyaltyOrLogin(controller),
                    ),
                    const SizedBox(height: 20),
                    _HomeSectionPanel(
                      backgroundColor: const Color(0xFFFFFBF3),
                      borderColor: const Color(0xFFE8DECB),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SectionHeader(
                            title: 'Voucher codes and membership',
                            subtitle:
                                'Each code follows a simple rule: order, dishes, or shipping. The app checks membership, minimum order, and maximum discount automatically.',
                            actionLabel:
                                controller.isLoggedIn
                                    ? 'View membership'
                                    : 'Sign in',
                            onTap: () => _openLoyaltyOrLogin(controller),
                          ),
                          const SizedBox(height: 14),
                          _CreditOverviewCard(
                            loggedIn: controller.isLoggedIn,
                            creditPoints: creditPoints,
                            onTap: () => _openLoyaltyOrLogin(controller),
                          ),
                          const SizedBox(height: 12),
                          if (promotions.isEmpty)
                            const EmptyStateCard(
                              title: 'No active codes',
                              message:
                                  'New voucher codes will appear here as soon as they are published.',
                            )
                          else
                            SizedBox(
                              height: promotionCarouselHeight,
                              child: PageView.builder(
                                controller: _promotionCarouselController,
                                itemCount: promotions.length,
                                onPageChanged: (index) {
                                  if (_promotionCarouselIndex == index) {
                                    return;
                                  }
                                  setState(() {
                                    _promotionCarouselIndex = index;
                                  });
                                },
                                itemBuilder: (context, index) {
                                  final promotion = promotions[index];
                                  return Padding(
                                    padding: EdgeInsets.only(
                                      right: index == promotions.length - 1
                                          ? 0
                                          : 12,
                                    ),
                                    child: _ResponsivePromotionHomeCard(
                                      promotion: promotion,
                                      actionLabel: _promotionActionLabel(
                                        controller,
                                        promotion,
                                      ),
                                      onCopyCode: () =>
                                          _copyPromotionCode(context, promotion),
                                      onUseNow: () => _openPromotionAction(
                                        context,
                                        controller,
                                        promotion,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          if (promotions.length > 1) ...[
                            const SizedBox(height: 10),
                            _CarouselDots(
                              itemCount: promotions.length,
                              currentIndex: _promotionCarouselIndex,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    _HomeSectionPanel(
                      backgroundColor: const Color(0xFFF9F3E7),
                      borderColor: const Color(0xFFE4D7BF),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SectionHeader(
                            title: 'Nearby stores',
                            subtitle: data.primaryAddress?.hasCoordinates == true
                                ? 'Sorted using your current default address.'
                                : controller.isLoggedIn
                                    ? 'Add or update coordinates for the default address to improve sorting accuracy.'
                                    : 'Sign in and add a default address to get nearby store suggestions.',
                            actionLabel: 'View all',
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => const StoresScreen(),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 14),
                          if (controller.isLoggedIn && data.primaryAddress == null)
                            const Padding(
                              padding: EdgeInsets.only(bottom: 12),
                              child: SoftInfoBanner(
                                message:
                                    'You do not have a default address yet, so stores are sorted by rating.',
                                icon: Icons.location_on_outlined,
                              ),
                            ),
                          if (data.primaryAddress != null &&
                              !data.primaryAddress!.hasCoordinates)
                            const Padding(
                              padding: EdgeInsets.only(bottom: 12),
                              child: SoftInfoBanner(
                                message:
                                    'The app will try to resolve coordinates from your default address. If that is not enough, edit the address with more detail to sort nearby stores better.',
                                icon: Icons.location_searching_outlined,
                              ),
                            ),
                          if (data.nearbyStores.isEmpty)
                            const EmptyStateCard(
                              title: 'No stores to show yet',
                              message:
                                  'Stores will appear here once the catalog data is ready.',
                            )
                          else
                            SizedBox(
                              height: storeCarouselHeight,
                              child: PageView.builder(
                                controller: _storeCarouselController,
                                itemCount: data.nearbyStores.length,
                                onPageChanged: (index) {
                                  if (_storeCarouselIndex == index) {
                                    return;
                                  }
                                  setState(() {
                                    _storeCarouselIndex = index;
                                  });
                                },
                                itemBuilder: (context, index) {
                                  final store = data.nearbyStores[index];
                                  return Padding(
                                    padding: EdgeInsets.only(
                                      right: index == data.nearbyStores.length - 1
                                          ? 0
                                          : 12,
                                    ),
                                    child: _ResponsiveNearbyStoreCard(
                                      store: store,
                                      distanceKm: _resolveStoreDistanceKm(
                                        store,
                                        data.primaryAddress,
                                      ),
                                      onTap: () {
                                        Navigator.of(context).push(
                                          MaterialPageRoute<void>(
                                            builder: (_) => StoreDetailScreen(
                                              storeKey: store.slug,
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  );
                                },
                              ),
                            ),
                          if (data.nearbyStores.length > 1) ...[
                            const SizedBox(height: 10),
                            _CarouselDots(
                              itemCount: data.nearbyStores.length,
                              currentIndex: _storeCarouselIndex,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    _HomeSectionPanel(
                      backgroundColor: const Color(0xFFF4F8EE),
                      borderColor: const Color(0xFFDCE6CF),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SectionHeader(
                            title: 'Signature best sellers',
                            subtitle:
                                'These signature items are selling best right now and can be added to the cart immediately.',
                            actionLabel: 'View menu',
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => const DishesScreen(),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 14),
                          if (signaturePreview.isEmpty)
                            const EmptyStateCard(
                              title: 'No signature items yet',
                              message:
                                  'As signature items are added, they will be prioritized here first.',
                            )
                          else
                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: signaturePreview.length,
                              gridDelegate:
                                  SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                mainAxisExtent: compactHome ? 352 : 360,
                              ),
                              itemBuilder: (context, index) {
                                final dish = signaturePreview[index];
                                return _SignatureDishCard(
                                  dish: dish,
                                  compact: true,
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) => DishDetailScreen(
                                          dishId: dish.id,
                                        ),
                                      ),
                                    );
                                  },
                                  onAddToCart: () =>
                                      _addDishToCart(context, controller, dish),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
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
      final favoriteCompare =
          right.favoriteCount.compareTo(left.favoriteCount);
      if (favoriteCompare != 0) {
        return favoriteCompare;
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
}

String _displayBrand(String rawBrand) {
  final trimmed = rawBrand.trim();
  if (trimmed.isEmpty) {
    return 'Kamatcha';
  }
  return trimmed;
}

class _HomeViewData {
  const _HomeViewData({
    required this.home,
    required this.promotions,
    required this.signatureDishes,
    required this.nearbyStores,
    required this.primaryAddress,
  });

  final HomeBundle home;
  final List<PromotionCard> promotions;
  final List<DishCard> signatureDishes;
  final List<StoreCard> nearbyStores;
  final DeliveryAddress? primaryAddress;
}

class _HomeSectionPanel extends StatelessWidget {
  const _HomeSectionPanel({
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
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F17332A),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: child,
      ),
    );
  }
}

class _HomeHeroBanner extends StatelessWidget {
  const _HomeHeroBanner({
    required this.brand,
    required this.loggedIn,
    required this.signatureCount,
    required this.promotionCount,
    required this.storeCount,
    required this.primaryAddress,
    required this.creditPoints,
    required this.onPrimaryAction,
    required this.onSecondaryAction,
  });

  final String brand;
  final bool loggedIn;
  final int signatureCount;
  final int promotionCount;
  final int storeCount;
  final DeliveryAddress? primaryAddress;
  final int creditPoints;
  final VoidCallback onPrimaryAction;
  final VoidCallback onSecondaryAction;

  @override
  Widget build(BuildContext context) {
    final hasAddress = primaryAddress != null;
    final hasCoordinates = primaryAddress?.hasCoordinates ?? false;
    final theme = Theme.of(context);
    return Card(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF17332A), Color(0xFF4E6F59)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.all(Radius.circular(24)),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 360;
            final titleStyle = (compact
                    ? theme.textTheme.titleMedium
                    : theme.textTheme.titleLarge)
                ?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  height: 1.12,
                );
            final bodyStyle = theme.textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.92),
              fontWeight: FontWeight.w600,
              height: 1.3,
            );
            final primaryButton = FilledButton.icon(
              onPressed: onPrimaryAction,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(46),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                textStyle: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.0,
                ),
              ),
              icon: const Icon(Icons.shopping_bag_outlined, size: 18),
              label: const Text('Explore'),
            );
            final secondaryButton = OutlinedButton.icon(
              onPressed: onSecondaryAction,
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(46),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                textStyle: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.0,
                ),
                side: BorderSide(
                  color: Colors.white.withValues(alpha: 0.35),
                ),
              ),
              icon: Icon(
                loggedIn
                    ? Icons.workspace_premium_outlined
                    : Icons.login_outlined,
                size: 18,
              ),
              label: Text(loggedIn ? 'Level and credits' : 'Sign in'),
            );
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _HeroChip(label: brand),
                    _HeroChip(label: loggedIn ? 'Signed in' : 'Guest'),
                    _HeroChip(
                      label: hasCoordinates
                          ? 'Delivery coordinates available'
                          : hasAddress
                              ? 'Delivery coordinates missing'
                              : 'No default address',
                    ),
                    if (loggedIn && creditPoints > 0)
                      _HeroChip(label: '$creditPoints credits'),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'Signature items, vouchers, and nearby stores are all gathered here.',
                  style: titleStyle,
                ),
                const SizedBox(height: 6),
                Text(
                  hasCoordinates
                      ? 'Stores are prioritized using your default address so you can choose items faster.'
                      : loggedIn
                          ? 'Add coordinates to the default address for more accurate nearby-store suggestions.'
                          : 'Sign in to follow notifications, loyalty points, and nearby store suggestions.',
                  maxLines: compact ? 3 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: bodyStyle,
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _HeroChip(label: '$signatureCount items'),
                    _HeroChip(label: '$promotionCount voucher'),
                    _HeroChip(label: '$storeCount stores'),
                  ],
                ),
                const SizedBox(height: 12),
                if (compact) ...[
                  SizedBox(width: double.infinity, child: primaryButton),
                  const SizedBox(height: 8),
                  SizedBox(width: double.infinity, child: secondaryButton),
                ] else
                  Row(
                    children: [
                      Expanded(child: primaryButton),
                      const SizedBox(width: 10),
                      Expanded(child: secondaryButton),
                    ],
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                height: 1.0,
              ),
        ),
      ),
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

class _SignatureDishCard extends StatelessWidget {
  const _SignatureDishCard({
    required this.dish,
    required this.onTap,
    required this.onAddToCart,
    this.compact = false,
  });

  final DishCard dish;
  final VoidCallback onTap;
  final VoidCallback onAddToCart;
  final bool compact;

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
          padding: EdgeInsets.all(compact ? 12 : 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  dish.imagePaths.isEmpty ? null : dish.imagePaths.first,
                ),
                height: compact ? 84 : 120,
                label: dish.name,
              ),
              SizedBox(height: compact ? 8 : 12),
              Text(
                dish.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: (compact
                        ? theme.textTheme.titleSmall
                        : theme.textTheme.titleMedium)
                    ?.copyWith(
                      fontWeight: FontWeight.w900,
                      height: 1.12,
                    ),
              ),
              SizedBox(height: compact ? 4 : 6),
              Text(
                dish.highlightSummary.isEmpty
                    ? dish.description
                    : dish.highlightSummary,
                maxLines: compact ? 1 : 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                ),
              ),
              SizedBox(height: compact ? 6 : 12),
              Wrap(
                spacing: 8,
                runSpacing: compact ? 6 : 8,
                children: [
                  MetricChip(
                    label: '${Formatters.compact(dish.orderCount)} sold',
                    padding: EdgeInsets.symmetric(
                      horizontal: compact ? 10 : 12,
                      vertical: compact ? 6 : 8,
                    ),
                  ),
                  MetricChip(
                    label: '${Formatters.rating(dish.averageRating)} stars',
                    padding: EdgeInsets.symmetric(
                      horizontal: compact ? 10 : 12,
                      vertical: compact ? 6 : 8,
                    ),
                  ),
                  if (bestStore != null && !compact)
                    MetricChip(
                      label: bestStore.storeName,
                      icon: Icons.storefront_outlined,
                      maxWidth: 220,
                    ),
                ],
              ),
              SizedBox(height: compact ? 8 : 12),
              Text(
                Formatters.currency(bestStore?.price ?? dish.price),
                style: (compact
                        ? theme.textTheme.titleMedium
                        : theme.textTheme.titleLarge)
                    ?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              if (compact) const Spacer(),
              SizedBox(height: compact ? 6 : 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton.filled(
                    onPressed: onAddToCart,
                    tooltip: 'Add to cart',
                    style: IconButton.styleFrom(
                      minimumSize: Size.square(compact ? 38 : 42),
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

class _CreditOverviewCard extends StatelessWidget {
  const _CreditOverviewCard({
    required this.loggedIn,
    required this.creditPoints,
    required this.onTap,
  });

  final bool loggedIn;
  final int creditPoints;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final iconBox = Container(
              height: 48,
              width: 48,
              decoration: BoxDecoration(
                color: const Color(0xFFE8F0E0),
                borderRadius: BorderRadius.circular(18),
              ),
              alignment: Alignment.center,
              child: const Icon(
                Icons.workspace_premium_outlined,
                color: Color(0xFF17332A),
              ),
            );
            final summary = Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  loggedIn
                      ? 'Membership status'
                      : 'Sign in to view membership',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  loggedIn
                      ? '$creditPoints points are recorded on your account. Voucher eligibility is checked automatically during checkout.'
                      : 'Sign in to view your membership progress and available voucher rules.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            );
            final stats = Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  loggedIn ? '$creditPoints' : '--',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF17332A),
                      ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: onTap,
                  child: Text(loggedIn ? 'View membership' : 'Sign in'),
                ),
              ],
            );
            if (constraints.maxWidth < 360) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      iconBox,
                      const SizedBox(width: 14),
                      Expanded(child: summary),
                    ],
                  ),
                  const SizedBox(height: 14),
                  stats,
                ],
              );
            }
            return Row(
              children: [
                iconBox,
                const SizedBox(width: 14),
                Expanded(child: summary),
                const SizedBox(width: 10),
                stats,
              ],
            );
          },
        ),
      ),
    );
  }
}

// ignore: unused_element
class _PromotionHomeCard extends StatelessWidget {
  const _PromotionHomeCard({
    required this.promotion,
    required this.actionLabel,
    required this.onCopyCode,
    required this.onUseNow,
  });

  final PromotionCard promotion;
  final String actionLabel;
  final VoidCallback onCopyCode;
  final VoidCallback onUseNow;

  String _discountLabel() {
    if (promotion.isPercentDiscount) {
      return '${promotion.discountValue.toStringAsFixed(0)}%';
    }
    return Formatters.currency(promotion.discountValue);
  }

  String _membershipLabel() {
    if (!promotion.hasMembershipRestriction) {
      return 'All membership levels';
    }
    return 'Membership checked at checkout';
  }

  String _scopeLabel() {
    return switch (promotion.normalizedScope) {
      'SHIP' => 'Shipping code',
      'DISH' => 'Dish code',
      _ => 'Order code',
    };
  }

  IconData _scopeIcon() {
    return switch (promotion.normalizedScope) {
      'SHIP' => Icons.local_shipping_outlined,
      'DISH' => Icons.local_cafe_outlined,
      _ => Icons.receipt_long_outlined,
    };
  }

  String _scopeSummary() {
    return switch (promotion.normalizedScope) {
      'SHIP' => 'Applies to the shipping fee only',
      'DISH' => 'Applies to all dishes in the order',
      _ => 'Applies to the full order total',
    };
  }

  @override
  Widget build(BuildContext context) {
    final endsAt = promotion.endsAt;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          MetricChip(
                            label: promotion.code,
                            icon: Icons.sell_outlined,
                          ),
                          MetricChip(
                            label: _discountLabel(),
                            backgroundColor: const Color(0xFFF0E3B8),
                            foregroundColor: const Color(0xFF8A5C12),
                          ),
                          MetricChip(
                            label: _membershipLabel(),
                            backgroundColor: promotion.hasMembershipRestriction
                                ? const Color(0xFFE7F1E3)
                                : const Color(0xFFF2EEE4),
                            foregroundColor: promotion.hasMembershipRestriction
                                ? const Color(0xFF17332A)
                                : const Color(0xFF6A665E),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        promotion.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: onCopyCode,
                  tooltip: 'Copy code',
                  icon: const Icon(Icons.copy_rounded),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              promotion.description,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(
                  label: _scopeLabel(),
                  icon: _scopeIcon(),
                  maxWidth: 220,
                ),
                MetricChip(
                  label: _scopeSummary(),
                  icon: Icons.language_outlined,
                  maxWidth: 240,
                ),
                if (promotion.minOrderAmount != null)
                  MetricChip(
                    label: 'Minimum order ${Formatters.currency(promotion.minOrderAmount!)}',
                    icon: Icons.shopping_basket_outlined,
                    maxWidth: 240,
                  ),
                if (promotion.maxDiscountAmount != null)
                  MetricChip(
                    label: 'Max discount ${Formatters.currency(promotion.maxDiscountAmount!)}',
                    icon: Icons.savings_outlined,
                    maxWidth: 240,
                  ),
                if (endsAt != null)
                  MetricChip(
                    label: 'Until ${Formatters.shortDate(endsAt)}',
                    icon: Icons.schedule_outlined,
                    maxWidth: 190,
                  ),
              ],
            ),
            const SizedBox(height: 14),
            OverflowBar(
              alignment: MainAxisAlignment.spaceBetween,
              spacing: 8,
              overflowSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: onCopyCode,
                  icon: const Icon(Icons.copy_rounded),
                  label: const Text('Copy'),
                ),
                FilledButton(
                  onPressed: onUseNow,
                  child: Text(actionLabel),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ignore: unused_element
class _NearbyStoreCard extends StatelessWidget {
  const _NearbyStoreCard({
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
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  store.imagePaths.isEmpty ? null : store.imagePaths.first,
                ),
                height: 150,
                label: store.name,
              ),
              const SizedBox(height: 14),
              LayoutBuilder(
                builder: (context, constraints) {
                  final titleBlock = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        store.name,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        store.highlightSummary.isEmpty
                            ? store.address
                            : store.highlightSummary,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color:
                                  Theme.of(context).colorScheme.onSurfaceVariant,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ],
                  );
                  final statusChip = MetricChip(
                    label: store.open ? 'Open now' : 'Temporarily closed',
                    backgroundColor: store.open
                        ? const Color(0xFFE8F0E0)
                        : const Color(0xFFF4E1DA),
                    foregroundColor: store.open
                        ? const Color(0xFF17332A)
                        : const Color(0xFFB6543A),
                  );
                  if (constraints.maxWidth < 340) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        titleBlock,
                        const SizedBox(height: 10),
                        statusChip,
                      ],
                    );
                  }
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: titleBlock),
                      const SizedBox(width: 12),
                      statusChip,
                    ],
                  );
                },
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(
                    label: Formatters.distance(distanceKm),
                    icon: Icons.near_me_outlined,
                  ),
                  MetricChip(
                    label: '${Formatters.rating(store.averageRating)} stars',
                    icon: Icons.star_border_rounded,
                  ),
                  MetricChip(
                    label: '${store.availableItemCount} items ready',
                    icon: Icons.inventory_2_outlined,
                    maxWidth: 200,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                store.address,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResponsivePromotionHomeCard extends StatelessWidget {
  const _ResponsivePromotionHomeCard({
    required this.promotion,
    required this.actionLabel,
    required this.onCopyCode,
    required this.onUseNow,
  });

  final PromotionCard promotion;
  final String actionLabel;
  final VoidCallback onCopyCode;
  final VoidCallback onUseNow;

  String _discountLabel() {
    if (promotion.isPercentDiscount) {
      return '${promotion.discountValue.toStringAsFixed(0)}%';
    }
    return Formatters.currency(promotion.discountValue);
  }

  String _creditLabel() {
    if (!promotion.requiresCreditRedemption) {
      return 'Available now';
    }
    if (promotion.hasAvailableRedemption) {
      return 'Redeemed x${promotion.availableRedemptions}';
    }
    return 'Redeem ${promotion.creditCost} credits';
  }

  String _targetLabel() {
    return switch (promotion.normalizedDiscountTarget) {
      'SHIPPING' => 'Shipping discount',
      'BOTH' => 'Item + shipping discount',
      _ => 'Signature item discount',
    };
  }

  IconData _targetIcon() {
    return switch (promotion.normalizedDiscountTarget) {
      'SHIPPING' => Icons.local_shipping_outlined,
      'BOTH' => Icons.auto_awesome_outlined,
      _ => Icons.local_cafe_outlined,
    };
  }

  String _targetSummary() {
    return switch (promotion.normalizedDiscountTarget) {
      'SHIPPING' => 'Shipping fee for the signature-item order',
      'BOTH' => 'Signature items and shipping across the system',
      _ => 'Signature items across the system',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final endsAt = promotion.endsAt;
    final canCopyCode =
        !promotion.requiresCreditRedemption || promotion.hasAvailableRedemption;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 340;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    MetricChip(
                      label: promotion.code,
                      icon: Icons.sell_outlined,
                    ),
                    MetricChip(
                      label: _discountLabel(),
                      backgroundColor: const Color(0xFFF0E3B8),
                      foregroundColor: const Color(0xFF8A5C12),
                    ),
                    MetricChip(
                      label: _creditLabel(),
                      backgroundColor: promotion.hasAvailableRedemption
                          ? const Color(0xFFE7F1E3)
                          : const Color(0xFFF2EEE4),
                      foregroundColor: promotion.hasAvailableRedemption
                          ? const Color(0xFF17332A)
                          : const Color(0xFF6A665E),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  promotion.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  promotion.description,
                  maxLines: compact ? 2 : 3,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    MetricChip(
                      label: _targetLabel(),
                      icon: _targetIcon(),
                      maxWidth: compact ? 180 : 210,
                    ),
                    MetricChip(
                      label: _targetSummary(),
                      icon: Icons.language_outlined,
                      maxWidth: compact ? 210 : 240,
                    ),
                    if (promotion.minOrderAmount != null)
                      MetricChip(
                        label:
                            'Minimum order ${Formatters.currency(promotion.minOrderAmount!)}',
                        icon: Icons.shopping_basket_outlined,
                        maxWidth: compact ? 210 : 240,
                      ),
                    if (!compact && promotion.maxDiscountAmount != null)
                      MetricChip(
                        label:
                            'Max discount ${Formatters.currency(promotion.maxDiscountAmount!)}',
                        icon: Icons.savings_outlined,
                        maxWidth: 240,
                      ),
                    if (endsAt != null)
                      MetricChip(
                        label: 'Until ${Formatters.shortDate(endsAt)}',
                        icon: Icons.schedule_outlined,
                        maxWidth: 190,
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                OverflowBar(
                  alignment: MainAxisAlignment.start,
                  spacing: 8,
                  overflowSpacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: canCopyCode ? onCopyCode : null,
                      icon: const Icon(Icons.copy_rounded),
                      label: const Text('Copy'),
                    ),
                    FilledButton(
                      onPressed: onUseNow,
                      child: Text(actionLabel),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ResponsiveNearbyStoreCard extends StatelessWidget {
  const _ResponsiveNearbyStoreCard({
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
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 340;
            final statusChip = MetricChip(
              label: store.open ? 'Open now' : 'Temporarily closed',
              backgroundColor: store.open
                  ? const Color(0xFFE8F0E0)
                  : const Color(0xFFF4E1DA),
              foregroundColor: store.open
                  ? const Color(0xFF17332A)
                  : const Color(0xFFB6543A),
            );
            final titleBlock = Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  store.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  store.highlightSummary.isEmpty
                      ? store.address
                      : store.highlightSummary,
                  maxLines: compact ? 1 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            );
            return Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  NetworkOrFallbackImage(
                    imageUrl: controller.config.resolveImageUrl(
                      store.imagePaths.isEmpty ? null : store.imagePaths.first,
                    ),
                    height: compact ? 120 : 140,
                    label: store.name,
                  ),
                  const SizedBox(height: 12),
                  if (compact) ...[
                    titleBlock,
                    const SizedBox(height: 10),
                    statusChip,
                  ] else
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: titleBlock),
                        const SizedBox(width: 12),
                        statusChip,
                      ],
                    ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      MetricChip(
                        label: Formatters.distance(distanceKm),
                        icon: Icons.near_me_outlined,
                      ),
                      MetricChip(
                        label: '${Formatters.rating(store.averageRating)} stars',
                        icon: Icons.star_border_rounded,
                      ),
                      MetricChip(
                        label: '${store.availableItemCount} items ready',
                        icon: Icons.inventory_2_outlined,
                        maxWidth: compact ? 180 : 200,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    store.address,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
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
  final c = 2 * math.atan2(math.sqrt(a.toDouble()), math.sqrt(1 - a.toDouble()));
  return earthRadiusKm * c;
}

double _degreesToRadians(double value) => value * math.pi / 180;
