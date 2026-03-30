import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../widgets/app_widgets.dart';
import 'store_detail_screen.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});

  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  final _searchController = TextEditingController();
  Future<List<StoreCard>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).browseStores();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final future = AppScope.of(context).browseStores(search: _searchController.text.trim());
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stores')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _search(),
              decoration: InputDecoration(
                hintText: 'Tim theo ten store hoac khu vuc',
                suffixIcon: IconButton(
                  onPressed: _search,
                  icon: const Icon(Icons.search),
                ),
              ),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<StoreCard>>(
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
                      onRetry: _search,
                    ),
                  );
                }
                final stores = snapshot.data!;
                if (stores.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: EmptyStateCard(
                      title: 'Khong tim thay store',
                      message: 'Thu doi tu khoa de xem danh sach phu hop hon.',
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _search,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                    itemCount: stores.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final store = stores[index];
                      return StoreCardTile(
                        store: store,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => StoreDetailScreen(storeKey: store.slug),
                            ),
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
