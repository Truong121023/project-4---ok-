import 'dart:math' as math;

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
  String? _lastSessionKey;
  String? _lastPrimaryAddressKey;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _ensureFutureSynced();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
    _future = _loadStores();
  }

  Future<List<StoreCard>> _loadStores() {
    final controller = AppScope.of(context);
    final primaryAddress = controller.primaryDeliveryAddress;
    return controller.browseStores(
      search: _searchController.text.trim(),
      sort: primaryAddress?.hasCoordinates == true
          ? 'distance_asc'
          : 'rating_desc',
      latitude: primaryAddress?.latitude,
      longitude: primaryAddress?.longitude,
    );
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

  double _haversineKm(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const radius = 6371.0;
    final dLat = _toRadians(lat2 - lat1);
    final dLon = _toRadians(lon2 - lon1);
    final a = (math.sin(dLat / 2) * math.sin(dLat / 2)) +
        math.cos(_toRadians(lat1)) *
            math.cos(_toRadians(lat2)) *
            (math.sin(dLon / 2) * math.sin(dLon / 2));
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return radius * c;
  }

  double _toRadians(double value) => value * math.pi / 180;

  Future<void> _search() async {
    final future = _loadStores();
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
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
                hintText: 'Search by store name or area',
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
                      title: 'No stores found',
                      message: 'Try a different keyword to get more relevant results.',
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
                        distanceKmOverride:
                            _resolveStoreDistanceKm(store, controller.primaryDeliveryAddress),
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
