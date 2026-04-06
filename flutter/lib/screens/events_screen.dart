import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'dish_detail_screen.dart';
import 'store_detail_screen.dart';
import 'user_review_editor_screen.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  static const List<(String, String)> _sortOptions = [
    ('date_asc', 'Gan nhat'),
    ('date_desc', 'Moi nhat'),
    ('rating_desc', 'Danh gia cao'),
    ('rating_asc', 'Danh gia thap'),
  ];

  final TextEditingController _searchController = TextEditingController();
  String _sort = 'date_asc';
  Future<List<EventCard>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<List<EventCard>> _load() {
    return AppScope.of(context).browseEvents(
      search: _searchController.text,
      sort: _sort,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Tim event theo ten, store, dia diem',
                  ),
                  onSubmitted: (_) => _refresh(),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _sort,
                  decoration: const InputDecoration(labelText: 'Sap xep'),
                  items: _sortOptions
                      .map(
                        (item) => DropdownMenuItem<String>(
                          value: item.$1,
                          child: Text(item.$2),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value == null) {
                      return;
                    }
                    setState(() {
                      _sort = value;
                    });
                    _refresh();
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: FutureBuilder<List<EventCard>>(
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

                final events = snapshot.data!;
                if (events.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: EmptyStateCard(
                      title: 'Chua co event phu hop',
                      message: 'Thu doi tu khoa hoac sort de xem them su kien.',
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    itemCount: events.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final event = events[index];
                      return Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          title: Text(
                            event.name,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          subtitle: Text(
                            '${event.storeName} - ${Formatters.shortDate(event.startsAt)}\n${event.highlightSummary}',
                          ),
                          isThreeLine: true,
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => EventDetailScreen(eventKey: event.slug),
                              ),
                            );
                          },
                        ),
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

class EventDetailScreen extends StatefulWidget {
  const EventDetailScreen({
    super.key,
    required this.eventKey,
  });

  final String eventKey;

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  Future<EventDetail>? _future;
  bool _favoriteBusy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn && controller.favoriteItems.isEmpty) {
      controller.loadFavorites();
    }
  }

  Future<EventDetail> _load() {
    return AppScope.of(context).loadEventDetail(widget.eventKey);
  }

  Future<void> _reload() async {
    final future = _load();
    setState(() {
      _future = future;
    });
    await future;
  }

  Future<void> _toggleFavorite(EventDetail event) async {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn || _favoriteBusy) {
      return;
    }
    setState(() {
      _favoriteBusy = true;
    });
    try {
      final saved = await controller.toggleFavorite(
        targetType: 'EVENT',
        targetId: event.id,
        targetLabel: event.name,
        targetImagePaths: event.imagePaths,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(saved ? 'Da them event vao yeu thich' : 'Da bo event khoi yeu thich')),
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
    return FutureBuilder<EventDetail>(
      future: _future,
      builder: (context, snapshot) {
        final event = snapshot.data;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Chi tiet event'),
            actions: [
              if (event != null && controller.isLoggedIn)
                IconButton(
                  onPressed: _favoriteBusy ? null : () => _toggleFavorite(event),
                  icon: Icon(
                    controller.isFavorite('EVENT', event.id) ? Icons.favorite : Icons.favorite_border,
                  ),
                  tooltip: 'Yeu thich',
                ),
            ],
          ),
          body: Builder(
            builder: (context) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError || event == null) {
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: ErrorStateCard(
                    message: snapshot.error.toString(),
                    onRetry: _reload,
                  ),
                );
              }

              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                children: [
                  NetworkOrFallbackImage(
                    imageUrl: controller.config.resolveImageUrl(
                      event.imagePaths.isEmpty ? null : event.imagePaths.first,
                    ),
                    height: 230,
                    label: event.name,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    event.name,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(event.description.isEmpty ? event.highlightSummary : event.description),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      MetricChip(label: event.storeName),
                      MetricChip(label: '${event.remainingSlots} cho trong'),
                      MetricChip(label: Formatters.shortDate(event.startsAt)),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thong tin nhanh',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 10),
                          Text('Dia diem: ${event.location}'),
                          const SizedBox(height: 6),
                          Text('Lich: ${event.scheduleText}'),
                          if (event.storeAddress.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text('Store: ${event.storeAddress}'),
                          ],
                          if (event.capacity > 0) ...[
                            const SizedBox(height: 6),
                            Text('Suc chua: ${event.bookedCount}/${event.capacity}'),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => StoreDetailScreen(
                                storeKey: event.storeSlug.isEmpty ? event.storeId.toString() : event.storeSlug,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.storefront_outlined),
                        label: const Text('Mo store'),
                      ),
                      if (controller.isLoggedIn)
                        OutlinedButton.icon(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => UserReviewEditorScreen(
                                  targetType: 'EVENT',
                                  targetId: event.id,
                                  targetLabel: event.name,
                                  targetImagePaths: event.imagePaths,
                                ),
                              ),
                            );
                          },
                          icon: const Icon(Icons.rate_review_outlined),
                          label: const Text('Viet review'),
                        ),
                    ],
                  ),
                  if (event.sections.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const SectionHeader(
                      title: 'Noi dung su kien',
                      subtitle: 'Sections dai hon de doc tren mobile.',
                    ),
                    const SizedBox(height: 12),
                    ...event.sections.map(
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
                  ],
                  if (event.featuredDishes.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const SectionHeader(
                      title: 'Mon lien quan',
                      subtitle: 'Cac mon noi bat duoc event de xuat.',
                    ),
                    const SizedBox(height: 12),
                    ...event.featuredDishes.map(
                      (dish) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Card(
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            title: Text(
                              dish.name,
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            subtitle: Text(Formatters.currency(dish.price)),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => DishDetailScreen(dishId: dish.id),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
        );
      },
    );
  }
}
