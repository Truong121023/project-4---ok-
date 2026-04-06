import 'common_models.dart';

class AdminDashboard {
  const AdminDashboard({
    required this.users,
    required this.stores,
    required this.events,
    required this.categories,
    required this.dishes,
    required this.storeDishes,
    required this.orders,
    required this.reviews,
    required this.feedbacks,
    required this.promotions,
    required this.news,
    required this.topSellingDishes,
    required this.revenue,
  });

  factory AdminDashboard.fromJson(JsonMap json) {
    JsonMap parseRecord(JsonMap item) => Map<String, dynamic>.from(item);

    return AdminDashboard(
      users: asObjectList<JsonMap>(json['users'], parseRecord),
      stores: asObjectList<JsonMap>(json['stores'], parseRecord),
      events: asObjectList<JsonMap>(json['events'], parseRecord),
      categories: asObjectList<JsonMap>(json['categories'], parseRecord),
      dishes: asObjectList<JsonMap>(json['dishes'], parseRecord),
      storeDishes: asObjectList<JsonMap>(json['storeDishes'], parseRecord),
      orders: asObjectList<JsonMap>(json['orders'], parseRecord),
      reviews: asObjectList<JsonMap>(json['reviews'], parseRecord),
      feedbacks: asObjectList<JsonMap>(json['feedbacks'], parseRecord),
      promotions: asObjectList<JsonMap>(json['promotions'], parseRecord),
      news: asObjectList<JsonMap>(json['news'], parseRecord),
      topSellingDishes: asObjectList<AdminTopSellingDish>(
        json['topSellingDishes'],
        AdminTopSellingDish.fromJson,
      ),
      revenue: AdminRevenueSummary.fromJson(
        Map<String, dynamic>.from(json['revenue'] as Map? ?? const {}),
      ),
    );
  }

  final List<JsonMap> users;
  final List<JsonMap> stores;
  final List<JsonMap> events;
  final List<JsonMap> categories;
  final List<JsonMap> dishes;
  final List<JsonMap> storeDishes;
  final List<JsonMap> orders;
  final List<JsonMap> reviews;
  final List<JsonMap> feedbacks;
  final List<JsonMap> promotions;
  final List<JsonMap> news;
  final List<AdminTopSellingDish> topSellingDishes;
  final AdminRevenueSummary revenue;
}

class AdminSummary {
  const AdminSummary({
    required this.userCount,
    required this.storeCount,
    required this.eventCount,
    required this.categoryCount,
    required this.dishCount,
    required this.storeDishCount,
    required this.promotionCount,
    required this.orderCount,
    required this.reviewCount,
    required this.newsCount,
    required this.revenue,
  });

  factory AdminSummary.fromJson(JsonMap json) {
    return AdminSummary(
      userCount: asInt(json['userCount']),
      storeCount: asInt(json['storeCount']),
      eventCount: asInt(json['eventCount']),
      categoryCount: asInt(json['categoryCount']),
      dishCount: asInt(json['dishCount']),
      storeDishCount: asInt(json['storeDishCount']),
      promotionCount: asInt(json['promotionCount']),
      orderCount: asInt(json['orderCount']),
      reviewCount: asInt(json['reviewCount']),
      newsCount: asInt(json['newsCount']),
      revenue: AdminRevenueSummary.fromJson(
        Map<String, dynamic>.from(json['revenue'] as Map? ?? const {}),
      ),
    );
  }

  final int userCount;
  final int storeCount;
  final int eventCount;
  final int categoryCount;
  final int dishCount;
  final int storeDishCount;
  final int promotionCount;
  final int orderCount;
  final int reviewCount;
  final int newsCount;
  final AdminRevenueSummary revenue;
}

class AdminRevenueSummary {
  const AdminRevenueSummary({
    required this.scopeStoreId,
    required this.scopeStoreName,
    required this.todayRevenue,
    required this.weekRevenue,
    required this.monthRevenue,
    required this.yearRevenue,
  });

  factory AdminRevenueSummary.fromJson(JsonMap json) {
    return AdminRevenueSummary(
      scopeStoreId: asNullableInt(json['scopeStoreId']),
      scopeStoreName: asString(json['scopeStoreName']),
      todayRevenue: asDouble(json['todayRevenue']),
      weekRevenue: asDouble(json['weekRevenue']),
      monthRevenue: asDouble(json['monthRevenue']),
      yearRevenue: asDouble(json['yearRevenue']),
    );
  }

  final int? scopeStoreId;
  final String scopeStoreName;
  final double todayRevenue;
  final double weekRevenue;
  final double monthRevenue;
  final double yearRevenue;
}

class AdminTopSellingDish {
  const AdminTopSellingDish({
    required this.storeId,
    required this.storeName,
    required this.dishId,
    required this.dishName,
    required this.imagePaths,
    required this.quantitySold,
    required this.orderCount,
    required this.revenue,
  });

  factory AdminTopSellingDish.fromJson(JsonMap json) {
    return AdminTopSellingDish(
      storeId: asInt(json['storeId']),
      storeName: asString(json['storeName']),
      dishId: asInt(json['dishId']),
      dishName: asString(json['dishName']),
      imagePaths: asStringList(json['imagePaths']),
      quantitySold: asInt(json['quantitySold']),
      orderCount: asInt(json['orderCount']),
      revenue: asDouble(json['revenue']),
    );
  }

  final int storeId;
  final String storeName;
  final int dishId;
  final String dishName;
  final List<String> imagePaths;
  final int quantitySold;
  final int orderCount;
  final double revenue;
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

class AdminAiFormDraft {
  const AdminAiFormDraft({
    required this.formType,
    required this.draft,
    required this.warnings,
    required this.missingFields,
    required this.scopeStoreId,
    required this.scopeStoreName,
    required this.model,
  });

  factory AdminAiFormDraft.fromJson(JsonMap json) {
    return AdminAiFormDraft(
      formType: asString(json['formType']),
      draft: Map<String, dynamic>.from(json['draft'] as Map? ?? const {}),
      warnings: asStringList(json['warnings']),
      missingFields: asStringList(json['missingFields']),
      scopeStoreId: asNullableInt(json['scopeStoreId']),
      scopeStoreName: asNullableString(json['scopeStoreName']),
      model: asNullableString(json['model']),
    );
  }

  final String formType;
  final JsonMap draft;
  final List<String> warnings;
  final List<String> missingFields;
  final int? scopeStoreId;
  final String? scopeStoreName;
  final String? model;
}
