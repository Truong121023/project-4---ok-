import 'common_models.dart';

class EventCard {
  const EventCard({
    required this.id,
    required this.slug,
    required this.name,
    required this.storeName,
    required this.location,
    required this.scheduleText,
    required this.imagePaths,
    required this.highlightSummary,
    required this.highlightTags,
    required this.startsAt,
    required this.endsAt,
    required this.averageRating,
    required this.reviewCount,
    required this.remainingSlots,
    required this.sections,
  });

  factory EventCard.fromJson(JsonMap json) {
    return EventCard(
      id: asInt(json['id']),
      slug: asString(json['slug']),
      name: asString(json['name']).isEmpty ? asString(json['title']) : asString(json['name']),
      storeName: asString(json['storeName']),
      location: asString(json['location']),
      scheduleText: asString(json['scheduleText']),
      imagePaths: asStringList(json['imagePaths']),
      highlightSummary:
          asString(json['highlightSummary']).isEmpty ? asString(json['summary']) : asString(json['highlightSummary']),
      highlightTags: asStringList(json['highlightTags']),
      startsAt: asDateTime(json['startsAt']),
      endsAt: asDateTime(json['endsAt']),
      averageRating: asDouble(json['averageRating']),
      reviewCount: asInt(json['reviewCount']),
      remainingSlots: asInt(json['remainingSlots']),
      sections: asObjectList(json['sections'], ContentSection.fromJson),
    );
  }

  final int id;
  final String slug;
  final String name;
  final String storeName;
  final String location;
  final String scheduleText;
  final List<String> imagePaths;
  final String highlightSummary;
  final List<String> highlightTags;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final double averageRating;
  final int reviewCount;
  final int remainingSlots;
  final List<ContentSection> sections;
}

class NewsCard {
  const NewsCard({
    required this.id,
    required this.title,
    required this.slug,
    required this.summary,
    required this.relatedStoreName,
    required this.tags,
    required this.imagePaths,
    required this.featured,
    this.publishedAt,
  });

  factory NewsCard.fromJson(JsonMap json) {
    return NewsCard(
      id: asInt(json['id']),
      title: asString(json['title']),
      slug: asString(json['slug']),
      summary: asString(json['summary']),
      relatedStoreName: asString(json['relatedStoreName']),
      tags: asStringList(json['tags']),
      imagePaths: asStringList(json['imagePaths']),
      featured: asBool(json['featured']),
      publishedAt: asDateTime(json['publishedAt']),
    );
  }

  final int id;
  final String title;
  final String slug;
  final String summary;
  final String relatedStoreName;
  final List<String> tags;
  final List<String> imagePaths;
  final bool featured;
  final DateTime? publishedAt;
}

class NewsDetail extends NewsCard {
  const NewsDetail({
    required super.id,
    required super.title,
    required super.slug,
    required super.summary,
    required super.relatedStoreName,
    required super.tags,
    required super.imagePaths,
    required super.featured,
    required this.content,
    required this.sections,
    super.publishedAt,
  });

  factory NewsDetail.fromJson(JsonMap json) {
    final card = NewsCard.fromJson(json);
    return NewsDetail(
      id: card.id,
      title: card.title,
      slug: card.slug,
      summary: card.summary,
      relatedStoreName: card.relatedStoreName,
      tags: card.tags,
      imagePaths: card.imagePaths,
      featured: card.featured,
      publishedAt: card.publishedAt,
      content: asString(json['content']),
      sections: asObjectList(json['sections'], ContentSection.fromJson),
    );
  }

  final String content;
  final List<ContentSection> sections;
}

class StoreCard {
  const StoreCard({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.address,
    required this.area,
    required this.positionLabel,
    required this.imagePaths,
    required this.highlightSummary,
    required this.highlightTags,
    required this.averageRating,
    required this.reviewCount,
    required this.favoriteCount,
    required this.availableItemCount,
    required this.open,
    required this.disabled,
    required this.sections,
    this.distanceKm,
  });

  factory StoreCard.fromJson(JsonMap json) {
    return StoreCard(
      id: asInt(json['id']),
      slug: asString(json['slug']),
      name: asString(json['name']),
      description: asString(json['description']),
      address: asString(json['address']),
      area: asString(json['area']),
      positionLabel: asString(json['positionLabel']),
      imagePaths: asStringList(json['imagePaths']),
      highlightSummary: asString(json['highlightSummary']),
      highlightTags: asStringList(json['highlightTags']),
      averageRating: asDouble(json['averageRating']),
      reviewCount: asInt(json['reviewCount']),
      favoriteCount: asInt(json['favoriteCount']),
      availableItemCount: asInt(json['availableItemCount']),
      open: asBool(json['open'], true),
      disabled: asBool(json['disabled']),
      sections: asObjectList(json['sections'], ContentSection.fromJson),
      distanceKm: json['distanceKm'] == null ? null : asDouble(json['distanceKm']),
    );
  }

  final int id;
  final String slug;
  final String name;
  final String description;
  final String address;
  final String area;
  final String positionLabel;
  final List<String> imagePaths;
  final String highlightSummary;
  final List<String> highlightTags;
  final double averageRating;
  final int reviewCount;
  final int favoriteCount;
  final int availableItemCount;
  final bool open;
  final bool disabled;
  final List<ContentSection> sections;
  final double? distanceKm;
}

class StoreStats {
  const StoreStats({
    required this.averageRating,
    required this.reviewCount,
    required this.favoriteCount,
    required this.availableItemCount,
  });

  factory StoreStats.fromJson(JsonMap json) {
    return StoreStats(
      averageRating: asDouble(json['averageRating']),
      reviewCount: asInt(json['reviewCount']),
      favoriteCount: asInt(json['favoriteCount']),
      availableItemCount: asInt(json['availableItemCount']),
    );
  }

  final double averageRating;
  final int reviewCount;
  final int favoriteCount;
  final int availableItemCount;
}

class StoreDishItem {
  const StoreDishItem({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.description,
    required this.note,
    required this.price,
    required this.imagePaths,
    required this.highlightSummary,
    required this.highlightTags,
    required this.averageRating,
    required this.reviewCount,
    required this.orderCount,
    required this.favoriteCount,
    required this.stock,
    required this.available,
    required this.disabled,
    required this.schedulable,
    required this.sections,
    this.franchiseRequired = false,
    this.franchiseNote,
  });

  factory StoreDishItem.fromJson(JsonMap json) {
    return StoreDishItem(
      id: asInt(json['id']),
      categoryId: asInt(json['categoryId']),
      name: asString(json['name']),
      description: asString(json['description']),
      note: asString(json['note']),
      price: asDouble(json['price']),
      imagePaths: asStringList(json['imagePaths']),
      highlightSummary: asString(json['highlightSummary']),
      highlightTags: asStringList(json['highlightTags']),
      averageRating: asDouble(json['averageRating']),
      reviewCount: asInt(json['reviewCount']),
      orderCount: asInt(json['orderCount']),
      favoriteCount: asInt(json['favoriteCount']),
      stock: asInt(json['stock']),
      available: asBool(json['available'], true),
      disabled: asBool(json['disabled']),
      schedulable: asBool(json['schedulable'], true),
      sections: asObjectList(json['sections'], ContentSection.fromJson),
      franchiseRequired: asBool(json['franchiseRequired']),
      franchiseNote: asString(json['franchiseNote']).isEmpty ? null : asString(json['franchiseNote']),
    );
  }

  final int id;
  final int categoryId;
  final String name;
  final String description;
  final String note;
  final double price;
  final List<String> imagePaths;
  final String highlightSummary;
  final List<String> highlightTags;
  final double averageRating;
  final int reviewCount;
  final int orderCount;
  final int favoriteCount;
  final int stock;
  final bool available;
  final bool disabled;
  final bool schedulable;
  final List<ContentSection> sections;
  final bool franchiseRequired;
  final String? franchiseNote;
}

class CategorySection {
  const CategorySection({
    required this.id,
    required this.title,
    required this.name,
    required this.description,
    required this.imagePaths,
    required this.averageRating,
    required this.reviewCount,
    required this.items,
  });

  factory CategorySection.fromJson(JsonMap json) {
    return CategorySection(
      id: asInt(json['id']),
      title: asString(json['title']).isEmpty ? asString(json['name']) : asString(json['title']),
      name: asString(json['name']),
      description: asString(json['description']),
      imagePaths: asStringList(json['imagePaths']),
      averageRating: asDouble(json['averageRating']),
      reviewCount: asInt(json['reviewCount']),
      items: asObjectList(json['items'], StoreDishItem.fromJson),
    );
  }

  final int id;
  final String title;
  final String name;
  final String description;
  final List<String> imagePaths;
  final double averageRating;
  final int reviewCount;
  final List<StoreDishItem> items;
}

class StoreDetail {
  const StoreDetail({
    required this.store,
    required this.stats,
    required this.categories,
    required this.events,
    required this.reviews,
  });

  factory StoreDetail.fromJson(JsonMap json) {
    return StoreDetail(
      store: StoreCard.fromJson(Map<String, dynamic>.from(json['store'] as Map? ?? const {})),
      stats: StoreStats.fromJson(Map<String, dynamic>.from(json['stats'] as Map? ?? const {})),
      categories: asObjectList(json['categories'], CategorySection.fromJson),
      events: asObjectList(json['events'], EventCard.fromJson),
      reviews: asObjectList(json['reviews'], ReviewItem.fromJson),
    );
  }

  final StoreCard store;
  final StoreStats stats;
  final List<CategorySection> categories;
  final List<EventCard> events;
  final List<ReviewItem> reviews;
}

class BestStore {
  const BestStore({
    required this.id,
    required this.storeId,
    required this.storeSlug,
    required this.storeName,
    required this.address,
    required this.area,
    required this.distanceKm,
    required this.stock,
    required this.open,
    required this.available,
    required this.disabled,
    required this.schedulable,
    required this.price,
    required this.imagePaths,
  });

  factory BestStore.fromJson(JsonMap json) {
    return BestStore(
      id: asInt(json['id']),
      storeId: asInt(json['storeId']),
      storeSlug: asString(json['storeSlug']).isEmpty ? asString(json['slug']) : asString(json['storeSlug']),
      storeName: asString(json['storeName']).isEmpty ? asString(json['name']) : asString(json['storeName']),
      address: asString(json['address']),
      area: asString(json['area']),
      distanceKm: asDouble(json['distanceKm']),
      stock: asInt(json['stock']),
      open: asBool(json['open'], true),
      available: asBool(json['available'], true),
      disabled: asBool(json['disabled']),
      schedulable: asBool(json['schedulable'], true),
      price: asDouble(json['price']),
      imagePaths: asStringList(json['imagePaths']),
    );
  }

  final int id;
  final int storeId;
  final String storeSlug;
  final String storeName;
  final String address;
  final String area;
  final double distanceKm;
  final int stock;
  final bool open;
  final bool available;
  final bool disabled;
  final bool schedulable;
  final double price;
  final List<String> imagePaths;
}

class DishCard {
  const DishCard({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    required this.name,
    required this.description,
    required this.note,
    required this.price,
    required this.status,
    required this.franchiseRequired,
    required this.franchiseNote,
    required this.imagePaths,
    required this.highlightSummary,
    required this.highlightTags,
    required this.averageRating,
    required this.reviewCount,
    required this.orderCount,
    required this.favoriteCount,
    required this.stock,
    required this.available,
    required this.disabled,
    required this.active,
    required this.storeId,
    required this.storeName,
    required this.sections,
    this.bestStore,
  });

  factory DishCard.fromJson(JsonMap json) {
    return DishCard(
      id: asInt(json['id']),
      categoryId: asInt(json['categoryId']),
      categoryName: asString(json['categoryName']),
      name: asString(json['name']),
      description: asString(json['description']),
      note: asString(json['note']),
      price: asDouble(json['price']),
      status: asString(json['status'], 'ACTIVE'),
      franchiseRequired: asBool(json['franchiseRequired']),
      franchiseNote: asString(json['franchiseNote']).isEmpty ? null : asString(json['franchiseNote']),
      imagePaths: asStringList(json['imagePaths']),
      highlightSummary: asString(json['highlightSummary']),
      highlightTags: asStringList(json['highlightTags']),
      averageRating: asDouble(json['averageRating']),
      reviewCount: asInt(json['reviewCount']),
      orderCount: asInt(json['orderCount']),
      favoriteCount: asInt(json['favoriteCount']),
      stock: asInt(json['stock']),
      available: asBool(json['available'], true),
      disabled: asBool(json['disabled']),
      active: asBool(json['active'], true),
      storeId: asInt(json['storeId']),
      storeName: asString(json['storeName']),
      sections: asObjectList(json['sections'], ContentSection.fromJson),
      bestStore: json['bestStore'] is Map
          ? BestStore.fromJson(Map<String, dynamic>.from(json['bestStore'] as Map))
          : null,
    );
  }

  final int id;
  final int categoryId;
  final String categoryName;
  final String name;
  final String description;
  final String note;
  final double price;
  final String status;
  final bool franchiseRequired;
  final String? franchiseNote;
  final List<String> imagePaths;
  final String highlightSummary;
  final List<String> highlightTags;
  final double averageRating;
  final int reviewCount;
  final int orderCount;
  final int favoriteCount;
  final int stock;
  final bool available;
  final bool disabled;
  final bool active;
  final int storeId;
  final String storeName;
  final List<ContentSection> sections;
  final BestStore? bestStore;
}

class DishStats {
  const DishStats({
    required this.averageRating,
    required this.reviewCount,
    required this.orderCount,
    required this.favoriteCount,
    required this.totalStock,
  });

  factory DishStats.fromJson(JsonMap json) {
    return DishStats(
      averageRating: asDouble(json['averageRating']),
      reviewCount: asInt(json['reviewCount']),
      orderCount: asInt(json['orderCount']),
      favoriteCount: asInt(json['favoriteCount']),
      totalStock: asInt(json['totalStock'], asInt(json['stock'])),
    );
  }

  final double averageRating;
  final int reviewCount;
  final int orderCount;
  final int favoriteCount;
  final int totalStock;
}

class StoreAvailability {
  const StoreAvailability({
    required this.id,
    required this.storeId,
    required this.storeSlug,
    required this.storeName,
    required this.address,
    required this.area,
    required this.distanceKm,
    required this.stock,
    required this.available,
    required this.disabled,
    required this.schedulable,
    required this.price,
    required this.imagePaths,
    required this.storeOpen,
    required this.storeDisabled,
  });

  factory StoreAvailability.fromJson(JsonMap json) {
    return StoreAvailability(
      id: asInt(json['id']),
      storeId: asInt(json['storeId']),
      storeSlug: asString(json['storeSlug']).isEmpty ? asString(json['slug']) : asString(json['storeSlug']),
      storeName: asString(json['storeName']).isEmpty ? asString(json['name']) : asString(json['storeName']),
      address: asString(json['address']),
      area: asString(json['area']),
      distanceKm: asDouble(json['distanceKm']),
      stock: asInt(json['stock']),
      available: asBool(json['available'], true),
      disabled: asBool(json['disabled']),
      schedulable: asBool(json['schedulable'], true),
      price: asDouble(json['price']),
      imagePaths: asStringList(json['imagePaths']),
      storeOpen: asBool(json['storeOpen'], true),
      storeDisabled: asBool(json['storeDisabled']),
    );
  }

  final int id;
  final int storeId;
  final String storeSlug;
  final String storeName;
  final String address;
  final String area;
  final double distanceKm;
  final int stock;
  final bool available;
  final bool disabled;
  final bool schedulable;
  final double price;
  final List<String> imagePaths;
  final bool storeOpen;
  final bool storeDisabled;
}

class DishDetail {
  const DishDetail({
    required this.dish,
    required this.stats,
    required this.stores,
    required this.reviews,
    required this.relatedDishes,
  });

  factory DishDetail.fromJson(JsonMap json) {
    return DishDetail(
      dish: DishCard.fromJson(Map<String, dynamic>.from(json['dish'] as Map? ?? const {})),
      stats: DishStats.fromJson(Map<String, dynamic>.from(json['stats'] as Map? ?? const {})),
      stores: asObjectList(json['stores'], StoreAvailability.fromJson),
      reviews: asObjectList(json['reviews'], ReviewItem.fromJson),
      relatedDishes: asObjectList(json['relatedDishes'], DishCard.fromJson),
    );
  }

  final DishCard dish;
  final DishStats stats;
  final List<StoreAvailability> stores;
  final List<ReviewItem> reviews;
  final List<DishCard> relatedDishes;
}

class HomeBundle {
  const HomeBundle({
    required this.brand,
    required this.featuredStores,
    required this.featuredDishes,
    required this.upcomingEvents,
    required this.storeLocations,
    required this.latestNews,
  });

  factory HomeBundle.fromJson(JsonMap json) {
    return HomeBundle(
      brand: asString(json['brand'], 'Tea Matcha'),
      featuredStores: asObjectList(json['featuredStores'], StoreCard.fromJson),
      featuredDishes: asObjectList(json['featuredDishes'], DishCard.fromJson),
      upcomingEvents: asObjectList(json['upcomingEvents'], EventCard.fromJson),
      storeLocations: asObjectList(json['storeLocations'], StoreCard.fromJson),
      latestNews: asObjectList(json['latestNews'], NewsCard.fromJson),
    );
  }

  final String brand;
  final List<StoreCard> featuredStores;
  final List<DishCard> featuredDishes;
  final List<EventCard> upcomingEvents;
  final List<StoreCard> storeLocations;
  final List<NewsCard> latestNews;
}
