import 'dart:async';

import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/services/address_search_service.dart';
import '../core/services/api_service.dart';
import '../widgets/app_widgets.dart';
import 'address_map_picker_screen.dart';

const LatLng _fallbackMapCenter = LatLng(10.7769, 106.7009);

class AddressEditorScreen extends StatefulWidget {
  const AddressEditorScreen({
    super.key,
    this.address,
  });

  final DeliveryAddress? address;

  @override
  State<AddressEditorScreen> createState() => _AddressEditorScreenState();
}

class _AddressEditorScreenState extends State<AddressEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final AddressSearchService _addressSearchService = AddressSearchService();
  late final TextEditingController _fullNameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;
  late bool _primary;
  bool _resolvingCoordinates = false;
  bool _loadingSuggestions = false;
  String? _error;
  String? _suggestionsError;
  double? _selectedLatitude;
  double? _selectedLongitude;
  String? _mappedAddressSnapshot;
  String? _resolvingSuggestionKey;
  Timer? _suggestionDebounce;
  List<AddressSuggestionOption> _addressSuggestions = const [];

  @override
  void initState() {
    super.initState();
    _fullNameController =
        TextEditingController(text: widget.address?.fullName ?? '');
    _phoneController =
        TextEditingController(text: widget.address?.phoneNumber ?? '');
    _addressController =
        TextEditingController(text: widget.address?.deliveryAddress ?? '')
          ..addListener(_handleAddressChanged);
    _primary = widget.address?.primary ?? false;
    _selectedLatitude = widget.address?.latitude;
    _selectedLongitude = widget.address?.longitude;
    _mappedAddressSnapshot = widget.address?.hasCoordinates == true
        ? _addressSearchService
            .normalizeVietnameseAddress(widget.address?.deliveryAddress ?? '')
        : null;
  }

  @override
  void dispose() {
    _suggestionDebounce?.cancel();
    _fullNameController.dispose();
    _phoneController.dispose();
    _addressController
      ..removeListener(_handleAddressChanged)
      ..dispose();
    super.dispose();
  }

  bool get _hasSelectedCoordinates =>
      _selectedLatitude != null && _selectedLongitude != null;

  bool get _addressNeedsRemap {
    final current = _addressSearchService
        .normalizeVietnameseAddress(_addressController.text);
    if (current.isEmpty) {
      return false;
    }
    return _mappedAddressSnapshot != current;
  }

  void _handleAddressChanged() {
    if (mounted) {
      setState(() {});
    }
    _scheduleAddressSuggestions();
  }

  void _applyQuickPick(AddressQuickPick quickPick) {
    final normalizedAddress =
        _addressSearchService.normalizeVietnameseAddress(quickPick.address);
    _addressController.value = TextEditingValue(
      text: normalizedAddress,
      selection: TextSelection.collapsed(offset: normalizedAddress.length),
    );
    setState(() {
      _error = null;
      _suggestionsError = null;
      _addressSuggestions = const [];
    });
  }

  void _scheduleAddressSuggestions() {
    _suggestionDebounce?.cancel();
    final query = _addressSearchService
        .normalizeVietnameseAddress(_addressController.text);

    if (query.length < 4) {
      if (mounted) {
        setState(() {
          _loadingSuggestions = false;
          _suggestionsError = null;
          _addressSuggestions = const [];
        });
      }
      return;
    }

    _suggestionDebounce = Timer(const Duration(milliseconds: 350), () {
      unawaited(_loadAddressSuggestions(query));
    });
  }

  Future<void> _loadAddressSuggestions(String query) async {
    if (!mounted) {
      return;
    }

    setState(() {
      _loadingSuggestions = true;
      _suggestionsError = null;
    });

    try {
      final matches =
          await AppScope.of(context).searchAddressSuggestions(query, limit: 5);
      final currentQuery = _addressSearchService
          .normalizeVietnameseAddress(_addressController.text);
      if (!mounted || currentQuery != query) {
        return;
      }

      setState(() {
        _addressSuggestions = matches.take(5).toList();
      });
    } catch (_) {
      final currentQuery = _addressSearchService
          .normalizeVietnameseAddress(_addressController.text);
      if (!mounted || currentQuery != query) {
        return;
      }

      setState(() {
        _addressSuggestions = const [];
        _suggestionsError = 'Unable to load address suggestions right now.';
      });
    } finally {
      final currentQuery = _addressSearchService
          .normalizeVietnameseAddress(_addressController.text);
      if (mounted && currentQuery == query) {
        setState(() {
          _loadingSuggestions = false;
        });
      }
    }
  }

  Future<void> _applyAddressSuggestion(AddressSuggestionOption suggestion) async {
    final fallbackAddress = suggestion.label.trim().isEmpty
        ? _addressSearchService.normalizeVietnameseAddress(
            _addressController.text,
          )
        : suggestion.label.trim();
    final suggestionKey =
        '${suggestion.placeId}:${suggestion.sessionToken}:${suggestion.label}';

    setState(() {
      _resolvingSuggestionKey = suggestionKey;
      _error = null;
      _suggestionsError = null;
    });

    try {
      final resolved = suggestion.hasCoordinates
          ? AddressResolveResult(
              label: fallbackAddress,
              normalizedAddress:
                  suggestion.normalizedAddress.trim().isEmpty
                      ? fallbackAddress
                      : suggestion.normalizedAddress.trim(),
              latitude: suggestion.latitude!,
              longitude: suggestion.longitude!,
              placeId: suggestion.placeId,
              source: suggestion.source,
            )
          : await AppScope.of(context).resolveAddressLookup(
              query: fallbackAddress,
              placeId: suggestion.placeId,
              sessionToken: suggestion.sessionToken,
            );

      final resolvedAddress = resolved.normalizedAddress.trim().isEmpty
          ? fallbackAddress
          : resolved.normalizedAddress.trim();
      _addressController.value = TextEditingValue(
        text: resolvedAddress,
        selection: TextSelection.collapsed(offset: resolvedAddress.length),
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _selectedLatitude = resolved.latitude;
        _selectedLongitude = resolved.longitude;
        _mappedAddressSnapshot =
            _addressSearchService.normalizeVietnameseAddress(resolvedAddress);
        _error = null;
        _suggestionsError = null;
        _addressSuggestions = const [];
      });
      FocusScope.of(context).unfocus();
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _addressController.value = TextEditingValue(
          text: fallbackAddress,
          selection: TextSelection.collapsed(offset: fallbackAddress.length),
        );
        _selectedLatitude = null;
        _selectedLongitude = null;
        _mappedAddressSnapshot = null;
        _suggestionsError =
            'Unable to validate this address suggestion right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _resolvingSuggestionKey = null;
        });
      }
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final normalizedAddress = _addressSearchService
        .normalizeVietnameseAddress(_addressController.text);
    if (normalizedAddress != _addressController.text.trim()) {
      _addressController.value = TextEditingValue(
        text: normalizedAddress,
        selection: TextSelection.collapsed(offset: normalizedAddress.length),
      );
    }
    final ready = await _ensureCoordinatesSelected();
    if (!ready) {
      return;
    }
    if (!mounted) {
      return;
    }

    final controller = AppScope.of(context);
    setState(() => _error = null);
    try {
      await controller.saveDeliveryAddress(
        existing: widget.address,
        fullName: _fullNameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        deliveryAddress: normalizedAddress,
        latitude: _selectedLatitude,
        longitude: _selectedLongitude,
        primary: _primary,
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _error = 'Unable to save the address.');
    }
  }

  Future<bool> _ensureCoordinatesSelected() async {
    if (_hasSelectedCoordinates && !_addressNeedsRemap) {
      return true;
    }
    final result = await _openMapPicker(showCancelError: true);
    return result != null;
  }

  Future<AddressMapPickResult?> _openMapPicker({
    bool showCancelError = false,
  }) async {
    final currentAddress = _addressController.text.trim();
    final deliveryAddress =
        _addressSearchService.normalizeVietnameseAddress(currentAddress);
    if (deliveryAddress.isEmpty) {
      setState(() =>
          _error = 'Enter the address before choosing a location on the map.');
      return null;
    }
    if (deliveryAddress != currentAddress) {
      _addressController.value = TextEditingValue(
        text: deliveryAddress,
        selection: TextSelection.collapsed(offset: deliveryAddress.length),
      );
    }

    setState(() {
      _error = null;
      _resolvingCoordinates = true;
    });

    try {
      double initialLatitude;
      double initialLongitude;
      if (_hasSelectedCoordinates && !_addressNeedsRemap) {
        initialLatitude = _selectedLatitude!;
        initialLongitude = _selectedLongitude!;
      } else {
        try {
          final resolved = await AppScope.of(context).resolveAddressLookup(
            query: deliveryAddress,
          );
          initialLatitude = resolved.latitude;
          initialLongitude = resolved.longitude;
        } catch (_) {
          initialLatitude = _fallbackMapCenter.latitude;
          initialLongitude = _fallbackMapCenter.longitude;
          if (mounted) {
            _error =
                'We could not find accurate coordinates for this address. The map opened in the default area so you can search or drag the pin manually.';
          }
        }
      }

      if (!mounted) {
        return null;
      }

      final picked = await Navigator.of(context).push<AddressMapPickResult>(
        MaterialPageRoute<AddressMapPickResult>(
          builder: (_) => AddressMapPickerScreen(
            addressLabel: deliveryAddress,
            initialLatitude: initialLatitude,
            initialLongitude: initialLongitude,
          ),
        ),
      );

      if (!mounted || picked == null) {
        if (showCancelError && mounted) {
          setState(() {
            _error =
                'You have not confirmed the map position for this address yet.';
          });
        }
        return null;
      }

      setState(() {
        _selectedLatitude = picked.latitude;
        _selectedLongitude = picked.longitude;
        _mappedAddressSnapshot = deliveryAddress;
      });
      return picked;
    } catch (error) {
      if (!mounted) {
        return null;
      }
      final message = '$error';
      setState(() {
        _error = message.contains('IO_ERROR')
            ? 'The address lookup service is temporarily busy. Please try again in a few minutes.'
            : 'We could not find this address. You can still open the map, search by district or ward, and drag the pin to the delivery location.';
      });
      return null;
    } finally {
      if (mounted) {
        setState(() => _resolvingCoordinates = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final coordinatesReady = _hasSelectedCoordinates && !_addressNeedsRemap;
    final coordinateLabel = coordinatesReady
        ? 'Map position confirmed'
        : _hasSelectedCoordinates && _addressNeedsRemap
            ? 'The address changed, so the map position must be set again'
            : 'No map position selected';

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.address == null ? 'Add address' : 'Edit address'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _fullNameController,
                      decoration: const InputDecoration(labelText: 'Recipient'),
                      validator: (value) => (value ?? '').trim().isEmpty
                          ? 'Enter the recipient name'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration:
                          const InputDecoration(labelText: 'Phone number'),
                      validator: (value) => (value ?? '').trim().length < 8
                          ? 'Enter a valid phone number'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressController,
                      minLines: 2,
                      maxLines: 4,
                      decoration:
                          const InputDecoration(labelText: 'Delivery address'),
                      validator: (value) =>
                          (value ?? '').trim().isEmpty ? 'Enter address' : null,
                    ),
                    if (_addressController.text.trim().length >= 4) ...[
                      const SizedBox(height: 12),
                      _AddressSuggestionCard(
                        suggestions: _addressSuggestions,
                        loading: _loadingSuggestions,
                        error: _suggestionsError,
                        resolvingSuggestionKey: _resolvingSuggestionKey,
                        onSelectSuggestion: _applyAddressSuggestion,
                      ),
                    ],
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Quick sample addresses',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final quickPick
                              in vietnameseAddressQuickPicks) ...[
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
                    const SizedBox(height: 16),
                    _MapStatusCard(
                      statusLabel: coordinateLabel,
                      hasCoordinates: coordinatesReady,
                      latitude: _selectedLatitude,
                      longitude: _selectedLongitude,
                      busy: _resolvingCoordinates,
                      onPickMap: _resolvingCoordinates
                          ? null
                          : () => _openMapPicker(showCancelError: false),
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _primary,
                      onChanged: (value) => setState(() => _primary = value),
                      title: const Text('Set as default address'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          _error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed:
                            controller.addressBusy || _resolvingCoordinates
                                ? null
                                : _save,
                        child: Text(
                          _resolvingCoordinates
                              ? 'Opening map...'
                              : controller.addressBusy
                                  ? 'Saving...'
                                  : 'Save address',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapStatusCard extends StatelessWidget {
  const _MapStatusCard({
    required this.statusLabel,
    required this.hasCoordinates,
    required this.latitude,
    required this.longitude,
    required this.busy,
    required this.onPickMap,
  });

  final String statusLabel;
  final bool hasCoordinates;
  final double? latitude;
  final double? longitude;
  final bool busy;
  final VoidCallback? onPickMap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBF3),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5DED0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Delivery location on the map',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              MetricChip(
                label: statusLabel,
                backgroundColor: hasCoordinates
                    ? const Color(0xFFE7F1E3)
                    : const Color(0xFFF2EEE5),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            hasCoordinates
                ? 'You can drag the map to reposition the pin more accurately if needed.'
                : 'After entering the address, open the map to search for it and drag to the exact delivery point.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
          ),
          if (latitude != null && longitude != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(label: 'Lat ${latitude!.toStringAsFixed(6)}'),
                MetricChip(label: 'Lng ${longitude!.toStringAsFixed(6)}'),
              ],
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonalIcon(
              onPressed: onPickMap,
              icon: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.map_outlined),
              label: Text(
                  busy ? 'Preparing map...' : 'Open map to find the address'),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddressSuggestionCard extends StatelessWidget {
  const _AddressSuggestionCard({
    required this.suggestions,
    required this.loading,
    required this.error,
    required this.resolvingSuggestionKey,
    required this.onSelectSuggestion,
  });

  final List<AddressSuggestionOption> suggestions;
  final bool loading;
  final String? error;
  final String? resolvingSuggestionKey;
  final ValueChanged<AddressSuggestionOption> onSelectSuggestion;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBF3),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5DED0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Address suggestions',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              if (loading)
                Text(
                  'Searching...',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (error != null && error!.trim().isNotEmpty)
            Text(
              error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                    fontWeight: FontWeight.w700,
                  ),
            )
          else if (!loading && suggestions.isEmpty)
            Text(
              'Keep typing the street, ward, district, or city to see matching addresses.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
            )
          else
            Column(
              children: suggestions
                  .map(
                    (suggestion) => Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => onSelectSuggestion(suggestion),
                        child: Ink(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE5DED0)),
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (resolvingSuggestionKey ==
                                  '${suggestion.placeId}:${suggestion.sessionToken}:${suggestion.label}')
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Text(
                                    'Resolving selected address...',
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelMedium
                                        ?.copyWith(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                ),
                              Text(
                                suggestion.label,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF2A231C),
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                suggestion.secondaryLabel.trim().isNotEmpty
                                    ? suggestion.secondaryLabel.trim()
                                    : suggestion.hasCoordinates
                                        ? 'Lat ${suggestion.latitude!.toStringAsFixed(6)} | Lng ${suggestion.longitude!.toStringAsFixed(6)}'
                                        : 'Tap to use this address',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelMedium
                                    ?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    );
  }
}
