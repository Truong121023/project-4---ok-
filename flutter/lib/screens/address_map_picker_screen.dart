import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/services/address_search_service.dart';

class AddressMapPickResult {
  const AddressMapPickResult({
    required this.latitude,
    required this.longitude,
  });

  final double latitude;
  final double longitude;
}

class AddressMapPickerScreen extends StatefulWidget {
  const AddressMapPickerScreen({
    super.key,
    required this.addressLabel,
    required this.initialLatitude,
    required this.initialLongitude,
  });

  final String addressLabel;
  final double initialLatitude;
  final double initialLongitude;

  @override
  State<AddressMapPickerScreen> createState() => _AddressMapPickerScreenState();
}

class _AddressMapPickerScreenState extends State<AddressMapPickerScreen> {
  final AddressSearchService _addressSearchService = AddressSearchService();
  late final MapController _mapController;
  late final TextEditingController _searchController;
  late LatLng _selectedCenter;
  bool _searchingAddress = false;
  String? _searchError;
  String? _normalizedQuery;
  List<AddressSuggestionOption> _searchResults = const [];

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _searchController = TextEditingController(text: widget.addressLabel);
    _selectedCenter = LatLng(
      widget.initialLatitude,
      widget.initialLongitude,
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _handleMapEvent(MapEvent event) {
    final center = event.camera.center;
    if ((_selectedCenter.latitude - center.latitude).abs() < 0.000001 &&
        (_selectedCenter.longitude - center.longitude).abs() < 0.000001) {
      return;
    }
    setState(() {
      _selectedCenter = center;
    });
  }

  Future<void> _searchAddress() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() {
        _searchError = 'Enter the address you want to find on the map.';
      });
      return;
    }
    final normalizedQuery = _addressSearchService.normalizeVietnameseAddress(query);
    setState(() {
      _searchingAddress = true;
      _searchError = null;
      _normalizedQuery = normalizedQuery != query ? normalizedQuery : null;
      _searchResults = const [];
    });
    if (normalizedQuery != query) {
      _searchController.value = TextEditingValue(
        text: normalizedQuery,
        selection: TextSelection.collapsed(offset: normalizedQuery.length),
      );
    }
    try {
      final matches = await AppScope.of(context).searchAddressSuggestions(
        normalizedQuery,
        limit: 6,
      );
      if (matches.isEmpty) {
        if (!mounted) {
          return;
        }
        setState(() {
          _searchError =
              'This address could not be found. Try adding a street number, street, ward, district, or choose one of the sample addresses below.';
        });
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _searchResults = matches;
      });
      await _selectSearchResult(matches.first, updateSearchResults: false);
    } catch (error) {
      if (!mounted) {
        return;
      }
      final message = '$error';
      setState(() {
        _searchError = message.contains('IO_ERROR')
            ? 'The address lookup service is temporarily unavailable. Please try again in a few minutes.'
            : 'This address could not be found. Try adding a street number, street, ward, district, or choose one of the sample addresses below.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _searchingAddress = false;
        });
      }
    }
  }

  void _moveToResult(LatLng nextCenter) {
    final zoom = _mapController.camera.zoom < 16 ? 16.0 : _mapController.camera.zoom;
    _mapController.move(nextCenter, zoom);
  }

  Future<void> _selectSearchResult(
    AddressSuggestionOption result, {
    bool updateSearchResults = true,
  }) async {
    try {
      final resolved = result.hasCoordinates
          ? AddressResolveResult(
              label: result.label,
              normalizedAddress: result.normalizedAddress.trim().isEmpty
                  ? result.label
                  : result.normalizedAddress.trim(),
              latitude: result.latitude!,
              longitude: result.longitude!,
              placeId: result.placeId,
              source: result.source,
            )
          : await AppScope.of(context).resolveAddressLookup(
              query: result.label,
              placeId: result.placeId,
              sessionToken: result.sessionToken,
            );
      if (!mounted) {
        return;
      }

      final nextCenter = LatLng(resolved.latitude, resolved.longitude);
      _moveToResult(nextCenter);
      setState(() {
        _selectedCenter = nextCenter;
        _searchController.text = resolved.normalizedAddress;
        _searchError = null;
        _normalizedQuery = null;
        if (updateSearchResults) {
          _searchResults = [
            result,
            ..._searchResults.where(
              (item) =>
                  item.placeId != result.placeId || item.label != result.label,
            ),
          ];
        }
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _searchError =
            'Unable to resolve this result right now. Please try another suggestion.';
      });
    }
  }

  Future<void> _applyQuickPick(AddressQuickPick quickPick) async {
    _searchController.value = TextEditingValue(
      text: quickPick.address,
      selection: TextSelection.collapsed(offset: quickPick.address.length),
    );
    await _searchAddress();
  }

  void _confirmSelection() {
    Navigator.of(context).pop(
      AddressMapPickResult(
        latitude: _selectedCenter.latitude,
        longitude: _selectedCenter.longitude,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose map location'),
        actions: [
          TextButton(
            onPressed: _confirmSelection,
            child: const Text('Done'),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _selectedCenter,
              initialZoom: 16,
              onMapEvent: _handleMapEvent,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.kamatcha.mobile',
              ),
              RichAttributionWidget(
                alignment: AttributionAlignment.bottomLeft,
                attributions: const [
                  TextSourceAttribution('OpenStreetMap contributors'),
                ],
              ),
            ],
          ),
          IgnorePointer(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(
                    Icons.location_on,
                    size: 44,
                    color: Color(0xFF17332A),
                  ),
                  SizedBox(height: 24),
                ],
              ),
            ),
          ),
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Search for an address, then drag the map to place the pin at the exact delivery point.',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _searchController,
                      textInputAction: TextInputAction.search,
                      onSubmitted: (_) => _searchAddress(),
                      decoration: InputDecoration(
                        hintText: 'Search by address',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(
                          onPressed: _searchingAddress ? null : _searchAddress,
                          icon: _searchingAddress
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.arrow_forward),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Sample Vietnam addresses',
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final quickPick in vietnameseAddressQuickPicks) ...[
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ActionChip(
                                onPressed: () => _applyQuickPick(quickPick),
                                label: Text(quickPick.title),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (_searchError != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _searchError!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.error,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ] else ...[
                      const SizedBox(height: 8),
                      Text(
                        _normalizedQuery == null
                            ? 'The map will jump to the searched area, then you can drag it to place the pin accurately.'
                            : 'Normalized address: $_normalizedQuery',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                          height: 1.35,
                        ),
                      ),
                    ],
                    if (_searchResults.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 168),
                        child: ListView.separated(
                          shrinkWrap: true,
                          itemCount: _searchResults.length,
                          separatorBuilder: (_, __) =>
                              const Divider(height: 12),
                          itemBuilder: (context, index) {
                            final result = _searchResults[index];
                            return InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => _selectSearchResult(result),
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Padding(
                                      padding: EdgeInsets.only(top: 2),
                                      child: Icon(
                                        Icons.place_outlined,
                                        size: 18,
                                        color: Color(0xFF17332A),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            result.label,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: theme.textTheme.bodyMedium
                                                ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            result.secondaryLabel.trim().isNotEmpty
                                                ? result.secondaryLabel.trim()
                                                : result.hasCoordinates
                                                    ? 'Lat ${result.latitude!.toStringAsFixed(6)} | Lng ${result.longitude!.toStringAsFixed(6)}'
                                                    : 'Tap to move the map to this suggestion',
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                              color: theme.colorScheme
                                                  .onSurfaceVariant,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _CoordinateChip(
                          label:
                              'Lat ${_selectedCenter.latitude.toStringAsFixed(6)}',
                        ),
                        _CoordinateChip(
                          label:
                              'Lng ${_selectedCenter.longitude.toStringAsFixed(6)}',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 20,
            child: FilledButton(
              onPressed: _confirmSelection,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(54),
              ),
              child: const Text('Use this location'),
            ),
          ),
        ],
      ),
    );
  }
}

class _CoordinateChip extends StatelessWidget {
  const _CoordinateChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFE7F1E3),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w800,
              color: const Color(0xFF17332A),
            ),
      ),
    );
  }
}
