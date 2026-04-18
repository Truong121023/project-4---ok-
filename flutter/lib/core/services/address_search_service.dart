import 'dart:convert';

import 'package:geocoding/geocoding.dart';
import 'package:http/http.dart' as http;

class AddressQuickPick {
  const AddressQuickPick({
    required this.title,
    required this.address,
  });

  final String title;
  final String address;
}

const List<AddressQuickPick> vietnameseAddressQuickPicks = [
  AddressQuickPick(
    title: 'Nguyen Hue Q1',
    address: '42 Nguyen Hue, Phuong Ben Nghe, Quan 1, Thanh pho Ho Chi Minh',
  ),
  AddressQuickPick(
    title: 'Vo Thi Sau Q1',
    address: '18 Vo Thi Sau, Phuong Ben Nghe, Quan 1, Thanh pho Ho Chi Minh',
  ),
  AddressQuickPick(
    title: 'Tran Duy Hung',
    address:
        '12 Tran Duy Hung, Phuong Trung Hoa, Quan Cau Giay, Thanh pho Ha Noi',
  ),
  AddressQuickPick(
    title: 'Pho Hue',
    address:
        '96 Pho Hue, Phuong Bui Thi Xuan, Quan Hai Ba Trung, Thanh pho Ha Noi',
  ),
  AddressQuickPick(
    title: 'Vo Nguyen Giap',
    address:
        '88 Vo Nguyen Giap, Phuong My An, Quan Ngu Hanh Son, Thanh pho Da Nang',
  ),
  AddressQuickPick(
    title: 'Hai Chau',
    address:
        '15 Hung Vuong, Phuong Hai Chau I, Quan Hai Chau, Thanh pho Da Nang',
  ),
  AddressQuickPick(
    title: 'Bach Dang Nha Trang',
    address:
        '120 Bach Dang, Phuong Tan Lap, Thanh pho Nha Trang, Tinh Khanh Hoa',
  ),
  AddressQuickPick(
    title: 'Can Tho Center',
    address:
        '209 Duong 30 Thang 4, Phuong Xuan Khanh, Quan Ninh Kieu, Thanh pho Can Tho',
  ),
];

class AddressSearchResult {
  const AddressSearchResult({
    required this.latitude,
    required this.longitude,
    required this.label,
    required this.source,
  });

  final double latitude;
  final double longitude;
  final String label;
  final String source;
}

class AddressSearchService {
  AddressSearchService({http.Client? client})
      : _client = client ?? http.Client();

  final http.Client _client;

  Future<List<AddressSearchResult>> search(String query) async {
    final original = query.trim();
    if (original.isEmpty) {
      return const [];
    }

    final candidates = _buildCandidates(original);
    final seen = <String>{};
    final results = <AddressSearchResult>[];

    for (final candidate in candidates) {
      try {
        final nativeResults = await locationFromAddress(candidate);
        for (final item in nativeResults.take(3)) {
          final key =
              '${item.latitude.toStringAsFixed(6)}:${item.longitude.toStringAsFixed(6)}';
          if (!seen.add(key)) {
            continue;
          }
          results.add(
            AddressSearchResult(
              latitude: item.latitude,
              longitude: item.longitude,
              label: candidate,
              source: 'device',
            ),
          );
        }
        if (results.isNotEmpty) {
          return results;
        }
      } catch (_) {
        // Fall through to online geocoder.
      }
    }

    for (final candidate in candidates) {
      final onlineResults = await _searchNominatim(candidate);
      for (final item in onlineResults) {
        final key =
            '${item.latitude.toStringAsFixed(6)}:${item.longitude.toStringAsFixed(6)}';
        if (!seen.add(key)) {
          continue;
        }
        results.add(item);
      }
      if (results.isNotEmpty) {
        return results;
      }
    }

    return const [];
  }

  String normalizeVietnameseAddress(String query) {
    final cleaned = query
        .trim()
        .replaceAll(';', ',')
        .replaceAll(RegExp(r'\s+'), ' ')
        .replaceAll(RegExp(r'\s*,\s*'), ', ')
        .replaceAll(RegExp(r',+'), ',');
    if (cleaned.isEmpty) {
      return '';
    }

    final parts = cleaned
        .split(',')
        .map((part) => _normalizeSegment(part.trim()))
        .where((part) => part.isNotEmpty)
        .toList();

    return parts.join(', ').replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  List<String> _buildCandidates(String query) {
    final normalized = normalizeVietnameseAddress(query);
    final lower = normalized.toLowerCase();
    final normalizedParts = normalized
        .split(',')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    final streetWithoutNumber = normalizedParts.isEmpty
        ? ''
        : normalizedParts.first
            .replaceFirst(RegExp(r'^\d+[A-Za-z/-]*\s*'), '')
            .trim();
    final truncatedCandidates = <String>[
      if (streetWithoutNumber.isNotEmpty &&
          normalizedParts.length >= 2 &&
          streetWithoutNumber != normalizedParts.first)
        [
          streetWithoutNumber,
          ...normalizedParts.skip(1),
        ].join(', '),
      if (normalizedParts.length >= 2) normalizedParts.skip(1).join(', '),
      if (normalizedParts.length >= 3)
        normalizedParts.skip(normalizedParts.length - 3).join(', '),
      if (normalizedParts.length >= 2)
        normalizedParts.skip(normalizedParts.length - 2).join(', '),
      if (normalizedParts.isNotEmpty) normalizedParts.last,
    ];
    final baseCandidates = <String>[
      query,
      if (normalized.isNotEmpty && normalized != query) normalized,
      ...truncatedCandidates,
    ];
    final candidates = <String>[
      ...baseCandidates,
      for (final candidate in baseCandidates)
        if (!_containsVietnam(candidate)) '$candidate, Vietnam',
      if (!lower.contains('ho chi minh') &&
          !lower.contains('ha noi') &&
          !lower.contains('da nang') &&
          !lower.contains('can tho')) ...[
        '$normalized, Ho Chi Minh City, Vietnam',
        '$normalized, Hanoi, Vietnam',
      ],
    ];

    final unique = <String>{};
    final ordered = <String>[];
    for (final candidate in candidates) {
      final value = candidate.trim();
      if (value.isEmpty || !unique.add(value.toLowerCase())) {
        continue;
      }
      ordered.add(value);
    }
    return ordered;
  }

  bool _containsVietnam(String value) {
    final lower = value.toLowerCase();
    return lower.contains('vietnam') || lower.contains('viet nam');
  }

  String _normalizeSegment(String segment) {
    if (segment.isEmpty) {
      return '';
    }
    final lower = segment.toLowerCase();

    const exactCities = <String, String>{
      'hcm': 'Ho Chi Minh City',
      'tphcm': 'Ho Chi Minh City',
      'tp hcm': 'Ho Chi Minh City',
      'tp. hcm': 'Ho Chi Minh City',
      'sai gon': 'Ho Chi Minh City',
      'saigon': 'Ho Chi Minh City',
      'sg': 'Ho Chi Minh City',
      'ho chi minh': 'Ho Chi Minh City',
      'ho chi minh city': 'Ho Chi Minh City',
      'hn': 'Hanoi',
      'ha noi': 'Hanoi',
      'hanoi': 'Hanoi',
      'dn': 'Da Nang',
      'da nang': 'Da Nang',
      'danang': 'Da Nang',
      'can tho': 'Can Tho',
      'cantho': 'Can Tho',
    };
    final exactCity = exactCities[lower];
    if (exactCity != null) {
      return exactCity;
    }

    final quanMatch = RegExp(
      r'^q\.?\s*(\d+)$|^q(\d+)$|^quan\s+(.+)$|^district\s+(.+)$|^dist\.?\s+(.+)$',
      caseSensitive: false,
    ).firstMatch(segment);
    if (quanMatch != null) {
      final value = quanMatch.group(1) ??
          quanMatch.group(2) ??
          quanMatch.group(3) ??
          quanMatch.group(4) ??
          quanMatch.group(5) ??
          '';
      return 'District ${_titleCase(value)}'.trim();
    }

    final phuongMatch = RegExp(
      r'^p\.?\s*(\d+)$|^p(\d+)$|^phuong\s+(.+)$|^ward\s+(.+)$',
      caseSensitive: false,
    ).firstMatch(segment);
    if (phuongMatch != null) {
      final value = phuongMatch.group(1) ??
          phuongMatch.group(2) ??
          phuongMatch.group(3) ??
          phuongMatch.group(4) ??
          '';
      return 'Ward ${_titleCase(value)}'.trim();
    }

    final xaMatch = RegExp(
      r'^x\.?\s+(.+)$|^xa\s+(.+)$|^commune\s+(.+)$',
      caseSensitive: false,
    ).firstMatch(segment);
    if (xaMatch != null) {
      final value =
          xaMatch.group(1) ?? xaMatch.group(2) ?? xaMatch.group(3) ?? '';
      return 'Commune ${_titleCase(value)}'.trim();
    }

    final huyenMatch = RegExp(
      r'^h\.?\s+(.+)$|^huyen\s+(.+)$|^district\s+(.+)$',
      caseSensitive: false,
    ).firstMatch(segment);
    if (huyenMatch != null) {
      final value = huyenMatch.group(1) ??
          huyenMatch.group(2) ??
          huyenMatch.group(3) ??
          '';
      return 'District ${_titleCase(value)}'.trim();
    }

    final cityPrefixMatch =
        RegExp(r'^(?:tp\.?|thanh pho|city)\s+(.+)$', caseSensitive: false)
            .firstMatch(segment);
    if (cityPrefixMatch != null) {
      return '${_titleCase(cityPrefixMatch.group(1)!)} City';
    }

    final tinhMatch =
        RegExp(r'^(?:tinh|province)\s+(.+)$', caseSensitive: false)
            .firstMatch(segment);
    if (tinhMatch != null) {
      return '${_titleCase(tinhMatch.group(1)!)} Province';
    }

    return _titleCase(segment);
  }

  String _titleCase(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      return '';
    }
    return trimmed.split(RegExp(r'\s+')).map((part) {
      if (part.isEmpty) {
        return part;
      }
      final lower = part.toLowerCase();
      return '${lower[0].toUpperCase()}${lower.substring(1)}';
    }).join(' ');
  }

  Future<List<AddressSearchResult>> _searchNominatim(String query) async {
    final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
      'q': query,
      'format': 'jsonv2',
      'limit': '5',
      'countrycodes': 'vn',
      'accept-language': 'en',
      'addressdetails': '1',
    });

    final response = await _client.get(
      uri,
      headers: const {
        'User-Agent': 'KamatchaMobile/1.0 (address-search)',
        'Accept': 'application/json',
      },
    );

    if (response.statusCode >= 400) {
      return const [];
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! List) {
      return const [];
    }

    return decoded
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .map((item) {
          final lat = double.tryParse('${item['lat']}');
          final lon = double.tryParse('${item['lon']}');
          if (lat == null || lon == null) {
            return null;
          }
          final label = (item['display_name'] as String?)?.trim();
          return AddressSearchResult(
            latitude: lat,
            longitude: lon,
            label: (label == null || label.isEmpty) ? query : label,
            source: 'nominatim',
          );
        })
        .whereType<AddressSearchResult>()
        .toList();
  }
}
