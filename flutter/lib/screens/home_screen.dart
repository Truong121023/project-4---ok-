import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'dish_detail_screen.dart';
import 'login_screen.dart';
import 'news_detail_screen.dart';
import 'news_list_screen.dart';
import 'store_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<HomeBundle>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).loadHome();
  }

  Future<void> _refresh() async {
    final future = AppScope.of(context).loadHome();
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tea Matcha'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => controller.isLoggedIn ? const NewsListScreen() : const LoginScreen(),
                ),
              );
            },
            child: Text(controller.isLoggedIn ? 'Tin tuc' : 'Dang nhap'),
          ),
        ],
      ),
      body: FutureBuilder<HomeBundle>(
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

          final home = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                _HeroBanner(
                  brand: home.brand,
                  loggedIn: controller.isLoggedIn,
                  useMockData: controller.config.useMockData,
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: 'Featured stores',
                  subtitle: 'Chon diem den de order nhanh hon.',
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 300,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: home.featuredStores.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final store = home.featuredStores[index];
                      return SizedBox(
                        width: 260,
                        child: StoreCardTile(
                          store: store,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => StoreDetailScreen(storeKey: store.slug),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: 'Best sellers',
                  subtitle: 'Mon de chon, de them vao gio hang.',
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 318,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: home.featuredDishes.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final dish = home.featuredDishes[index];
                      return SizedBox(
                        width: 250,
                        child: DishCardTile(
                          dish: dish,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => DishDetailScreen(dishId: dish.id),
                              ),
                            );
                          },
                          onQuickAdd: () async {
                            final bestStore = dish.bestStore;
                            if (bestStore == null) {
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
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: 'Su kien sap toi',
                  subtitle: 'Tap trung nhung event ngan gon, de tham gia.',
                ),
                const SizedBox(height: 14),
                ...home.upcomingEvents.map(
                  (event) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              event.name,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Text('${event.storeName} - ${Formatters.shortDate(event.startsAt)}'),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                MetricChip(label: '${event.remainingSlots} cho'),
                                MetricChip(label: '${Formatters.rating(event.averageRating)} sao'),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: 'Tin moi',
                  subtitle: 'Bai viet ngan, doc nhanh tren mobile.',
                  actionLabel: 'Xem het',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const NewsListScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 14),
                ...home.latestNews.map(
                  (news) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: NewsTile(
                      news: news,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => NewsDetailScreen(newsKey: news.slug),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  const _HeroBanner({
    required this.brand,
    required this.loggedIn,
    required this.useMockData,
  });

  final String brand;
  final bool loggedIn;
  final bool useMockData;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF17332A), Color(0xFF4A7253)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.all(Radius.circular(24)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _HeroChip(label: brand),
                _HeroChip(label: useMockData ? 'Mock mode' : 'API mode'),
                _HeroChip(label: loggedIn ? 'Da dang nhap' : 'Guest browsing'),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Mobile storefront duoc dung theo FRONTEND_USER_API.md',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            Text(
              'UI toi uu cho vuot nhanh: tim store, chon mon, xem news va them vao gio hang trong it buoc.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: 0.92)),
            ),
          ],
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
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
    );
  }
}
