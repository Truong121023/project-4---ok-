import 'package:flutter/material.dart';

import '../../core/models/models.dart';
import '../../core/utils/formatters.dart';

enum AdminModuleMode {
  pagedList,
  plainList,
  queryDetail,
}

enum AdminFieldPreset {
  none,
  currentDate,
  currentMonth,
}

class AdminQueryField {
  const AdminQueryField({
    required this.key,
    required this.label,
    required this.hint,
    this.required = false,
    this.preset = AdminFieldPreset.none,
  });

  final String key;
  final String label;
  final String hint;
  final bool required;
  final AdminFieldPreset preset;
}

class AdminModuleDefinition {
  const AdminModuleDefinition({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.path,
    required this.group,
    required this.icon,
    this.searchHint = 'Tim kiem',
    this.supportsSearch = true,
    this.mode = AdminModuleMode.pagedList,
    this.filters = const [],
  });

  final String id;
  final String title;
  final String subtitle;
  final String path;
  final String group;
  final IconData icon;
  final String searchHint;
  final bool supportsSearch;
  final AdminModuleMode mode;
  final List<AdminQueryField> filters;

  bool get paged => mode == AdminModuleMode.pagedList;
  bool get isQueryModule => mode == AdminModuleMode.queryDetail;
}

const List<AdminModuleDefinition> adminModules = [
  AdminModuleDefinition(
    id: 'users',
    title: 'Users',
    subtitle: 'Accounts, roles, verification, and active status.',
    path: '/api/admin/users',
    group: 'Operations',
    icon: Icons.group_outlined,
    searchHint: 'Tim theo ten hoac email',
  ),
  AdminModuleDefinition(
    id: 'orders',
    title: 'Orders',
    subtitle: 'Theo doi don, payment status, stage va nguoi xu ly.',
    path: '/api/admin/orders',
    group: 'Operations',
    icon: Icons.receipt_long_outlined,
    searchHint: 'Tim theo ma don',
    filters: [
      AdminQueryField(key: 'status', label: 'Status', hint: 'PREPARING, COMPLETED...'),
      AdminQueryField(key: 'paymentStatus', label: 'Payment', hint: 'PAID, PENDING...'),
      AdminQueryField(key: 'stage', label: 'Stage', hint: 'PAID, PREPARING...'),
      AdminQueryField(key: 'storeId', label: 'Store ID', hint: 'Vi du 1'),
    ],
  ),
  AdminModuleDefinition(
    id: 'stores',
    title: 'Stores',
    subtitle: 'Branches, addresses, highlights, and long-form sections.',
    path: '/api/admin/stores',
    group: 'Operations',
    icon: Icons.storefront_outlined,
    searchHint: 'Tim theo ten store',
  ),
  AdminModuleDefinition(
    id: 'feedbacks',
    title: 'Feedbacks',
    subtitle: 'Moderation and admin replies for customer feedback.',
    path: '/api/admin/feedbacks',
    group: 'Operations',
    icon: Icons.forum_outlined,
    searchHint: 'Tim theo subject hoac message',
  ),
  AdminModuleDefinition(
    id: 'categories',
    title: 'Categories',
    subtitle: 'Item groups by store.',
    path: '/api/admin/categories',
    group: 'Catalog',
    icon: Icons.category_outlined,
    searchHint: 'Tim theo ten category',
  ),
  AdminModuleDefinition(
    id: 'dishes',
    title: 'Dishes',
    subtitle: 'Items, availability, pricing, and highlights.',
    path: '/api/admin/dishes',
    group: 'Catalog',
    icon: Icons.ramen_dining_outlined,
    searchHint: 'Tim theo ten dish',
  ),
  AdminModuleDefinition(
    id: 'store-dishes',
    title: 'Store Dishes',
    subtitle: 'Price overrides, quantities, and availability by branch.',
    path: '/api/admin/store-dishes',
    group: 'Catalog',
    icon: Icons.local_mall_outlined,
    searchHint: 'Tim theo store hoac dish',
  ),
  AdminModuleDefinition(
    id: 'promotions',
    title: 'Promotions',
    subtitle: 'Unpaged promotion list.',
    path: '/api/admin/promotions',
    group: 'Catalog',
    icon: Icons.local_offer_outlined,
    supportsSearch: false,
    mode: AdminModuleMode.plainList,
  ),
  AdminModuleDefinition(
    id: 'user-levels',
    title: 'User Levels',
    subtitle: 'Customer levels and spending thresholds.',
    path: '/api/admin/user-levels',
    group: 'Catalog',
    icon: Icons.workspace_premium_outlined,
    supportsSearch: false,
    mode: AdminModuleMode.plainList,
  ),
  AdminModuleDefinition(
    id: 'events',
    title: 'Events',
    subtitle: 'Events by store, time, capacity, and long-form content.',
    path: '/api/admin/events',
    group: 'Content',
    icon: Icons.event_outlined,
    searchHint: 'Tim theo ten event',
  ),
  AdminModuleDefinition(
    id: 'news',
    title: 'News',
    subtitle: 'Articles, slugs, publish state, and sections.',
    path: '/api/admin/news',
    group: 'Content',
    icon: Icons.newspaper_outlined,
    searchHint: 'Search by article title',
  ),
  AdminModuleDefinition(
    id: 'reviews',
    title: 'Reviews',
    subtitle: 'Xem va moderation review tu user.',
    path: '/api/admin/reviews',
    group: 'Content',
    icon: Icons.reviews_outlined,
    searchHint: 'Tim theo user hoac comment',
  ),
];

List<AdminModuleDefinition> modulesForGroup(String group) {
  return adminModules.where((module) => module.group == group).toList();
}

AdminModuleDefinition moduleById(String id) {
  return adminModules.firstWhere((module) => module.id == id);
}

String initialValueForField(AdminQueryField field) {
  final now = DateTime.now();
  return switch (field.preset) {
    AdminFieldPreset.none => '',
    AdminFieldPreset.currentDate =>
      '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}',
    AdminFieldPreset.currentMonth =>
      '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}',
  };
}

String adminPrimaryText(JsonMap item) {
  for (final key in const ['title', 'name', 'fullName', 'code', 'subject', 'email', 'slug']) {
    final value = asString(item[key]).trim();
    if (value.isNotEmpty) {
      return value;
    }
  }
  final id = item['id'];
  if (id != null) {
    return 'Record #$id';
  }
  return 'Admin record';
}

String adminSecondaryText(JsonMap item) {
  for (final key in const [
    'summary',
    'description',
    'statusSummary',
    'message',
    'note',
    'replyMessage',
    'highlightSummary',
    'address',
    'location',
    'email',
  ]) {
    final value = asString(item[key]).trim();
    if (value.isNotEmpty) {
      return value;
    }
  }
  final storeName = asString(item['storeName']).trim();
  final orderStatus = asString(item['status']).trim();
  if (storeName.isNotEmpty || orderStatus.isNotEmpty) {
    return [storeName, orderStatus].where((value) => value.isNotEmpty).join(' - ');
  }
  return '';
}

String? adminFirstImagePath(JsonMap item) {
  final imagePaths = asStringList(item['imagePaths']);
  if (imagePaths.isNotEmpty) {
    return imagePaths.first;
  }
  final imagePath = asString(item['imagePath']).trim();
  return imagePath.isEmpty ? null : imagePath;
}

List<String> adminChips(JsonMap item) {
  final chips = <String>[];

  for (final key in const [
    'role',
    'status',
    'paymentStatus',
    'stage',
    'scope',
    'discountType',
    'published',
    'featured',
    'active',
    'available',
    'enabled',
    'verified',
  ]) {
    if (!item.containsKey(key)) {
      continue;
    }
    chips.add('${adminFieldLabel(key)}: ${formatAdminValue(key, item[key])}');
  }

  final storeName = asString(item['storeName']).trim();
  if (storeName.isNotEmpty) {
    chips.add(storeName);
  }

  return chips.take(5).toList();
}

List<MapEntry<String, dynamic>> adminScalarEntries(JsonMap data) {
  const ignoredKeys = {
    'sections',
    'items',
    'entries',
    'files',
    'imagePaths',
    'imagePath',
    'summary',
    'description',
    'content',
    'message',
    'replyMessage',
    'note',
    'highlightSummary',
  };

  final entries = <MapEntry<String, dynamic>>[];
  for (final entry in data.entries) {
    final value = entry.value;
    if (ignoredKeys.contains(entry.key)) {
      continue;
    }
    if (value == null || value is Map || value is List) {
      continue;
    }
    final text = formatAdminValue(entry.key, value).trim();
    if (text.isEmpty || text == 'Updating') {
      continue;
    }
    entries.add(MapEntry(entry.key, value));
  }
  return entries;
}

List<MapEntry<String, String>> adminTextBlocks(JsonMap data) {
  final blocks = <MapEntry<String, String>>[];
  for (final key in const [
    'summary',
    'description',
    'highlightSummary',
    'note',
    'message',
    'replyMessage',
    'content',
    'address',
    'location',
  ]) {
    final value = asString(data[key]).trim();
    if (value.isNotEmpty) {
      blocks.add(MapEntry(key, value));
    }
  }
  return blocks;
}

List<MapEntry<String, List<String>>> adminPrimitiveLists(JsonMap data) {
  final result = <MapEntry<String, List<String>>>[];
  for (final entry in data.entries) {
    if (entry.value is! List) {
      continue;
    }
    final list = entry.value as List<dynamic>;
    if (list.isEmpty || list.any((item) => item is Map || item is List)) {
      continue;
    }
    final values = list.map((item) => item.toString()).where((item) => item.trim().isNotEmpty).toList();
    if (values.isNotEmpty) {
      result.add(MapEntry(entry.key, values));
    }
  }
  return result;
}

List<MapEntry<String, List<JsonMap>>> adminObjectLists(JsonMap data) {
  final result = <MapEntry<String, List<JsonMap>>>[];
  for (final entry in data.entries) {
    if (entry.value is! List) {
      continue;
    }
    final list = entry.value as List<dynamic>;
    final values = list.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
    if (values.isNotEmpty) {
      result.add(MapEntry(entry.key, values));
    }
  }
  return result.where((entry) => entry.key != 'sections').toList();
}

List<MapEntry<String, JsonMap>> adminObjectEntries(JsonMap data) {
  final result = <MapEntry<String, JsonMap>>[];
  for (final entry in data.entries) {
    if (entry.value is Map) {
      result.add(MapEntry(entry.key, Map<String, dynamic>.from(entry.value as Map)));
    }
  }
  return result;
}

List<ContentSection> adminSections(JsonMap data) {
  return asObjectList<ContentSection>(data['sections'], ContentSection.fromJson);
}

String adminFieldLabel(String key) {
  const overrides = {
    'id': 'ID',
    'storeId': 'Store ID',
    'userId': 'User ID',
    'workingStoreId': 'Working Store ID',
    'createdAt': 'Created At',
    'updatedAt': 'Updated At',
    'startsAt': 'Starts At',
    'endsAt': 'Ends At',
    'publishedAt': 'Published At',
    'openTime': 'Open Time',
    'closeTime': 'Close Time',
    'fullName': 'Full Name',
    'phoneNumber': 'Phone Number',
    'paymentStatus': 'Payment Status',
    'statusSummary': 'Status Summary',
    'replyMessage': 'Reply Message',
    'highlightSummary': 'Highlight Summary',
  };

  if (overrides.containsKey(key)) {
    return overrides[key]!;
  }

  final spaced = key
      .replaceAllMapped(RegExp(r'([a-z0-9])([A-Z])'), (match) => '${match.group(1)} ${match.group(2)}')
      .replaceAll('_', ' ');

  return spaced
      .split(' ')
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

String formatAdminValue(String key, dynamic value) {
  final normalizedKey = key.toLowerCase();

  if (value == null) {
    return 'Updating';
  }
  if (value is bool) {
    return value ? 'Bat' : 'Tat';
  }
  if (value is num) {
    if (normalizedKey.contains('price') || normalizedKey.contains('amount')) {
      return Formatters.currency(value);
    }
    return value.toString();
  }
  if (value is DateTime) {
    return Formatters.fullDateTime(value);
  }
  final text = value.toString();
  final parsedDate = asDateTime(text);
  if (parsedDate != null &&
      (normalizedKey.contains('date') ||
          normalizedKey.endsWith('at') ||
          normalizedKey.contains('time'))) {
    return text.contains('T') ? Formatters.fullDateTime(parsedDate) : Formatters.shortDate(parsedDate);
  }
  return text;
}

