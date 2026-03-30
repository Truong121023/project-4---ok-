import '../models/models.dart';

class MockData {
  static final List<StoreCard> _stores = [
    StoreCard(
      id: 1,
      slug: 'tea-house-q1',
      name: 'Tea House Q1',
      description: 'Fresh matcha drinks in the city center.',
      address: '12 Nguyen Trai, District 1',
      area: 'District 1',
      positionLabel: 'Center',
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
          title: 'Khong gian workshop',
          content: 'Co khu slow bar, ban dai va workshop cuoi tuan cho nhom ban.',
          imagePath: '/uploads/stores/workshop.jpg',
        ),
        ContentSection(
          title: 'Signature layout',
          content: 'Tong xanh la, go am va line order ro rang de khach moi vao cung de di.',
          imagePath: '/uploads/stores/layout.jpg',
        ),
      ],
      distanceKm: 1.4,
    ),
    StoreCard(
      id: 2,
      slug: 'airport-hub',
      name: 'Tea Matcha Airport Hub',
      description: 'Grab and go bottled brew before flights.',
      address: '45 Truong Son, Tan Binh',
      area: 'Tan Binh',
      positionLabel: 'Airport',
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
          content: 'Khong gian gon, line order ngan va focus vao lay nhanh.',
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
          content: 'Mo dau bang tasting set, tiep theo la workshop latte art matcha.',
          imagePath: '/uploads/events/schedule.jpg',
        ),
      ],
    ),
    EventCard(
      id: 302,
      slug: 'bottled-brew-lab',
      name: 'Bottled Brew Lab',
      storeName: 'Tea Matcha Airport Hub',
      location: 'Airport Hub',
      scheduleText: 'Fridays 18:00 - 20:00',
      imagePaths: const ['/uploads/events/bottle-lab.jpg'],
      highlightSummary: 'Demo pha che nhanh cho khach di chuyen.',
      highlightTags: const ['Airport', 'Demo'],
      startsAt: DateTime(2026, 4, 2, 18),
      endsAt: DateTime(2026, 4, 30, 20),
      averageRating: 4.7,
      reviewCount: 21,
      remainingSlots: 16,
      sections: const [
        ContentSection(
          title: 'Focus',
          content: 'Tap trung vao recipe bottled brew va tea fizz dung nhiet do.',
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
          title: 'Huong vi',
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
      storeName: 'Tea Matcha Airport Hub',
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
        storeName: 'Tea Matcha Airport Hub',
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
        storeName: 'Tea Matcha Airport Hub',
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
        description: 'Matcha va tea drinks co the order nhanh.',
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
        description: 'Dong bottled brew gon nhe cho khach di chuyen.',
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
      title: 'Tea Matcha Airport Hub khai truong',
      slug: 'tea-matcha-airport-hub-khai-truong',
      summary: 'Chi nhanh moi gan san bay da san sang don khach.',
      relatedStoreName: 'Tea Matcha Airport Hub',
      tags: const ['khai-truong', 'san-bay'],
      imagePaths: const ['/uploads/news/airport-hub-1.jpg'],
      featured: true,
      publishedAt: DateTime(2026, 3, 20, 2),
    ),
    NewsCard(
      id: 902,
      title: 'Matcha guide thang 4',
      slug: 'matcha-guide-thang-4',
      summary: 'Goi y cach chon huong vi, da va topping hop tung khau vi.',
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
      title: 'Tea Matcha Airport Hub khai truong',
      slug: 'tea-matcha-airport-hub-khai-truong',
      summary: 'Chi nhanh moi gan san bay da san sang don khach.',
      relatedStoreName: 'Tea Matcha Airport Hub',
      tags: ['khai-truong', 'san-bay'],
      imagePaths: ['/uploads/news/airport-hub-1.jpg'],
      featured: true,
      publishedAt: null,
      content: 'Tea Matcha chinh thuc mo them diem ban tai khu vuc san bay voi menu bottled brew va tea fizz.',
      sections: [
        ContentSection(
          title: 'Nguon cam hung',
          content: 'Khong gian duoc thiet ke de order nhanh, nhin ro menu va lay do trong vai phut.',
          imagePath: '/uploads/news/inspiration.jpg',
        ),
      ],
    ),
    const NewsDetail(
      id: 902,
      title: 'Matcha guide thang 4',
      slug: 'matcha-guide-thang-4',
      summary: 'Goi y cach chon huong vi, da va topping hop tung khau vi.',
      relatedStoreName: 'Tea House Q1',
      tags: ['guide', 'menu'],
      imagePaths: ['/uploads/news/guide-april.jpg'],
      featured: false,
      publishedAt: null,
      content: 'Bai viet tong hop ngan gon de khach moi vao app van chon duoc mon nhanh.',
      sections: [
        ContentSection(
          title: 'Bat dau tu vi nen',
          content: 'Neu thich nhe, chon iced latte. Neu thich dam, chon classic latte nong.',
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
        brand: 'Tea Matcha',
        featuredStores: _stores,
        featuredDishes: _dishes,
        upcomingEvents: _events,
        storeLocations: _stores,
        latestNews: _news,
      );

  static List<StoreCard> browseStores({String search = ''}) {
    return _stores.where((store) => _matches(search, '${store.name} ${store.area} ${store.address}')).toList();
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
    final items =
        _dishes.where((dish) => _matches(search, '${dish.name} ${dish.categoryName} ${dish.storeName}')).toList();
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
    final dish = _dishes.firstWhere((item) => item.id == dishId, orElse: () => _dishes.first);
    return DishDetail(
      dish: dish,
      stats: DishStats(
        averageRating: dish.averageRating,
        reviewCount: dish.reviewCount,
        orderCount: dish.orderCount,
        favoriteCount: dish.favoriteCount,
        totalStock: _availabilityByDish[dish.id]?.fold<int>(0, (sum, item) => sum + item.stock) ?? dish.stock,
      ),
      stores: _availabilityByDish[dish.id] ?? const [],
      reviews: _reviewsByTarget['DISH:${dish.id}'] ?? const [],
      relatedDishes: _dishes.where((item) => item.categoryId == dish.categoryId && item.id != dish.id).toList(),
    );
  }

  static List<NewsCard> browseNews({String search = '', bool? featured}) {
    return _news.where((item) {
      final searchMatch = _matches(search, '${item.title} ${item.summary} ${item.relatedStoreName}');
      final featureMatch = featured == null || item.featured == featured;
      return searchMatch && featureMatch;
    }).toList();
  }

  static NewsDetail newsDetail(String newsKey) {
    return _newsDetails.firstWhere(
      (item) => item.slug == newsKey || item.id.toString() == newsKey,
      orElse: () => _newsDetails.first,
    );
  }

  static UserSession sessionFor(String email) {
    final normalizedEmail = email.isEmpty ? 'guest@teamatcha.local' : email;
    return UserSession(
      accessToken: 'mock-session-token',
      tokenType: 'Bearer',
      expiresAt: DateTime.now().add(const Duration(days: 7)),
      user: AppUser(
        id: 12,
        fullName: 'Tea Matcha Guest',
        email: normalizedEmail,
        role: 'USER',
        verified: true,
        profileCompleted: true,
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
        verifiedAt: DateTime.now().subtract(const Duration(days: 5)),
      ),
    );
  }

  static List<OrderSummary> get orders => const [
        OrderSummary(
          id: 701,
          storeName: 'Tea House Q1',
          status: 'OUT_FOR_DELIVERY',
          paymentStatus: 'PAID',
          totalAmount: 162000,
          statusSummary: 'Don hang dang duoc giao toi ban',
          createdAt: null,
        ),
        OrderSummary(
          id: 688,
          storeName: 'Tea Matcha Airport Hub',
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          totalAmount: 89000,
          statusSummary: 'Da giao thanh cong',
          createdAt: null,
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
