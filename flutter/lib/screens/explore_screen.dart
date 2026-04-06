import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../widgets/app_widgets.dart';
import 'events_screen.dart';
import 'news_detail_screen.dart';
import 'news_list_screen.dart';
import 'dishes_screen.dart';
import 'stores_screen.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
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
    return Scaffold(
      appBar: AppBar(title: const Text('Kham pha')),
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
                const SectionHeader(
                  title: 'Storefront',
                  subtitle:
                      'Chon nhanh khu ban muon xem ma khong can quay lai Home.',
                ),
                const SizedBox(height: 14),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.95,
                  children: [
                    ExploreShortcutCard(
                      icon: Icons.storefront_outlined,
                      title: 'Stores',
                      subtitle:
                          'Xem chi nhanh, khu vuc, gio mo cua va menu theo store.',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                              builder: (_) => const StoresScreen()),
                        );
                      },
                    ),
                    ExploreShortcutCard(
                      icon: Icons.ramen_dining_outlined,
                      title: 'Dishes',
                      subtitle:
                          'Loc nhanh mon, xem gia va add cart tu diem ban phu hop.',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                              builder: (_) => const DishesScreen()),
                        );
                      },
                    ),
                    ExploreShortcutCard(
                      icon: Icons.celebration_outlined,
                      title: 'Events',
                      subtitle: 'Su kien, workshop va pop-up dang mo dang ky.',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                              builder: (_) => const EventsScreen()),
                        );
                      },
                    ),
                    ExploreShortcutCard(
                      icon: Icons.article_outlined,
                      title: 'News',
                      subtitle:
                          'Tin moi, bai huong dan va thong bao tu thuong hieu.',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                              builder: (_) => const NewsListScreen()),
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                SectionHeader(
                  title: 'Su kien nen xem',
                  subtitle: 'Danh sach rut gon tu home payload de vao nhanh.',
                  actionLabel: 'Tat ca',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                          builder: (_) => const EventsScreen()),
                    );
                  },
                ),
                const SizedBox(height: 12),
                ...home.upcomingEvents.take(3).map(
                      (event) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Card(
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            title: Text(
                              event.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            subtitle: Text(
                              '${event.storeName}\n${event.highlightSummary}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            isThreeLine: true,
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) =>
                                      EventDetailScreen(eventKey: event.slug),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                const SizedBox(height: 16),
                SectionHeader(
                  title: 'Tin dang hot',
                  subtitle: 'Doc nhanh nhung bai moi nhat va featured article.',
                  actionLabel: 'Tat ca',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                          builder: (_) => const NewsListScreen()),
                    );
                  },
                ),
                const SizedBox(height: 12),
                ...home.latestNews.take(3).map(
                      (news) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: NewsTile(
                          news: news,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    NewsDetailScreen(newsKey: news.slug),
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
