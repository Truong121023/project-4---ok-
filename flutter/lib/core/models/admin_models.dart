import 'common_models.dart';

class AdminDashboard {
  const AdminDashboard({
    required this.users,
    required this.stores,
    required this.events,
    required this.categories,
    required this.dishes,
    required this.reviews,
    required this.news,
  });

  factory AdminDashboard.fromJson(JsonMap json) {
    JsonMap parseRecord(JsonMap item) => Map<String, dynamic>.from(item);

    return AdminDashboard(
      users: asObjectList<JsonMap>(json['users'], parseRecord),
      stores: asObjectList<JsonMap>(json['stores'], parseRecord),
      events: asObjectList<JsonMap>(json['events'], parseRecord),
      categories: asObjectList<JsonMap>(json['categories'], parseRecord),
      dishes: asObjectList<JsonMap>(json['dishes'], parseRecord),
      reviews: asObjectList<JsonMap>(json['reviews'], parseRecord),
      news: asObjectList<JsonMap>(json['news'], parseRecord),
    );
  }

  final List<JsonMap> users;
  final List<JsonMap> stores;
  final List<JsonMap> events;
  final List<JsonMap> categories;
  final List<JsonMap> dishes;
  final List<JsonMap> reviews;
  final List<JsonMap> news;
}

class AdminSummary {
  const AdminSummary({
    required this.userCount,
    required this.storeCount,
    required this.eventCount,
    required this.categoryCount,
    required this.dishCount,
    required this.reviewCount,
    required this.newsCount,
  });

  factory AdminSummary.fromJson(JsonMap json) {
    return AdminSummary(
      userCount: asInt(json['userCount']),
      storeCount: asInt(json['storeCount']),
      eventCount: asInt(json['eventCount']),
      categoryCount: asInt(json['categoryCount']),
      dishCount: asInt(json['dishCount']),
      reviewCount: asInt(json['reviewCount']),
      newsCount: asInt(json['newsCount']),
    );
  }

  final int userCount;
  final int storeCount;
  final int eventCount;
  final int categoryCount;
  final int dishCount;
  final int reviewCount;
  final int newsCount;
}

class AdminListResult {
  const AdminListResult({
    required this.items,
    required this.page,
    required this.size,
    required this.totalItems,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrevious,
    required this.paged,
  });

  factory AdminListResult.fromPagedJson(JsonMap json) {
    JsonMap parseRecord(JsonMap item) => Map<String, dynamic>.from(item);

    final page = PageResponse<JsonMap>.fromJson(json, parseRecord);
    return AdminListResult(
      items: page.items,
      page: page.page,
      size: page.size,
      totalItems: page.totalItems,
      totalPages: page.totalPages,
      hasNext: page.hasNext,
      hasPrevious: page.hasPrevious,
      paged: true,
    );
  }

  factory AdminListResult.fromListJson(List<dynamic> json) {
    final items = json
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    return AdminListResult(
      items: items,
      page: 0,
      size: items.length,
      totalItems: items.length,
      totalPages: items.isEmpty ? 0 : 1,
      hasNext: false,
      hasPrevious: false,
      paged: false,
    );
  }

  final List<JsonMap> items;
  final int page;
  final int size;
  final int totalItems;
  final int totalPages;
  final bool hasNext;
  final bool hasPrevious;
  final bool paged;
}
