import 'dart:math' as math;

import '../models/models.dart';

class MockData {
  static final Map<int, int> _voucherOwnedCounts = {501: 1};

  static final List<StoreCard> _stores = [
    StoreCard(
      id: 1,
      slug: 'tea-house-q1',
      name: 'Tea House Q1',
      description: 'Fresh matcha drinks in the city center.',
      address: '12 Nguyen Trai, District 1',
      area: 'District 1',
      positionLabel: 'Center',
      latitude: 10.7747,
      longitude: 106.6981,
      imagePaths: const ['/uploads/stores/tea-house-q1.jpg'],
      highlightSummary: 'Best seller matcha drinks and cozy seating.',
      highlightTags: const ['Matcha', 'Workshop', 'Takeaway'],
      averageRating: 4.8,
      reviewCount: 128,
      favoriteCount: 240,
      availableItemCount: 18,
      open: true,
      disabled: false,
      sections: const [
        ContentSection(
          title: 'Workshop space',
          content:
              'Co khu slow bar, ban dai va workshop cuoi tuan cho nhom ban.',
          imagePath: '/uploads/stores/workshop.jpg',
        ),
        ContentSection(
          title: 'Signature layout',
          content:
              'Tong xanh la, go am va line order ro rang de khach moi vao cung de di.',
          imagePath: '/uploads/stores/layout.jpg',
        ),
      ],
      distanceKm: 1.4,
    ),
    StoreCard(
      id: 2,
      slug: 'airport-hub',
      name: 'Kamatcha Airport Hub',
      description: 'Grab and go bottled brew before flights.',
      address: '45 Truong Son, Tan Binh',
      area: 'Tan Binh',
      positionLabel: 'Airport',
      latitude: 10.8132,
      longitude: 106.6621,
      imagePaths: const ['/uploads/stores/airport-hub.jpg'],
      highlightSummary: 'Early opening hours and bottled signature line.',
      highlightTags: const ['Airport', 'Bottled brew', 'Fast'],
      averageRating: 4.6,
      reviewCount: 64,
      favoriteCount: 133,
      availableItemCount: 12,
      open: false,
      disabled: false,
      sections: const [
        ContentSection(
          title: 'Travel-first setup',
          content: 'Compact space, short order lines, and a strong focus on quick pickup.',
          imagePath: '/uploads/stores/travel.jpg',
        ),
      ],
      distanceKm: 5.8,
    ),
  ];

  static final List<EventCard> _events = [
    EventCard(
      id: 301,
      slug: 'spring-matcha-party',
      name: 'Spring Matcha Party',
      storeName: 'Tea House Q1',
      location: 'Tea House Q1',
      scheduleText: 'Every weekend in March',
      imagePaths: const ['/uploads/events/spring-party.jpg'],
      highlightSummary: 'Limited event drinks and tasting flights.',
      highlightTags: const ['Event', 'Limited', 'Weekend'],
      startsAt: DateTime(2026, 3, 25, 10),
      endsAt: DateTime(2026, 3, 30, 22),
      averageRating: 4.9,
      reviewCount: 48,
      remainingSlots: 22,
      sections: const [
        ContentSection(
          title: 'Lich trinh',
          content:
              'Mo dau bang tasting set, tiep theo la workshop latte art matcha.',
          imagePath: '/uploads/events/schedule.jpg',
        ),
      ],
    ),
    EventCard(
      id: 302,
      slug: 'bottled-brew-lab',
      name: 'Bottled Brew Lab',
      storeName: 'Kamatcha Airport Hub',
      location: 'Airport Hub',
      scheduleText: 'Fridays 18:00 - 20:00',
      imagePaths: const ['/uploads/events/bottle-lab.jpg'],
      highlightSummary: 'A quick-prep demo drink for guests on the go.',
      highlightTags: const ['Airport', 'Demo'],
      startsAt: DateTime(2026, 4, 2, 18),
      endsAt: DateTime(2026, 4, 30, 20),
      averageRating: 4.7,
      reviewCount: 21,
      remainingSlots: 16,
      sections: const [
        ContentSection(
          title: 'Focus',
          content:
              'Tap trung vao recipe bottled brew va tea fizz dung nhiet do.',
          imagePath: '/uploads/events/focus.jpg',
        ),
      ],
    ),
  ];

  static final List<DishCard> _dishes = [
    DishCard(
      id: 88,
      categoryId: 9,
      categoryName: 'Drinks',
      name: 'Matcha Latte',
      description: 'Creamy matcha latte with balanced sweetness.',
      note: 'Less sugar by default.',
      price: 90000,
      status: 'ACTIVE',
      franchiseRequired: false,
      franchiseNote: null,
      imagePaths: const ['/uploads/dishes/matcha-latte.jpg'],
      highlightSummary: 'Top rated drink.',
      highlightTags: const ['Popular'],
      averageRating: 4.9,
      reviewCount: 88,
      orderCount: 340,
      favoriteCount: 210,
      stock: 20,
      available: true,
      disabled: false,
      active: true,
      storeId: 1,
      storeName: 'Tea House Q1',
      sections: const [
        ContentSection(
          title: 'Flavor notes',
          content: 'Kem sua va bot matcha xay moi, hau vi sach va beo nhe.',
          imagePath: '/uploads/dishes/flavor.jpg',
        ),
      ],
      bestStore: const BestStore(
        id: 1,
        storeId: 1,
        storeSlug: 'tea-house-q1',
        storeName: 'Tea House Q1',
        address: '12 Nguyen Trai, District 1',
        area: 'District 1',
        distanceKm: 1.4,
        stock: 20,
        open: true,
        available: true,
        disabled: false,
        schedulable: true,
        price: 90000,
        imagePaths: ['/uploads/stores/tea-house-q1.jpg'],
      ),
    ),
    DishCard(
      id: 89,
      categoryId: 9,
      categoryName: 'Drinks',
      name: 'Iced Matcha Latte',
      description: 'Cold version with stronger tea aroma.',
      note: 'Good for hot days.',
      price: 65000,
      status: 'ACTIVE',
      franchiseRequired: false,
      franchiseNote: null,
      imagePaths: const ['/uploads/dishes/iced-matcha.jpg'],
      highlightSummary: 'Best value everyday pick.',
      highlightTags: const ['Cold', 'Best value'],
      averageRating: 4.8,
      reviewCount: 74,
      orderCount: 300,
      favoriteCount: 180,
      stock: 24,
      available: true,
      disabled: false,
      active: true,
      storeId: 1,
      storeName: 'Tea House Q1',
      sections: const [
        ContentSection(
          title: 'Texture',
          content: 'Da nhieu hon, vi dam hon va rat hop voi quick pickup.',
          imagePath: '/uploads/dishes/texture.jpg',
        ),
      ],
      bestStore: const BestStore(
        id: 1,
        storeId: 1,
        storeSlug: 'tea-house-q1',
        storeName: 'Tea House Q1',
        address: '12 Nguyen Trai, District 1',
        area: 'District 1',
        distanceKm: 1.4,
        stock: 24,
        open: true,
        available: true,
        disabled: false,
        schedulable: true,
        price: 65000,
        imagePaths: ['/uploads/stores/tea-house-q1.jpg'],
      ),
    ),
    DishCard(
      id: 90,
      categoryId: 10,
      categoryName: 'Bottled Brew',
      name: 'Bottled Matcha Brew',
      description: 'Ready-to-go bottled brew for travel days.',
      note: 'Keep chilled.',
      price: 89000,
      status: 'ACTIVE',
      franchiseRequired: false,
      franchiseNote: null,
      imagePaths: const ['/uploads/dishes/bottled-brew.jpg'],
      highlightSummary: 'Designed for airport pickup.',
      highlightTags: const ['Travel', 'Bottled'],
      averageRating: 4.7,
      reviewCount: 46,
      orderCount: 140,
      favoriteCount: 95,
      stock: 14,
      available: true,
      disabled: false,
      active: true,
      storeId: 2,
      storeName: 'Kamatcha Airport Hub',
      sections: const [
        ContentSection(
          title: 'Convenience',
          content: 'Dong chai san, gon va de mang len may bay.',
          imagePath: '/uploads/dishes/convenience.jpg',
        ),
      ],
      bestStore: const BestStore(
        id: 2,
        storeId: 2,
        storeSlug: 'airport-hub',
        storeName: 'Kamatcha Airport Hub',
        address: '45 Truong Son, Tan Binh',
        area: 'Tan Binh',
        distanceKm: 5.8,
        stock: 14,
        open: false,
        available: true,
        disabled: false,
        schedulable: true,
        price: 89000,
        imagePaths: ['/uploads/stores/airport-hub.jpg'],
      ),
    ),
  ];

  static final List<PromotionCard> _promotions = [
    PromotionCard(
      id: 501,
      code: 'MATCHA10',
      name: '10% off signature drinks',
      description:
          'Applies to signature drinks across the whole system, regardless of store.',
      scope: 'DISH',
      discountType: 'PERCENT',
      discountTarget: 'ITEMS',
      discountValue: 10,
      creditCost: 120,
      minOrderAmount: 120000,
      maxDiscountAmount: 30000,
      storeNames: const [],
      applicableDishIds: const [88, 89],
      startsAt: DateTime(2026, 4, 1),
      endsAt: DateTime(2026, 4, 30, 23, 59),
    ),
    PromotionCard(
      id: 502,
      code: 'SHIPFREE25',
      name: 'Shipping support',
      description:
          'Directly reduces shipping fees for orders with signature items once the address and coordinates are available.',
      scope: 'ORDER',
      discountType: 'FIXED_AMOUNT',
      discountTarget: 'SHIPPING',
      discountValue: 25000,
      creditCost: 160,
      minOrderAmount: 180000,
      maxDiscountAmount: 25000,
      storeNames: const [],
      applicableDishIds: const [],
      startsAt: DateTime(2026, 4, 10),
      endsAt: DateTime(2026, 5, 5, 23, 59),
    ),
    PromotionCard(
      id: 503,
      code: 'WELCOME15',
      name: 'First order offer of the week',
      description: 'Get 15% off the first signature order during the active offer window.',
      scope: 'ORDER',
      discountType: 'PERCENT',
      discountTarget: 'BOTH',
      discountValue: 15,
      creditCost: 140,
      minOrderAmount: 99000,
      maxDiscountAmount: 35000,
      storeNames: const [],
      applicableDishIds: const [],
      startsAt: DateTime(2026, 4, 12),
      endsAt: DateTime(2026, 5, 12, 23, 59),
    ),
    PromotionCard(
      id: 504,
      code: 'PUREMATCHA',
      name: 'Extra savings for the best seller',
      description:
          'Applies to the top-selling signature items of the day across the system.',
      scope: 'DISH',
      discountType: 'FIXED_AMOUNT',
      discountTarget: 'ITEMS',
      discountValue: 18000,
      creditCost: 90,
      minOrderAmount: 89000,
      maxDiscountAmount: 18000,
      storeNames: const [],
      applicableDishIds: const [88],
      startsAt: DateTime(2026, 4, 15),
      endsAt: DateTime(2026, 5, 18, 23, 59),
    ),
    PromotionCard(
      id: 505,
      code: 'AFTERNOON25',
      name: 'Afternoon offer',
      description:
          'Discounts both items and shipping for afternoon signature orders to encourage quick repeat purchases.',
      scope: 'ORDER',
      discountType: 'FIXED_AMOUNT',
      discountTarget: 'BOTH',
      discountValue: 25000,
      creditCost: 130,
      minOrderAmount: 150000,
      maxDiscountAmount: 25000,
      storeNames: const [],
      applicableDishIds: const [],
      startsAt: DateTime(2026, 4, 14),
      endsAt: DateTime(2026, 5, 20, 23, 59),
    ),
    PromotionCard(
      id: 506,
      code: 'GREENDAY20',
      name: 'Green deal for the whole group',
      description:
          'Get 20% off signature items when placing a large order, regardless of store.',
      scope: 'DISH',
      discountType: 'PERCENT',
      discountTarget: 'ITEMS',
      discountValue: 20,
      creditCost: 180,
      minOrderAmount: 200000,
      maxDiscountAmount: 50000,
      storeNames: const [],
      applicableDishIds: const [88, 89],
      startsAt: DateTime(2026, 4, 15),
      endsAt: DateTime(2026, 5, 25, 23, 59),
    ),
  ];

  static final Map<int, List<StoreAvailability>> _availabilityByDish = {
    88: const [
      StoreAvailability(
        id: 1,
        storeId: 1,
        storeSlug: 'tea-house-q1',
        storeName: 'Tea House Q1',
        address: '12 Nguyen Trai, District 1',
        area: 'District 1',
        distanceKm: 1.4,
        stock: 20,
        available: true,
        disabled: false,
        schedulable: true,
        price: 90000,
        imagePaths: ['/uploads/stores/tea-house-q1.jpg'],
        storeOpen: true,
        storeDisabled: false,
      ),
    ],
    89: const [
      StoreAvailability(
        id: 1,
        storeId: 1,
        storeSlug: 'tea-house-q1',
        storeName: 'Tea House Q1',
        address: '12 Nguyen Trai, District 1',
        area: 'District 1',
        distanceKm: 1.4,
        stock: 24,
        available: true,
        disabled: false,
        schedulable: true,
        price: 65000,
        imagePaths: ['/uploads/stores/tea-house-q1.jpg'],
        storeOpen: true,
        storeDisabled: false,
      ),
    ],
    90: const [
      StoreAvailability(
        id: 2,
        storeId: 2,
        storeSlug: 'airport-hub',
        storeName: 'Kamatcha Airport Hub',
        address: '45 Truong Son, Tan Binh',
        area: 'Tan Binh',
        distanceKm: 5.8,
        stock: 14,
        available: true,
        disabled: false,
        schedulable: true,
        price: 89000,
        imagePaths: ['/uploads/stores/airport-hub.jpg'],
        storeOpen: false,
        storeDisabled: false,
      ),
    ],
  };

  static final Map<int, List<CategorySection>> _categoriesByStore = {
    1: [
      CategorySection(
        id: 9,
        title: 'Drinks',
        name: 'Drinks',
        description: 'Matcha and tea drinks that can be ordered quickly.',
        imagePaths: const ['/uploads/categories/drinks.jpg'],
        averageRating: 4.8,
        reviewCount: 112,
        items: [_toStoreDishItem(_dishes[0]), _toStoreDishItem(_dishes[1])],
      ),
    ],
    2: [
      CategorySection(
        id: 10,
        title: 'Travel line',
        name: 'Travel line',
        description: 'A compact bottled brew line for customers on the go.',
        imagePaths: const ['/uploads/categories/travel-line.jpg'],
        averageRating: 4.6,
        reviewCount: 52,
        items: [_toStoreDishItem(_dishes[2])],
      ),
    ],
  };

  static final List<NewsCard> _news = [
    NewsCard(
      id: 901,
      title: 'Kamatcha Airport Hub is now open',
      slug: 'kamatcha-airport-hub-now-open',
      summary: 'The new branch near the airport is now ready to welcome guests.',
      relatedStoreName: 'Kamatcha Airport Hub',
      tags: const ['opening', 'airport'],
      imagePaths: const ['/uploads/news/airport-hub-1.jpg'],
      featured: true,
      publishedAt: DateTime(2026, 3, 20, 2),
    ),
    NewsCard(
      id: 902,
      title: 'Matcha Guide April',
      slug: 'matcha-guide-april',
      summary: 'Suggestions for choosing flavors, ice, and toppings for each preference.',
      relatedStoreName: 'Tea House Q1',
      tags: const ['guide', 'menu'],
      imagePaths: const ['/uploads/news/guide-april.jpg'],
      featured: false,
      publishedAt: DateTime(2026, 3, 28, 9),
    ),
  ];

  static final List<NewsDetail> _newsDetails = [
    const NewsDetail(
      id: 901,
      title: 'Kamatcha Airport Hub is now open',
      slug: 'kamatcha-airport-hub-now-open',
      summary: 'The new branch near the airport is now ready to welcome guests.',
      relatedStoreName: 'Kamatcha Airport Hub',
      tags: ['opening', 'airport'],
      imagePaths: ['/uploads/news/airport-hub-1.jpg'],
      featured: true,
      publishedAt: null,
      content:
          'Kamatcha officially opened a new branch near the airport with a bottled brew and tea fizz menu.',
      sections: [
        ContentSection(
          title: 'Inspiration',
          content:
              'The space is designed for quick ordering, clear menu visibility, and fast pickup within minutes.',
          imagePath: '/uploads/news/inspiration.jpg',
        ),
      ],
    ),
    const NewsDetail(
      id: 902,
      title: 'Matcha Guide April',
      slug: 'matcha-guide-april',
      summary: 'Suggestions for choosing flavors, ice, and toppings for each preference.',
      relatedStoreName: 'Tea House Q1',
      tags: ['guide', 'menu'],
      imagePaths: ['/uploads/news/guide-april.jpg'],
      featured: false,
      publishedAt: null,
      content:
          'A short guide that helps new customers choose their drink quickly inside the app.',
      sections: [
        ContentSection(
          title: 'Start with the base flavor',
          content:
              'If you prefer something light, choose the iced latte. If you prefer a bolder taste, choose the hot classic latte.',
          imagePath: '/uploads/news/base-guide.jpg',
        ),
      ],
    ),
  ];

  static final Map<String, List<ReviewItem>> _reviewsByTarget = {
    'STORE:1': const [
      ReviewItem(
        id: 1,
        userName: 'Anna Nguyen',
        rating: 5,
        title: 'Great service',
        comment: 'Fast service, drinks are fresh and tasty.',
        targetType: 'STORE',
        targetId: 1,
      ),
    ],
    'DISH:88': const [
      ReviewItem(
        id: 21,
        userName: 'Minh Le',
        rating: 5,
        title: 'Very balanced',
        comment: 'Khong qua ngot, mui matcha rat sach.',
        targetType: 'DISH',
        targetId: 88,
      ),
    ],
  };

  static HomeBundle get home => HomeBundle(
        brand: 'Kamatcha',
        featuredStores: _stores,
        featuredDishes: _dishes,
        promotions: _promotions,
        upcomingEvents: _events,
        storeLocations: _stores,
        latestNews: _news,
      );

  static List<StoreCard> browseStores({
    String search = '',
    String sort = 'rating_desc',
    double? latitude,
    double? longitude,
  }) {
    final items = _stores
        .where(
          (store) =>
              _matches(search, '${store.name} ${store.area} ${store.address}'),
        )
        .toList();
    switch (sort) {
      case 'distance_asc':
        if (latitude != null && longitude != null) {
          items.sort((left, right) {
            final leftDistance = _distanceKm(
              latitude,
              longitude,
              left.latitude,
              left.longitude,
            );
            final rightDistance = _distanceKm(
              latitude,
              longitude,
              right.latitude,
              right.longitude,
            );
            return leftDistance.compareTo(rightDistance);
          });
        } else {
          items.sort(
            (left, right) => (left.distanceKm ?? double.infinity)
                .compareTo(right.distanceKm ?? double.infinity),
          );
        }
        break;
      case 'distance_desc':
        if (latitude != null && longitude != null) {
          items.sort((left, right) {
            final leftDistance = _distanceKm(
              latitude,
              longitude,
              left.latitude,
              left.longitude,
            );
            final rightDistance = _distanceKm(
              latitude,
              longitude,
              right.latitude,
              right.longitude,
            );
            return rightDistance.compareTo(leftDistance);
          });
        } else {
          items.sort(
            (left, right) =>
                (right.distanceKm ?? 0).compareTo(left.distanceKm ?? 0),
          );
        }
        break;
      default:
        items.sort((left, right) {
          final ratingCompare =
              right.averageRating.compareTo(left.averageRating);
          if (ratingCompare != 0) {
            return ratingCompare;
          }
          return right.reviewCount.compareTo(left.reviewCount);
        });
        break;
    }
    return items;
  }

  static StoreDetail storeDetail(String storeKey) {
    final store = _stores.firstWhere(
      (item) => item.slug == storeKey || item.id.toString() == storeKey,
      orElse: () => _stores.first,
    );
    return StoreDetail(
      store: store,
      stats: StoreStats(
        averageRating: store.averageRating,
        reviewCount: store.reviewCount,
        favoriteCount: store.favoriteCount,
        availableItemCount: store.availableItemCount,
      ),
      categories: _categoriesByStore[store.id] ?? const [],
      events: _events.where((event) => event.storeName == store.name).toList(),
      reviews: _reviewsByTarget['STORE:${store.id}'] ?? const [],
    );
  }

  static List<DishCard> browseDishes({
    String search = '',
    String sort = 'top_rated',
  }) {
    final items = _dishes
        .where((dish) => _matches(
            search, '${dish.name} ${dish.categoryName} ${dish.storeName}'))
        .toList();
    switch (sort) {
      case 'price_asc':
        items.sort((a, b) => a.price.compareTo(b.price));
        break;
      case 'price_desc':
        items.sort((a, b) => b.price.compareTo(a.price));
        break;
      case 'most_ordered':
        items.sort((a, b) => b.orderCount.compareTo(a.orderCount));
        break;
      default:
        items.sort((a, b) => b.averageRating.compareTo(a.averageRating));
        break;
    }
    return items;
  }

  static DishDetail dishDetail(int dishId) {
    final dish = _dishes.firstWhere((item) => item.id == dishId,
        orElse: () => _dishes.first);
    return DishDetail(
      dish: dish,
      stats: DishStats(
        averageRating: dish.averageRating,
        reviewCount: dish.reviewCount,
        orderCount: dish.orderCount,
        favoriteCount: dish.favoriteCount,
        totalStock: _availabilityByDish[dish.id]
                ?.fold<int>(0, (sum, item) => sum + item.stock) ??
            dish.stock,
      ),
      stores: _availabilityByDish[dish.id] ?? const [],
      reviews: _reviewsByTarget['DISH:${dish.id}'] ?? const [],
      relatedDishes: _dishes
          .where((item) =>
              item.categoryId == dish.categoryId && item.id != dish.id)
          .toList(),
    );
  }

  static List<NewsCard> browseNews({String search = '', bool? featured}) {
    return _news.where((item) {
      final searchMatch = _matches(
          search, '${item.title} ${item.summary} ${item.relatedStoreName}');
      final featureMatch = featured == null || item.featured == featured;
      return searchMatch && featureMatch;
    }).toList();
  }

  static List<EventCard> browseEvents({
    String search = '',
    String sort = 'date_asc',
  }) {
    final items = _events
        .where((event) => _matches(
            search, '${event.name} ${event.storeName} ${event.location}'))
        .toList();
    switch (sort) {
      case 'date_desc':
        items.sort((a, b) => (b.startsAt ?? DateTime(1970))
            .compareTo(a.startsAt ?? DateTime(1970)));
        break;
      case 'rating_desc':
        items.sort((a, b) => b.averageRating.compareTo(a.averageRating));
        break;
      case 'rating_asc':
        items.sort((a, b) => a.averageRating.compareTo(b.averageRating));
        break;
      default:
        items.sort((a, b) => (a.startsAt ?? DateTime(2100))
            .compareTo(b.startsAt ?? DateTime(2100)));
        break;
    }
    return items;
  }

  static EventDetail eventDetail(String eventKey) {
    final event = _events.firstWhere(
      (item) => item.slug == eventKey || item.id.toString() == eventKey,
      orElse: () => _events.first,
    );
    final store = _stores.firstWhere(
      (item) => item.name == event.storeName,
      orElse: () => _stores.first,
    );
    return EventDetail(
      id: event.id,
      slug: event.slug,
      name: event.name,
      storeName: event.storeName,
      location: event.location,
      scheduleText: event.scheduleText,
      imagePaths: event.imagePaths,
      highlightSummary: event.highlightSummary,
      highlightTags: event.highlightTags,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      averageRating: event.averageRating,
      reviewCount: event.reviewCount,
      remainingSlots: event.remainingSlots,
      sections: event.sections,
      storeId: store.id,
      storeSlug: store.slug,
      storeAddress: store.address,
      storeArea: store.area,
      description: event.highlightSummary,
      favoriteCount: 42,
      capacity: event.remainingSlots + 18,
      bookedCount: 18,
      disabled: false,
      disabledReason: null,
      distanceKm: store.distanceKm,
      store: store,
      reviews: _reviewsByTarget['STORE:${store.id}'] ?? const [],
      featuredDishes: _dishes
          .where((dish) => dish.storeId == store.id)
          .take(3)
          .map(
            (dish) => FeaturedDishPreview(
              id: dish.id,
              name: dish.name,
              price: dish.price,
              imagePaths: dish.imagePaths,
            ),
          )
          .toList(),
    );
  }

  static NewsDetail newsDetail(String newsKey) {
    return _newsDetails.firstWhere(
      (item) => item.slug == newsKey || item.id.toString() == newsKey,
      orElse: () => _newsDetails.first,
    );
  }

  static List<FavoriteItem> get favorites => [
        FavoriteItem(
          id: 1,
          targetType: 'STORE',
          targetId: 1,
          targetSlug: 'tea-house-q1',
          targetLabel: 'Store: Tea House Q1',
          targetImagePaths: const ['/uploads/stores/tea-house-q1.jpg'],
          purchased: true,
          createdAt: DateTime.now().subtract(const Duration(days: 3)),
        ),
        FavoriteItem(
          id: 2,
          targetType: 'DISH',
          targetId: 88,
          targetSlug: null,
          targetLabel: 'Dish: Matcha Latte',
          targetImagePaths: const ['/uploads/dishes/matcha-latte.jpg'],
          purchased: true,
          createdAt: DateTime.now().subtract(const Duration(days: 2)),
        ),
      ];

  static List<UserReview> get userReviews => [
        UserReview(
          id: 21,
          userId: 12,
          userName: 'Kamatcha Guest',
          userEmail: 'guest@kamatcha.local',
          targetType: 'STORE',
          targetId: 1,
          targetSlug: 'tea-house-q1',
          targetLabel: 'Store: Tea House Q1',
          targetImagePaths: const ['/uploads/stores/tea-house-q1.jpg'],
          rating: 5,
          title: 'Rat de quay lai',
          comment: 'Fast ordering, an easy menu, and friendly staff.',
          approved: true,
          createdAt: DateTime.now().subtract(const Duration(days: 6)),
          updatedAt: DateTime.now().subtract(const Duration(days: 6)),
        ),
      ];

  static List<CustomerFeedback> get feedbacks => [
        CustomerFeedback(
          id: 12,
          userId: 12,
          userName: 'Kamatcha Guest',
          userEmail: 'guest@kamatcha.local',
          category: 'DELIVERY',
          relatedStoreId: 1,
          relatedStoreSlug: 'tea-house-q1',
          relatedStoreName: 'Tea House Q1',
          relatedStoreAddress: '12 Nguyen Trai, District 1',
          relatedOrderId: 701,
          relatedOrderStatus: 'COMPLETED',
          relatedOrderPaymentStatus: 'PAID',
          relatedOrderPaymentReference: 'PAYOS-701',
          subject: 'Giao hoi cham',
          message: 'Don giao tre hon du kien 20 phut.',
          replyMessage:
              'The team has noted this and will coordinate shippers better during peak hours.',
          repliedAt: DateTime.now().subtract(const Duration(days: 1)),
          repliedByUserId: 1,
          repliedByUserName: 'Platform Admin',
          repliedByUserRole: 'ADMIN',
          createdAt: DateTime.now().subtract(const Duration(days: 2)),
          updatedAt: DateTime.now().subtract(const Duration(days: 1)),
        ),
      ];

  static List<UserNotificationItem> get notifications => [
        UserNotificationItem(
          id: 21,
          type: 'ORDER_STATUS',
          title: 'Order #701 update',
          message: 'Your order is being delivered.',
          relatedOrderId: 701,
          orderId: 701,
          relatedEventId: null,
          eventId: null,
          relatedEventSlug: null,
          eventSlug: null,
          relatedNewsId: null,
          newsId: null,
          relatedNewsSlug: null,
          newsSlug: null,
          relatedStoreId: 1,
          relatedStoreName: 'Tea House Q1',
          actionUrl: '/orders/701',
          read: false,
          readAt: null,
          createdAt: DateTime.now().subtract(const Duration(hours: 4)),
          updatedAt: DateTime.now().subtract(const Duration(hours: 4)),
        ),
      ];

  static List<UserLevel> get levels => const [
        UserLevel(
          storeId: 0,
          storeSlug: 'global',
          storeName: 'Toan he thong',
          currentYear: 2026,
          currentQuarter: 2,
          evaluatedYear: 2026,
          evaluatedQuarter: 2,
          qualifyingPaidAmount: 360000,
          levelId: 5,
          levelCode: 'SILVER',
          levelName: 'Silver',
          levelMinPaidAmount: 300,
          creditPoints: 240,
          levelMinCreditPoints: 300,
          membershipPoints: 360,
          levelMinMembershipPoints: 300,
          nextLevelId: 8,
          nextLevelCode: 'GOLD',
          nextLevelName: 'Gold',
          nextLevelMinCreditPoints: 700,
          nextLevelMinMembershipPoints: 700,
        ),
      ];

  static List<UserLevelDefinition> get levelDefinitions => const [
        UserLevelDefinition(
          id: 1,
          storeId: null,
          storeSlug: 'global',
          storeName: 'Toan he thong',
          code: 'BRONZE',
          name: 'Bronze',
          minPaidAmount: 0,
          minCreditPoints: 0,
          minMembershipPoints: 0,
          active: true,
          createdAt: null,
          updatedAt: null,
        ),
        UserLevelDefinition(
          id: 5,
          storeId: null,
          storeSlug: 'global',
          storeName: 'Toan he thong',
          code: 'SILVER',
          name: 'Silver',
          minPaidAmount: 300,
          minCreditPoints: 300,
          minMembershipPoints: 300,
          active: true,
          createdAt: null,
          updatedAt: null,
        ),
        UserLevelDefinition(
          id: 8,
          storeId: null,
          storeSlug: 'global',
          storeName: 'Toan he thong',
          code: 'GOLD',
          name: 'Gold',
          minPaidAmount: 700,
          minCreditPoints: 700,
          minMembershipPoints: 700,
          active: true,
          createdAt: null,
          updatedAt: null,
        ),
        UserLevelDefinition(
          id: 12,
          storeId: null,
          storeSlug: 'global',
          storeName: 'Toan he thong',
          code: 'PLATINUM',
          name: 'Platinum',
          minPaidAmount: 1200,
          minCreditPoints: 1200,
          minMembershipPoints: 1200,
          active: true,
          createdAt: null,
          updatedAt: null,
        ),
      ];

  static List<PromotionCard> get userVouchers => _promotions
      .map(
        (promotion) => PromotionCard(
          id: promotion.id,
          code: promotion.code,
          name: promotion.name,
          description: promotion.description,
          scope: promotion.scope,
          discountType: promotion.discountType,
          discountTarget: promotion.discountTarget,
          discountValue: promotion.discountValue,
          creditCost: promotion.creditCost,
          availableRedemptions: _voucherOwnedCounts[promotion.id] ?? 0,
          minOrderAmount: promotion.minOrderAmount,
          maxDiscountAmount: promotion.maxDiscountAmount,
          storeNames: promotion.storeNames,
          applicableDishIds: promotion.applicableDishIds,
          startsAt: promotion.startsAt,
          endsAt: promotion.endsAt,
        ),
      )
      .toList();

  static VoucherRedemptionResult redeemVoucher({
    required int promotionId,
    required int currentCreditPoints,
  }) {
    final promotion = _promotions.firstWhere(
      (item) => item.id == promotionId,
      orElse: () => throw StateError('Khong tim thay voucher nay.'),
    );
    if (promotion.creditCost <= 0) {
      throw StateError('Voucher nay khong can doi bang credit.');
    }
    if (currentCreditPoints < promotion.creditCost) {
      throw StateError('Ban khong du credit de doi voucher nay.');
    }
    final nextCount = (_voucherOwnedCounts[promotionId] ?? 0) + 1;
    _voucherOwnedCounts[promotionId] = nextCount;
    return VoucherRedemptionResult(
      message: 'Redeem voucher thanh cong',
      promotionId: promotionId,
      promotionCode: promotion.code,
      remainingCreditPoints: currentCreditPoints - promotion.creditCost,
      availableRedemptions: nextCount,
    );
  }

  static List<SupportStore> get supportStores => const [
        SupportStore(id: 1, name: 'Tea House Q1'),
        SupportStore(id: 2, name: 'Kamatcha Airport Hub'),
      ];

  static double _distanceKm(
    double startLatitude,
    double startLongitude,
    double? endLatitude,
    double? endLongitude,
  ) {
    if (endLatitude == null || endLongitude == null) {
      return double.infinity;
    }
    const earthRadiusKm = 6371.0;
    final latDelta = _degreesToRadians(endLatitude - startLatitude);
    final lngDelta = _degreesToRadians(endLongitude - startLongitude);
    final startLatRadians = _degreesToRadians(startLatitude);
    final endLatRadians = _degreesToRadians(endLatitude);
    final a = math.pow(math.sin(latDelta / 2), 2) +
        math.cos(startLatRadians) *
            math.cos(endLatRadians) *
            math.pow(math.sin(lngDelta / 2), 2);
    final c =
        2 * math.atan2(math.sqrt(a.toDouble()), math.sqrt(1 - a.toDouble()));
    return earthRadiusKm * c;
  }

  static double _degreesToRadians(double degrees) => degrees * math.pi / 180;

  static OrderDetail orderDetail(int orderId) {
    final summary = orders.firstWhere(
      (item) => item.id == orderId,
      orElse: () => orders.first,
    );
    return OrderDetail(
      id: summary.id,
      userId: 12,
      storeId: summary.id == 701 ? 1 : 2,
      storeSlug: summary.id == 701 ? 'tea-house-q1' : 'airport-hub',
      storeName: summary.storeName,
      status: summary.status,
      paymentStatus: summary.paymentStatus,
      paymentProvider: 'PAYOS',
      paymentReference: 'PAYOS-${summary.id}',
      paymentCheckoutUrl: 'https://payos.vn/checkout/${summary.id}',
      paymentQrCode: '',
      paymentExpiresAt: DateTime.now().add(const Duration(hours: 2)),
      paidAt: summary.paymentStatus == 'PAID'
          ? DateTime.now().subtract(const Duration(days: 1))
          : null,
      subtotalAmount: summary.totalAmount - summary.shippingFeeAmount,
      discountAmount: 0,
      shippingDistanceKm: summary.shippingDistanceKm,
      shippingFeeAmount: summary.shippingFeeAmount,
      shippingFeeBreakdown: [
        ShippingFeeBreakdownItem(
          storeId: summary.id == 701 ? 1 : 2,
          storeName: summary.storeName,
          distanceKm: summary.shippingDistanceKm,
          shippingFeeAmount: summary.shippingFeeAmount,
        ),
      ],
      totalAmount: summary.totalAmount,
      creditPointsAwarded: summary.paymentStatus == 'PAID' ? 122 : 0,
      promotionCode: '',
      promotionScope: '',
      promotionEligibleAmount: 0,
      promotionDishIds: const [],
      deliveryType: 'DELIVERY',
      scheduledDeliveryAt: null,
      deliveryFullName: 'Kamatcha Guest',
      deliveryPhoneNumber: '0909000000',
      deliveryAddress: '12 Nguyen Trai, District 1',
      confirmedByUserId: 5,
      confirmedByUserName: 'Store Manager',
      confirmedByUserRole: 'MANAGER',
      confirmedAt: DateTime.now().subtract(const Duration(hours: 5)),
      preparingStaffId:
          summary.status == 'OUT_FOR_DELIVERY' || summary.status == 'COMPLETED'
              ? 15
              : null,
      preparingStaffName:
          summary.status == 'OUT_FOR_DELIVERY' || summary.status == 'COMPLETED'
              ? 'Barista A'
              : null,
      deliveringShipperId:
          summary.status == 'OUT_FOR_DELIVERY' || summary.status == 'COMPLETED'
              ? 16
              : null,
      deliveringShipperName:
          summary.status == 'OUT_FOR_DELIVERY' || summary.status == 'COMPLETED'
              ? 'Shipper B'
              : null,
      deliveryProofImagePath: summary.status == 'COMPLETED'
          ? '/uploads/delivery-proofs/mock-order-${summary.id}.jpg'
          : null,
      deliveryProofCapturedAt: summary.status == 'COMPLETED'
          ? DateTime.now().subtract(const Duration(hours: 1))
          : null,
      deliveryProofUploadedAt: summary.status == 'COMPLETED'
          ? DateTime.now().subtract(const Duration(minutes: 55))
          : null,
      deliveryProofNote:
          summary.status == 'COMPLETED' ? 'Da giao cho le tan toa nha.' : null,
      statusSummary: summary.statusSummary,
      items: const [
        OrderLineItem(
          id: 5001,
          storeId: 1,
          storeSlug: 'tea-house-q1',
          storeName: 'Tea House Q1',
          dishId: 88,
          dishName: 'Matcha Latte',
          quantity: 2,
          unitPrice: 81000,
          totalPrice: 162000,
          imagePaths: ['/uploads/dishes/matcha-latte.jpg'],
          createdAt: null,
          updatedAt: null,
        ),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
      invoiceAvailable: summary.paymentStatus == 'PAID',
      invoiceNumber:
          summary.paymentStatus == 'PAID' ? 'TM-INV-00000${summary.id}' : null,
      invoicePreviewUrl: summary.paymentStatus == 'PAID'
          ? 'https://example.com/invoices/${summary.id}/preview'
          : null,
      invoiceDownloadUrl: summary.paymentStatus == 'PAID'
          ? 'https://example.com/invoices/${summary.id}/download'
          : null,
      allowedActions: summary.paymentStatus == 'PAID'
          ? const ['VIEW_INVOICE']
          : const ['REFRESH_PAYMENT'],
    );
  }

  static UserSession sessionFor(String email) {
    final normalizedEmail = email.isEmpty ? 'guest@kamatcha.local' : email;
    return UserSession(
      accessToken: 'mock-session-token',
      tokenType: 'Bearer',
      expiresAt: DateTime.now().add(const Duration(days: 7)),
      user: AppUser(
        id: 12,
        fullName: 'Kamatcha Guest',
        email: normalizedEmail,
        role: 'USER',
        creditPoints: 240,
        membershipPoints: 360,
        verified: true,
        profileCompleted: true,
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
        verifiedAt: DateTime.now().subtract(const Duration(days: 5)),
      ),
    );
  }

  static List<OrderSummary> get orders => [
        OrderSummary(
          id: 701,
          storeName: 'Tea House Q1',
          status: 'OUT_FOR_DELIVERY',
          paymentStatus: 'PAID',
          totalAmount: 162000,
          statusSummary: 'Your order is on the way',
          createdAt: null,
          confirmedByUserName: 'Store Manager',
          confirmedAt: DateTime.now().subtract(const Duration(hours: 5)),
          preparingStaffName: 'Barista A',
          deliveringShipperName: 'Shipper B',
          deliveryProofImagePath: null,
          shippingDistanceKm: 3.1,
          shippingFeeAmount: 12496,
        ),
        OrderSummary(
          id: 688,
          storeName: 'Kamatcha Airport Hub',
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          totalAmount: 89000,
          statusSummary: 'Da giao thanh cong',
          createdAt: null,
          confirmedByUserName: 'Airport Manager',
          confirmedAt:
              DateTime.now().subtract(const Duration(days: 1, hours: 2)),
          preparingStaffName: 'Barista C',
          deliveringShipperName: 'Shipper D',
          deliveryProofImagePath: '/uploads/delivery-proofs/mock-order-688.jpg',
          shippingDistanceKm: 2.4,
          shippingFeeAmount: 9600,
        ),
      ];

  static bool _matches(String query, String value) {
    if (query.trim().isEmpty) {
      return true;
    }
    return value.toLowerCase().contains(query.trim().toLowerCase());
  }

  static StoreDishItem _toStoreDishItem(DishCard dish) {
    return StoreDishItem(
      id: dish.id,
      categoryId: dish.categoryId,
      name: dish.name,
      description: dish.description,
      note: dish.note,
      price: dish.price,
      imagePaths: dish.imagePaths,
      highlightSummary: dish.highlightSummary,
      highlightTags: dish.highlightTags,
      averageRating: dish.averageRating,
      reviewCount: dish.reviewCount,
      orderCount: dish.orderCount,
      favoriteCount: dish.favoriteCount,
      stock: dish.stock,
      available: dish.available,
      disabled: dish.disabled,
      schedulable: true,
      sections: dish.sections,
      franchiseRequired: dish.franchiseRequired,
      franchiseNote: dish.franchiseNote,
    );
  }
}

