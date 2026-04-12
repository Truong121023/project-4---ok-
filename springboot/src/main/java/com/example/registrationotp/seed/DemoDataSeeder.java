package com.example.registrationotp.seed;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import javax.sql.DataSource;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.registrationotp.config.UploadProperties;
import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.CartStatus;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.ContentSection;
import com.example.registrationotp.model.CustomerFeedback;
import com.example.registrationotp.model.DeliveryType;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EmailOtp;
import com.example.registrationotp.model.EmployeeAttendance;
import com.example.registrationotp.model.EmployeeWorkSchedule;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.Favorite;
import com.example.registrationotp.model.FavoriteTargetType;
import com.example.registrationotp.model.FeedbackCategory;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.OtpPurpose;
import com.example.registrationotp.model.PaymentStatus;
import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;
import com.example.registrationotp.model.Review;
import com.example.registrationotp.model.ReviewTargetType;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserDeliveryAddress;
import com.example.registrationotp.model.UserLevelDefinition;
import com.example.registrationotp.model.UserNotification;
import com.example.registrationotp.model.UserNotificationType;
import com.example.registrationotp.model.UserSession;
import com.example.registrationotp.repository.CartItemRepository;
import com.example.registrationotp.repository.CartRepository;
import com.example.registrationotp.repository.CategoryRepository;
import com.example.registrationotp.repository.CustomerFeedbackRepository;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EmailOtpRepository;
import com.example.registrationotp.repository.EmployeeAttendanceRepository;
import com.example.registrationotp.repository.EmployeeWorkScheduleRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.FavoriteRepository;
import com.example.registrationotp.repository.NewsArticleRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.OrderRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.ReviewRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.UserDeliveryAddressRepository;
import com.example.registrationotp.repository.UserLevelDefinitionRepository;
import com.example.registrationotp.repository.UserNotificationRepository;
import com.example.registrationotp.repository.UserRepository;
import com.example.registrationotp.repository.UserSessionRepository;
import com.example.registrationotp.support.EventSlugNormalizer;
import com.example.registrationotp.support.NewsSlugNormalizer;

@Service
public class DemoDataSeeder {

	private static final int SEED_COUNT = 20;
	private static final int CONTENT_SECTION_COUNT = SEED_COUNT * 4;
	private static final int EMPLOYEE_ATTENDANCE_SEED_COUNT = 5;
	private static final int EMPLOYEE_WORK_SCHEDULE_SEED_COUNT = 5;
	private static final String DEFAULT_PASSWORD = "12312345";
	private static final Instant BASE_TIME = Instant.parse("2026-03-01T02:00:00Z");
	private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
	private static final List<String> EXPECTED_TABLES = List.of(
			"users",
			"user_sessions",
			"email_otps",
			"user_delivery_addresses",
			"user_level_definitions",
			"user_notifications",
			"employee_work_schedules",
			"employee_attendances",
			"stores",
			"store_image_paths",
			"store_highlight_tags",
			"store_service_tags",
			"content_sections",
			"content_section_image_paths",
			"categories",
			"category_image_paths",
			"dishes",
			"dish_image_paths",
			"dish_highlight_tags",
			"store_dishes",
			"events",
			"event_image_paths",
			"event_highlight_tags",
			"event_featured_dish_ids",
			"news_articles",
			"news_article_image_paths",
			"news_article_tags",
			"promotions",
			"promotion_applicable_dishes",
			"promotion_eligible_stores",
			"promotion_eligible_user_levels",
			"orders",
			"order_promotion_dish_ids",
			"order_items",
			"customer_feedbacks",
			"favorites",
			"reviews",
			"carts",
			"cart_items"
	);
	private static final List<String> STORE_THEMES = List.of(
			"District One Atelier",
			"Riverside Lounge",
			"Airport Hub",
			"Garden Courtyard",
			"Sunset Lab",
			"Heritage House",
			"Artisan Alley",
			"Lakeside Bloom",
			"Metro Point",
			"Dawn Station",
			"Studio Collective",
			"Market Gallery",
			"Campus Commons",
			"Rivergate Terrace",
			"Old Quarter",
			"Skyline Deck",
			"Zen Pavilion",
			"Harbor Stop",
			"Orchard House",
			"Moonlight Bar"
	);
	private static final List<String> DISTRICTS = List.of(
			"District 1",
			"Thu Duc",
			"Tan Binh",
			"Phu Nhuan",
			"District 3",
			"District 5",
			"Binh Thanh",
			"District 7",
			"Go Vap",
			"District 10",
			"District 2",
			"District 4",
			"District 11",
			"District 6",
			"District 8",
			"District 12",
			"Tan Phu",
			"Binh Tan",
			"Nha Be",
			"Can Gio"
	);
	private static final List<String> STREETS = List.of(
			"Nguyen Hue",
			"Tran Nao",
			"Truong Son",
			"Le Van Sy",
			"Vo Thi Sau",
			"Tran Hung Dao",
			"Pham Viet Chanh",
			"Nguyen Thi Thap",
			"Quang Trung",
			"Su Van Hanh",
			"Mai Chi Tho",
			"Ben Van Don",
			"Le Dai Hanh",
			"Hau Giang",
			"Pham The Hien",
			"Nguyen Anh Thu",
			"Au Co",
			"Kinh Duong Vuong",
			"Nguyen Huu Tho",
			"Rung Sac"
	);
	private static final List<String> CATEGORY_NAMES = List.of(
			"Signature Matcha",
			"Ceremonial Tea",
			"Dessert Bar",
			"Bottled Brew",
			"Tea Fizz",
			"Grab And Go",
			"Garden Cakes",
			"Workshop Menu",
			"Seasonal Lab",
			"Night Desserts",
			"Latte Collection",
			"Slow Bar Tea",
			"Brunch Pairings",
			"Cloud Creamers",
			"Fruit Refreshers",
			"Toasted Pastry",
			"Wellness Sips",
			"Travel Bottles",
			"Rooftop Specials",
			"Neighborhood Favorites"
	);
	private static final List<String> DISH_NAMES = List.of(
			"Iced Emerald Latte",
			"Yuzu Cloud Matcha",
			"Roasted Houjicha Float",
			"Ceremonial Usucha Shot",
			"Garden Tiramisu Cup",
			"Sparkling Citrus Tea",
			"Cold Brew Bottle",
			"Banana Oat Matcha",
			"Basque Cheesecake Slice",
			"Workshop Tea Flight",
			"Strawberry Velvet Matcha",
			"Salted Foam Latte",
			"Sesame Mochi Toast",
			"Jasmine Matcha Cooler",
			"Pistachio Shortcake",
			"Airport Onigiri Set",
			"Cacao Night Latte",
			"Peach Tea Sparkler",
			"Rooftop Plum Soda",
			"Leafy Roll Cake"
	);
	private static final List<String> EVENT_NAMES = List.of(
			"Sunrise Matcha Flight",
			"River Brunch Club",
			"Airport Sampling Hour",
			"Garden Brewing Workshop",
			"Sunset Latte Night",
			"Tea Heritage Session",
			"Artisan Dessert Tasting",
			"Lakeside Slow Bar",
			"Metro Morning Brew",
			"Dawn Ritual Class",
			"Creative Studio Cupping",
			"Market Pairing Night",
			"Campus Focus Session",
			"Rivergate Tea Social",
			"Old Quarter Story Night",
			"Skyline Signature Lab",
			"Zen Tea Meditation",
			"Harbor Traveler Breakfast",
			"Orchard Family Picnic",
			"Moonlight Dessert Pairing"
	);
	private static final List<String> NEWS_TITLES = List.of(
			"Tea Matcha launches the District One Atelier menu",
			"Riverside branch extends brunch hours this month",
			"Airport Hub refreshes bottled drink lineup",
			"Garden Courtyard announces new weekend workshop slots",
			"Sunset Lab previews late-night dessert pairing",
			"Heritage House debuts a ceremonial tea corner",
			"Artisan Alley introduces a dessert tasting route",
			"Lakeside Bloom adds family afternoon seating",
			"Metro Point rolls out commuter breakfast combos",
			"Dawn Station starts early-morning tea flights",
			"Studio Collective opens a new creative brew table",
			"Market Gallery expands seasonal pastry menu",
			"Campus Commons launches student combo pricing",
			"Rivergate Terrace adds community tea socials",
			"Old Quarter begins a monthly story night",
			"Skyline Deck experiments with rooftop tea sodas",
			"Zen Pavilion refreshes wellness drink series",
			"Harbor Stop builds a traveler-friendly quick menu",
			"Orchard House prepares a family dessert weekend",
			"Moonlight Bar unveils its after-dark signature drinks"
	);
	private static final List<String> FIRST_NAMES = List.of(
			"An",
			"Bao",
			"Chi",
			"Duc",
			"Em",
			"Giang",
			"Huy",
			"Khanh",
			"Linh",
			"Minh",
			"Nhi",
			"Oanh",
			"Phuc",
			"Quynh",
			"Trang",
			"Uy",
			"Vy",
			"Yen",
			"Lam",
			"Nam"
	);
	private static final List<String> LAST_NAMES = List.of(
			"Nguyen",
			"Tran",
			"Le",
			"Pham",
			"Vo",
			"Huynh",
			"Do",
			"Bui",
			"Hoang",
			"Vu",
			"Phan",
			"Dang",
			"Luong",
			"Ta",
			"Ho",
			"Mai",
			"Truong",
			"Ly",
			"Ton",
			"Dao"
	);

	private final DataSource dataSource;
	private final PasswordEncoder passwordEncoder;
	private final UserRepository userRepository;
	private final StoreRepository storeRepository;
	private final CategoryRepository categoryRepository;
	private final DishRepository dishRepository;
	private final StoreDishRepository storeDishRepository;
	private final EventItemRepository eventItemRepository;
	private final NewsArticleRepository newsArticleRepository;
	private final PromotionRepository promotionRepository;
	private final UserLevelDefinitionRepository userLevelDefinitionRepository;
	private final UserDeliveryAddressRepository userDeliveryAddressRepository;
	private final OrderRepository orderRepository;
	private final OrderItemRepository orderItemRepository;
	private final CustomerFeedbackRepository customerFeedbackRepository;
	private final FavoriteRepository favoriteRepository;
	private final ReviewRepository reviewRepository;
	private final CartRepository cartRepository;
	private final CartItemRepository cartItemRepository;
	private final UserNotificationRepository userNotificationRepository;
	private final EmployeeWorkScheduleRepository employeeWorkScheduleRepository;
	private final EmployeeAttendanceRepository employeeAttendanceRepository;
	private final EmailOtpRepository emailOtpRepository;
	private final UserSessionRepository userSessionRepository;
	private final Path uploadRoot;
	private final HttpClient httpClient;

	public DemoDataSeeder(
			DataSource dataSource,
			PasswordEncoder passwordEncoder,
			UserRepository userRepository,
			StoreRepository storeRepository,
			CategoryRepository categoryRepository,
			DishRepository dishRepository,
			StoreDishRepository storeDishRepository,
			EventItemRepository eventItemRepository,
			NewsArticleRepository newsArticleRepository,
			PromotionRepository promotionRepository,
			UserLevelDefinitionRepository userLevelDefinitionRepository,
			UserDeliveryAddressRepository userDeliveryAddressRepository,
			OrderRepository orderRepository,
			OrderItemRepository orderItemRepository,
			CustomerFeedbackRepository customerFeedbackRepository,
			FavoriteRepository favoriteRepository,
			ReviewRepository reviewRepository,
			CartRepository cartRepository,
			CartItemRepository cartItemRepository,
			UserNotificationRepository userNotificationRepository,
			EmployeeWorkScheduleRepository employeeWorkScheduleRepository,
			EmployeeAttendanceRepository employeeAttendanceRepository,
			EmailOtpRepository emailOtpRepository,
			UserSessionRepository userSessionRepository,
			UploadProperties uploadProperties
	) {
		this.dataSource = dataSource;
		this.passwordEncoder = passwordEncoder;
		this.userRepository = userRepository;
		this.storeRepository = storeRepository;
		this.categoryRepository = categoryRepository;
		this.dishRepository = dishRepository;
		this.storeDishRepository = storeDishRepository;
		this.eventItemRepository = eventItemRepository;
		this.newsArticleRepository = newsArticleRepository;
		this.promotionRepository = promotionRepository;
		this.userLevelDefinitionRepository = userLevelDefinitionRepository;
		this.userDeliveryAddressRepository = userDeliveryAddressRepository;
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
		this.customerFeedbackRepository = customerFeedbackRepository;
		this.favoriteRepository = favoriteRepository;
		this.reviewRepository = reviewRepository;
		this.cartRepository = cartRepository;
		this.cartItemRepository = cartItemRepository;
		this.userNotificationRepository = userNotificationRepository;
		this.employeeWorkScheduleRepository = employeeWorkScheduleRepository;
		this.employeeAttendanceRepository = employeeAttendanceRepository;
		this.emailOtpRepository = emailOtpRepository;
		this.userSessionRepository = userSessionRepository;
		this.uploadRoot = Path.of(uploadProperties.getDir()).toAbsolutePath().normalize();
		this.httpClient = HttpClient.newBuilder()
				.followRedirects(HttpClient.Redirect.ALWAYS)
				.build();
	}

	public void reseed() throws Exception {
		System.out.println("Resetting demo uploads in: " + uploadRoot);
		resetUploads();
		normalizeLegacySchema();
		truncateAllTables();

		List<Store> stores = seedStores();
		List<User> users = seedUsers(stores);
		List<UserLevelDefinition> userLevels = seedUserLevels(stores);
		List<Category> categories = seedCategories(stores);
		List<Dish> dishes = seedDishes(categories);
		List<StoreDish> storeDishes = seedStoreDishes(stores, dishes);
		List<EventItem> events = seedEvents(stores, dishes);
		List<NewsArticle> newsArticles = seedNews(stores);
		List<Promotion> promotions = seedPromotions(dishes, stores, userLevels);
		Map<Long, UserDeliveryAddress> addressesByUserId = seedAddresses(users);
		List<Order> orders = seedOrders(users, storeDishes, promotions, addressesByUserId);

		seedFeedbacks(users, orders, stores);
		seedFavorites(users, stores, dishes, events);
		seedReviews(users, stores, dishes, events);
		seedCarts(users, storeDishes);
		seedNotifications(users, orders, events, newsArticles, stores);
		seedAttendances(users);
		seedOtps(users);
		seedSessions(users);

		Map<String, Long> counts = verifyTableCounts();
		System.out.println("Demo reseed completed successfully.");
		System.out.println("Default password for all demo accounts: " + DEFAULT_PASSWORD);
		counts.forEach((table, count) -> System.out.println(table + " => " + count));
	}

	private void resetUploads() throws IOException {
		if (Files.exists(uploadRoot)) {
			try (Stream<Path> paths = Files.walk(uploadRoot)) {
				paths.sorted(Comparator.reverseOrder())
						.filter(path -> !path.equals(uploadRoot))
						.forEach(this::deleteQuietly);
			}
		}
		Files.createDirectories(uploadRoot);
	}

	private void deleteQuietly(Path path) {
		try {
			Files.deleteIfExists(path);
		} catch (IOException exception) {
			throw new IllegalStateException("Unable to delete old upload file: " + path, exception);
		}
	}

	private void normalizeLegacySchema() throws Exception {
		try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
			for (String obsoleteTable : List.of("store_sections", "dish_sections", "event_sections", "news_article_sections")) {
				statement.execute("DROP TABLE IF EXISTS `" + obsoleteTable + "`");
			}
			String legacyForeignKey = null;
			try (ResultSet resultSet = statement.executeQuery(
					"select constraint_name from information_schema.key_column_usage " +
							"where table_schema = database() and table_name = 'dishes' and column_name = 'store_id' " +
							"and referenced_table_name is not null"
			)) {
				if (resultSet.next()) {
					legacyForeignKey = resultSet.getString(1);
				}
			}

			boolean hasLegacyStoreColumn;
			try (ResultSet resultSet = statement.executeQuery(
					"select count(*) from information_schema.columns " +
							"where table_schema = database() and table_name = 'dishes' and column_name = 'store_id'"
			)) {
				resultSet.next();
				hasLegacyStoreColumn = resultSet.getInt(1) > 0;
			}

			if (hasLegacyStoreColumn) {
				if (legacyForeignKey != null && !legacyForeignKey.isBlank()) {
					statement.execute("ALTER TABLE dishes DROP FOREIGN KEY `" + legacyForeignKey + "`");
				}
				statement.execute("ALTER TABLE dishes DROP COLUMN store_id");
			}
		}
	}

	private void truncateAllTables() throws Exception {
		List<String> tables = new ArrayList<>();
		try (Connection connection = dataSource.getConnection();
			 Statement statement = connection.createStatement();
			 ResultSet resultSet = statement.executeQuery(
					 "select table_name from information_schema.tables " +
							 "where table_schema = database() and table_type = 'BASE TABLE'"
			 )) {
			while (resultSet.next()) {
				tables.add(resultSet.getString(1));
			}
		}

		try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
			statement.execute("SET FOREIGN_KEY_CHECKS = 0");
			for (String table : tables) {
				statement.execute("TRUNCATE TABLE `" + table + "`");
			}
			statement.execute("SET FOREIGN_KEY_CHECKS = 1");
		}
	}

	private List<Store> seedStores() throws Exception {
		List<Store> stores = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			String theme = STORE_THEMES.get(index);
			String imagePath = downloadDemoImage("stores", "store", index, theme, "matcha,cafe,interior");

			Store store = new Store();
			store.setSlug("tea-matcha-" + slugify(theme));
			store.setName("Tea Matcha " + theme);
			store.setDescription("Demo branch " + theme + " focused on seasonal drinks, clean service, and approachable tasting flights.");
			store.setAddress(String.format("%02d %s, %s, Ho Chi Minh City", 10 + index, STREETS.get(index), DISTRICTS.get(index)));
			store.setContactEmail(String.format("store.%02d@teamatcha.demo", index + 1));
			store.setPhoneNumber(String.format("090%07d", 1000001 + index));
			store.setLatitude(10.70 + (index * 0.0065));
			store.setLongitude(106.62 + (index * 0.0052));
			store.setArea(DISTRICTS.get(index));
			store.setPositionLabel(theme + " pickup point");
			store.setHoursText(String.format("%02d:00 - %02d:30", 6 + (index % 3), 21 + (index % 2)));
			store.setOpenTime(LocalTime.of(6 + (index % 3), 0));
			store.setCloseTime(LocalTime.of(21 + (index % 2), 30));
			store.setPersonality("Demo personality " + (index + 1));
			store.setDesignSignature("Design signature " + theme);
			store.setFranchiseMood("Mood board " + theme);
			store.setSpecialty("Specialty drinks for " + theme);
			store.setHighlightSummary("Highlight summary for " + theme + " with a strong visual identity for demos.");
			store.setHighlightTags(List.of("highlight-" + twoDigit(index + 1)));
			store.setServiceTags(List.of("service-" + twoDigit(index + 1)));
			store.setImagePaths(List.of(imagePath));
			store.setSections(List.of(section(
					theme + " Story",
					"Demo section for " + theme + " describing the branch vibe, pickup flow, and featured beverage identity.",
					imagePath
			)));
			store.setActive(index % 7 != 4);
			stores.add(store);
		}
		return storeRepository.saveAll(stores);
	}

	private List<User> seedUsers(List<Store> stores) {
		List<User> users = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			User user = new User();
			user.setFullName(FIRST_NAMES.get(index) + " " + LAST_NAMES.get(index));
			user.setEmail(String.format("demo.user.%02d@teamatcha.local", index + 1));
			user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
			Role role = roleFor(index);
			user.setRole(role);
			user.setWorkingStore(role.requiresWorkingStore() ? stores.get(index) : null);
			user.setEnabled(index % 9 != 8);
			user.setVerifiedAt(BASE_TIME.plusSeconds(index * 3600L));
			users.add(user);
		}
		return userRepository.saveAll(users);
	}

	private List<UserLevelDefinition> seedUserLevels(List<Store> stores) {
		List<UserLevelDefinition> levels = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			UserLevelDefinition level = new UserLevelDefinition();
			level.setStore(stores.get(index));
			level.setCode("LEVEL-" + twoDigit(index + 1));
			level.setName("Leaf Tier " + twoDigit(index + 1));
			level.setMinPaidAmount(BigDecimal.valueOf(index * 250000L));
			level.setActive(index % 6 != 5);
			levels.add(level);
		}
		return userLevelDefinitionRepository.saveAll(levels);
	}

	private List<Category> seedCategories(List<Store> stores) throws Exception {
		List<Category> categories = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			String name = CATEGORY_NAMES.get(index);
			String imagePath = downloadDemoImage("categories", "category", index, name, "matcha,tea,menu");

			Category category = new Category();
			category.setStore(stores.get(index));
			category.setName(name);
			category.setDescription("Demo category " + name + " for " + stores.get(index).getName() + ".");
			category.setSortOrder(index + 1);
			category.setImagePaths(List.of(imagePath));
			category.setActive(index % 8 != 6);
			categories.add(category);
		}
		return categoryRepository.saveAll(categories);
	}

	private List<Dish> seedDishes(List<Category> categories) throws Exception {
		List<Dish> dishes = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			String name = DISH_NAMES.get(index);
			String imagePath = downloadDemoImage("dishes", "dish", index, name, "matcha,dessert,drink");

			Dish dish = new Dish();
			dish.setCategory(categories.get(index));
			dish.setName(name);
			dish.setDescription("Demo dish " + name + " built for frontend cards, detail pages, and checkout scenarios.");
			dish.setNote("Demo note " + twoDigit(index + 1));
			dish.setPrice(BigDecimal.valueOf(55000L + (index * 3500L)));
			dish.setAvailable(index % 5 != 4);
			dish.setStatus(index % 6 == 0 ? "LIMITED" : "ACTIVE");
			dish.setFranchiseRequired(index % 4 == 1);
			dish.setFranchiseNote(index % 4 == 1 ? "Requires premium ingredient bundle " + twoDigit(index + 1) : null);
			dish.setHighlightSummary("Highlight summary for " + name + ".");
			dish.setActive(index % 9 != 7);
			dish.setImagePaths(List.of(imagePath));
			dish.setHighlightTags(List.of("dish-tag-" + twoDigit(index + 1)));
			dish.setSections(List.of(section(
					name + " Notes",
					"Demo tasting notes and pairing suggestions for " + name + ".",
					imagePath
			)));
			dishes.add(dish);
		}
		return dishRepository.saveAll(dishes);
	}

	private List<StoreDish> seedStoreDishes(List<Store> stores, List<Dish> dishes) {
		List<StoreDish> storeDishes = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			StoreDish storeDish = new StoreDish();
			storeDish.setStore(stores.get(index));
			storeDish.setDish(dishes.get(index));
			storeDish.setQuantity(15 + (index * 3));
			storeDish.setAvailable(index % 6 != 5);
			storeDish.setPriceOverride(index % 3 == 0
					? dishes.get(index).getPrice().add(BigDecimal.valueOf(5000L))
					: null);
			storeDishes.add(storeDish);
		}
		return storeDishRepository.saveAll(storeDishes);
	}

	private List<EventItem> seedEvents(List<Store> stores, List<Dish> dishes) throws Exception {
		List<EventItem> events = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			String name = EVENT_NAMES.get(index);
			String imagePath = downloadDemoImage("events", "event", index, name, "matcha,event,workshop");

			EventItem event = new EventItem();
			event.setName(name);
			event.setSlug(EventSlugNormalizer.normalize(name));
			event.setDescription("Demo event " + name + " with enough content for list, detail, and review flows.");
			event.setLocation(stores.get(index).getAddress());
			event.setScheduleText("Weekend slot " + twoDigit(index + 1));
			event.setHighlightSummary("Event highlight for " + name + ".");
			event.setStore(stores.get(index));
			event.setImagePaths(List.of(imagePath));
			event.setHighlightTags(List.of("event-tag-" + twoDigit(index + 1)));
			event.setSections(List.of(section(
					name + " Agenda",
					"Demo agenda for " + name + " covering tasting, education, and community moments.",
					imagePath
			)));
			event.setStartsAt(BASE_TIME.plusSeconds((index + 3L) * 86400L));
			event.setEndsAt(BASE_TIME.plusSeconds((index + 3L) * 86400L).plusSeconds(10800L));
			event.setCapacity(30 + (index * 4));
			event.setBookedCount(5 + (index % 11));
			event.setFeaturedDishIds(List.of(dishes.get(index).getId()));
			event.setActive(index % 5 != 3);
			events.add(event);
		}
		return eventItemRepository.saveAll(events);
	}

	private List<NewsArticle> seedNews(List<Store> stores) throws Exception {
		List<NewsArticle> newsArticles = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			String title = NEWS_TITLES.get(index);
			String imagePath = downloadDemoImage("news", "news", index, title, "matcha,news,cafe");

			NewsArticle newsArticle = new NewsArticle();
			newsArticle.setTitle(title);
			newsArticle.setSlug(NewsSlugNormalizer.normalize(title));
			newsArticle.setSummary("Demo summary for " + title + ".");
			newsArticle.setContent("Demo article body for " + title + " with enough text to populate cards, details, and admin previews.");
			newsArticle.setRelatedStore(stores.get(index));
			newsArticle.setTags(List.of("news-tag-" + twoDigit(index + 1)));
			newsArticle.setImagePaths(List.of(imagePath));
			newsArticle.setSections(List.of(section(
					title + " Detail",
					"Demo editorial section for " + title + ".",
					imagePath
			)));
			newsArticle.setFeatured(index % 4 == 0);
			newsArticle.setPublished(index % 6 != 5);
			newsArticle.setPublishedAt(index % 6 == 5 ? null : BASE_TIME.plusSeconds(index * 43200L));
			newsArticles.add(newsArticle);
		}
		return newsArticleRepository.saveAll(newsArticles);
	}

	private List<Promotion> seedPromotions(
			List<Dish> dishes,
			List<Store> stores,
			List<UserLevelDefinition> userLevels
	) {
		List<Promotion> promotions = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			Promotion promotion = new Promotion();
			promotion.setCode("PROMO-" + twoDigit(index + 1));
			promotion.setName("Demo Promotion " + twoDigit(index + 1));
			promotion.setDescription("Demo promotion for " + stores.get(index).getName() + ".");
			promotion.setScope(index % 2 == 0 ? PromotionScope.ORDER : PromotionScope.DISH);
			promotion.setDiscountType(index % 2 == 0 ? PromotionDiscountType.PERCENT : PromotionDiscountType.FIXED_AMOUNT);
			promotion.setApplicableDishIds(List.of(dishes.get(index).getId()));
			promotion.setEligibleStoreIds(List.of(stores.get(index).getId()));
			promotion.setEligibleUserLevelIds(List.of(userLevels.get(index).getId()));
			promotion.setDiscountValue(index % 2 == 0
					? BigDecimal.valueOf(10 + (index % 11))
					: BigDecimal.valueOf(12000L + (index * 1000L)));
			promotion.setMinOrderAmount(BigDecimal.valueOf(90000L + (index * 5000L)));
			promotion.setMaxDiscountAmount(BigDecimal.valueOf(25000L + (index * 1500L)));
			promotion.setMinStoreBillAmount(BigDecimal.valueOf(60000L + (index * 1500L)));
			promotion.setMinCrossStoreBillAmount(BigDecimal.valueOf(120000L + (index * 3000L)));
			promotion.setUsageLimit(80 + index);
			promotion.setUsedCount(index % 9);
			promotion.setStartsAt(BASE_TIME.minusSeconds(86400L * 5));
			promotion.setEndsAt(BASE_TIME.plusSeconds(86400L * (20L + index)));
			promotion.setActive(index % 7 != 6);
			promotions.add(promotion);
		}
		return promotionRepository.saveAll(promotions);
	}

	private Map<Long, UserDeliveryAddress> seedAddresses(List<User> users) {
		List<UserDeliveryAddress> addresses = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			User user = users.get(index);
			UserDeliveryAddress address = new UserDeliveryAddress();
			address.setUser(user);
			address.setFullName(user.getFullName());
			address.setPhoneNumber(String.format("091%07d", 2000001 + index));
			address.setDeliveryAddress(String.format("%02d %s Residence, %s, Ho Chi Minh City", 100 + index, STREETS.get(index), DISTRICTS.get(index)));
			address.setPrimaryAddress(Boolean.TRUE);
			address.setVerifiedAt(BASE_TIME.plusSeconds(index * 1800L));
			address.setLastUsedAt(BASE_TIME.plusSeconds(index * 3600L));
			addresses.add(address);
		}

		List<UserDeliveryAddress> saved = userDeliveryAddressRepository.saveAll(addresses);
		Map<Long, UserDeliveryAddress> byUserId = new LinkedHashMap<>();
		for (UserDeliveryAddress address : saved) {
			byUserId.put(address.getUser().getId(), address);
		}
		return byUserId;
	}

	private List<Order> seedOrders(
			List<User> users,
			List<StoreDish> storeDishes,
			List<Promotion> promotions,
			Map<Long, UserDeliveryAddress> addressesByUserId
	) {
		List<User> preparingPool = users.stream()
				.filter(user -> user.getRole() == Role.MANAGER)
				.toList();
		List<User> shipperPool = users.stream()
				.filter(user -> user.getRole() == Role.SHIPPER)
				.toList();
		List<Order> orders = new ArrayList<>();

		for (int index = 0; index < SEED_COUNT; index++) {
			User user = users.get(index);
			StoreDish storeDish = storeDishes.get(index);
			Promotion promotion = promotions.get(index);
			UserDeliveryAddress address = addressesByUserId.get(user.getId());
			int quantity = 1 + (index % 3);
			BigDecimal unitPrice = effectivePrice(storeDish);
			BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
			BigDecimal discountAmount = calculateDiscount(subtotal, promotion);
			OrderStatus orderStatus = orderStatusFor(index);
			PaymentStatus paymentStatus = paymentStatusFor(index, orderStatus);

			Order order = new Order();
			order.setUser(user);
			order.setStatus(orderStatus);
			order.setSubtotalAmount(subtotal);
			order.setDiscountAmount(discountAmount);
			order.setTotalAmount(subtotal.subtract(discountAmount).max(BigDecimal.ZERO));
			order.setPromotionCode(promotion.getCode());
			order.setPromotionScope(promotion.getScope());
			order.setPromotionEligibleAmount(subtotal);
			order.setPromotionDishIds(List.of(storeDish.getDish().getId()));
			order.setDeliveryType(index % 3 == 0 ? DeliveryType.SCHEDULED : DeliveryType.IMMEDIATE);
			order.setScheduledDeliveryAt(index % 3 == 0 ? BASE_TIME.plusSeconds((index + 1L) * 7200L) : null);
			order.setDeliveryFullName(address.getFullName());
			order.setDeliveryPhoneNumber(address.getPhoneNumber());
			order.setDeliveryAddress(address.getDeliveryAddress());
			order.setDeliveryAddressId(address.getId());
			order.setPreparingStaff(preparingPool.get(index % preparingPool.size()));
			order.setDeliveringShipper(shipperPool.get(index % shipperPool.size()));
			order.setPaymentProvider("PAYOS");
			order.setPaymentStatus(paymentStatus);
			order.setPayosOrderCode(880000L + index);
			order.setPaymentLinkId("PAYOS-LINK-" + twoDigit(index + 1));
			order.setPaymentCheckoutUrl("https://payos.demo/checkout/" + twoDigit(index + 1));
			order.setPaymentQrCode("DEMO-QR-" + twoDigit(index + 1));
			order.setPaymentReference("REF-" + twoDigit(index + 1));
			order.setPaymentExpiresAt(BASE_TIME.plusSeconds((index + 2L) * 5400L));
			order.setPaidAt(paymentStatus == PaymentStatus.PAID ? BASE_TIME.plusSeconds((index + 1L) * 3600L) : null);

			Order savedOrder = orderRepository.save(order);

			OrderItem orderItem = new OrderItem();
			orderItem.setOrder(savedOrder);
			orderItem.setStore(storeDish.getStore());
			orderItem.setDish(storeDish.getDish());
			orderItem.setQuantity(quantity);
			orderItem.setUnitPrice(unitPrice);
			orderItemRepository.save(orderItem);

			orders.add(savedOrder);
		}

		return orders;
	}

	private void seedFeedbacks(List<User> users, List<Order> orders, List<Store> stores) {
		List<User> replyPool = users.stream()
				.filter(user -> user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER)
				.toList();
		List<CustomerFeedback> feedbacks = new ArrayList<>();
		FeedbackCategory[] categories = FeedbackCategory.values();

		for (int index = 0; index < SEED_COUNT; index++) {
			CustomerFeedback feedback = new CustomerFeedback();
			feedback.setUser(users.get(index));
			feedback.setRelatedOrder(orders.get(index));
			feedback.setRelatedStore(stores.get(index));
			feedback.setCategory(categories[index % categories.length]);
			feedback.setSubject("Demo feedback " + twoDigit(index + 1));
			feedback.setMessage("Demo feedback message " + twoDigit(index + 1) + " covering order quality, service flow, or product impression.");

			if (index % 3 == 0) {
				User replier = replyPool.get(index % replyPool.size());
				feedback.setReplyMessage("Demo reply for feedback " + twoDigit(index + 1) + ".");
				feedback.setRepliedAt(BASE_TIME.plusSeconds((index + 1L) * 4000L));
				feedback.setRepliedByUserId(replier.getId());
				feedback.setRepliedByUserName(replier.getFullName());
				feedback.setRepliedByUserRole(replier.getRole());
			}

			feedbacks.add(feedback);
		}

		customerFeedbackRepository.saveAll(feedbacks);
	}

	private void seedFavorites(List<User> users, List<Store> stores, List<Dish> dishes, List<EventItem> events) {
		List<Favorite> favorites = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			Favorite favorite = new Favorite();
			favorite.setUser(users.get(index));
			switch (index % 3) {
				case 0 -> {
					favorite.setTargetType(FavoriteTargetType.STORE);
					favorite.setTargetId(stores.get(index).getId());
				}
				case 1 -> {
					favorite.setTargetType(FavoriteTargetType.DISH);
					favorite.setTargetId(dishes.get(index).getId());
				}
				default -> {
					favorite.setTargetType(FavoriteTargetType.EVENT);
					favorite.setTargetId(events.get(index).getId());
				}
			}
			favorites.add(favorite);
		}
		favoriteRepository.saveAll(favorites);
	}

	private void seedReviews(List<User> users, List<Store> stores, List<Dish> dishes, List<EventItem> events) {
		List<Review> reviews = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			Review review = new Review();
			review.setUser(users.get(index));
			switch (index % 3) {
				case 0 -> {
					review.setTargetType(ReviewTargetType.STORE);
					review.setTargetId(stores.get(index).getId());
				}
				case 1 -> {
					review.setTargetType(ReviewTargetType.DISH);
					review.setTargetId(dishes.get(index).getId());
				}
				default -> {
					review.setTargetType(ReviewTargetType.EVENT);
					review.setTargetId(events.get(index).getId());
				}
			}
			review.setRating(3 + (index % 3));
			review.setTitle("Demo review " + twoDigit(index + 1));
			review.setComment("Demo review body " + twoDigit(index + 1) + " with enough text for list, detail, and moderation flows.");
			review.setApproved(index % 5 != 4);
			reviews.add(review);
		}
		reviewRepository.saveAll(reviews);
	}

	private void seedCarts(List<User> users, List<StoreDish> storeDishes) {
		for (int index = 0; index < SEED_COUNT; index++) {
			Cart cart = new Cart();
			cart.setUser(users.get(index));
			cart.setStatus(CartStatus.OPEN);
			Cart savedCart = cartRepository.save(cart);

			StoreDish storeDish = storeDishes.get((index + 5) % SEED_COUNT);
			CartItem item = new CartItem();
			item.setCart(savedCart);
			item.setStore(storeDish.getStore());
			item.setDish(storeDish.getDish());
			item.setQuantity(1 + (index % 2));
			item.setUnitPrice(effectivePrice(storeDish));
			cartItemRepository.save(item);
		}
	}

	private void seedNotifications(
			List<User> users,
			List<Order> orders,
			List<EventItem> events,
			List<NewsArticle> newsArticles,
			List<Store> stores
	) {
		List<UserNotification> notifications = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			UserNotification notification = new UserNotification();
			notification.setUser(users.get(index));
			Store store = stores.get(index);
			switch (index % 3) {
				case 0 -> {
					notification.setType(UserNotificationType.ORDER_STATUS);
					notification.setTitle("Order update " + twoDigit(index + 1));
					notification.setMessage("Demo notification for order " + orders.get(index).getId() + ".");
					notification.setRelatedOrderId(orders.get(index).getId());
					notification.setActionUrl("/orders/" + orders.get(index).getId());
				}
				case 1 -> {
					notification.setType(UserNotificationType.BRAND_EVENT);
					notification.setTitle("Event reminder " + twoDigit(index + 1));
					notification.setMessage("Demo event notification for " + events.get(index).getName() + ".");
					notification.setRelatedEventId(events.get(index).getId());
					notification.setRelatedEventSlug(events.get(index).getSlug());
					notification.setActionUrl("/events/" + events.get(index).getSlug());
				}
				default -> {
					notification.setType(UserNotificationType.NEWS_ARTICLE);
					notification.setTitle("News update " + twoDigit(index + 1));
					notification.setMessage("Demo news notification for " + newsArticles.get(index).getTitle() + ".");
					notification.setRelatedNewsId(newsArticles.get(index).getId());
					notification.setRelatedNewsSlug(newsArticles.get(index).getSlug());
					notification.setActionUrl("/news/" + newsArticles.get(index).getSlug());
				}
			}
			notification.setRelatedStoreId(store.getId());
			notification.setRelatedStoreName(store.getName());
			notification.setReadAt(index % 2 == 0 ? BASE_TIME.plusSeconds(index * 2700L) : null);
			notifications.add(notification);
		}
		userNotificationRepository.saveAll(notifications);
	}

	private void seedAttendances(List<User> users) {
		LocalDate workDate = LocalDate.parse("2026-03-01");
		List<EmployeeWorkSchedule> schedules = new ArrayList<>();
		List<EmployeeAttendance> attendances = new ArrayList<>();
		for (int index = 0; index < users.size(); index++) {
			User user = users.get(index);
			if (user.getRole() != Role.MANAGER && user.getRole() != Role.SHIPPER) {
				continue;
			}
			EmployeeWorkSchedule schedule = new EmployeeWorkSchedule();
			schedule.setUser(user);
			schedule.setStore(user.getWorkingStore());
			schedule.setEmployeeRole(user.getRole());
			schedule.setWorkDate(workDate);
			schedule.setScheduledStartTime(LocalTime.of(8 + (index % 3), 0));
			schedule.setScheduledEndTime(LocalTime.of(17 + (index % 3), 0));
			schedule.setNote(index % 2 == 0 ? "Front counter shift" : "Delivery shift");
			schedules.add(schedule);

			EmployeeAttendance attendance = new EmployeeAttendance();
			attendance.setUser(user);
			attendance.setStore(user.getWorkingStore());
			attendance.setWorkSchedule(schedule);
			attendance.setEmployeeRole(user.getRole());
			attendance.setWorkDate(workDate);
			attendance.setCheckInAt(BASE_TIME.plusSeconds((index + 1L) * 1800L));
			attendance.setCheckOutAt(index % 2 == 0 ? BASE_TIME.plusSeconds((index + 2L) * 1800L) : null);
			attendances.add(attendance);
		}
		employeeWorkScheduleRepository.saveAll(schedules);
		employeeAttendanceRepository.saveAll(attendances);
	}

	private void seedOtps(List<User> users) {
		List<EmailOtp> otps = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			EmailOtp otp = new EmailOtp();
			otp.setUser(users.get(index));
			otp.setOtpCode(String.format("%06d", 100000 + (index * 7919 % 900000)));
			otp.setPurpose(index % 2 == 0 ? OtpPurpose.REGISTER_VERIFY : OtpPurpose.PASSWORD_RESET);
			otp.setExpiresAt(BASE_TIME.plusSeconds((index + 1L) * 900L));
			otp.setUsed(index % 4 == 0);
			otp.setUsedAt(index % 4 == 0 ? BASE_TIME.plusSeconds((index + 1L) * 600L) : null);
			otps.add(otp);
		}
		emailOtpRepository.saveAll(otps);
	}

	private void seedSessions(List<User> users) {
		List<UserSession> sessions = new ArrayList<>();
		for (int index = 0; index < SEED_COUNT; index++) {
			UserSession session = new UserSession();
			session.setUser(users.get(index));
			session.setToken(UUID.nameUUIDFromBytes(("demo-session-" + index).getBytes(StandardCharsets.UTF_8)).toString());
			session.setExpiresAt(BASE_TIME.plusSeconds((index + 7L) * 86400L));
			sessions.add(session);
		}
		userSessionRepository.saveAll(sessions);
	}

	private Map<String, Long> verifyTableCounts() throws Exception {
		Map<String, Long> counts = new LinkedHashMap<>();
		try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
			for (String table : EXPECTED_TABLES) {
				try (ResultSet resultSet = statement.executeQuery("select count(*) from `" + table + "`")) {
					resultSet.next();
					long count = resultSet.getLong(1);
					counts.put(table, count);
					long expectedCount = expectedCountForTable(table);
					if (count != expectedCount) {
						throw new IllegalStateException("Expected " + expectedCount + " rows in table " + table + " but found " + count);
					}
				}
			}
		}
		return counts;
	}

	private long expectedCountForTable(String table) {
		if ("content_sections".equals(table)) {
			return CONTENT_SECTION_COUNT;
		}
		if ("content_section_image_paths".equals(table)) {
			return CONTENT_SECTION_COUNT;
		}
		if ("employee_attendances".equals(table)) {
			return EMPLOYEE_ATTENDANCE_SEED_COUNT;
		}
		if ("employee_work_schedules".equals(table)) {
			return EMPLOYEE_WORK_SCHEDULE_SEED_COUNT;
		}
		return SEED_COUNT;
	}

	private String downloadDemoImage(String folder, String prefix, int index, String label, String tags) throws Exception {
		Path folderPath = uploadRoot.resolve(folder);
		Files.createDirectories(folderPath);
		String fileName = prefix + "-" + twoDigit(index + 1) + "-" + slugify(label) + ".jpg";
		Path targetPath = folderPath.resolve(fileName);

		List<URI> candidates = List.of(
				URI.create("https://loremflickr.com/1200/900/" + tags + "?lock=" + (1000 + index)),
				URI.create("https://picsum.photos/seed/" + folder + "-" + (index + 1) + "/1200/900")
		);

		IOException lastException = null;
		for (URI uri : candidates) {
			try {
				HttpRequest request = HttpRequest.newBuilder()
						.uri(uri)
						.header("User-Agent", "TeaMatchaDemoSeeder/2.0")
						.GET()
						.build();
				HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
				if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body().length > 0) {
					Files.write(targetPath, response.body());
					return "/uploads/" + folder + "/" + fileName;
				}
				lastException = new IOException("Unexpected response " + response.statusCode() + " from " + uri);
			} catch (IOException exception) {
				lastException = exception;
			} catch (InterruptedException exception) {
				Thread.currentThread().interrupt();
				throw exception;
			}
		}

		throw new IOException("Unable to download image for " + label, lastException);
	}

	private ContentSection section(String title, String content, String imagePath) {
		ContentSection section = new ContentSection();
		section.setTitle(title);
		section.setContent(content);
		section.setImagePath(imagePath);
		return section;
	}

	private Role roleFor(int index) {
		if (index < 2) {
			return Role.ADMIN;
		}
		if (index < 5) {
			return Role.MANAGER;
		}
		if (index < 8) {
			return Role.MANAGER;
		}
		if (index < 10) {
			return Role.SHIPPER;
		}
		return Role.USER;
	}

	private OrderStatus orderStatusFor(int index) {
		OrderStatus[] statuses = OrderStatus.values();
		return statuses[index % statuses.length];
	}

	private PaymentStatus paymentStatusFor(int index, OrderStatus orderStatus) {
		if (orderStatus == OrderStatus.CANCELLED) {
			return PaymentStatus.CANCELLED;
		}
		if (index % 6 == 5) {
			return PaymentStatus.FAILED;
		}
		if (orderStatus == OrderStatus.PENDING) {
			return PaymentStatus.PENDING;
		}
		return PaymentStatus.PAID;
	}

	private BigDecimal effectivePrice(StoreDish storeDish) {
		return storeDish.getPriceOverride() != null ? storeDish.getPriceOverride() : storeDish.getDish().getPrice();
	}

	private BigDecimal calculateDiscount(BigDecimal subtotal, Promotion promotion) {
		if (promotion == null || !promotion.isActive()) {
			return BigDecimal.ZERO;
		}
		if (promotion.getDiscountType() == PromotionDiscountType.PERCENT) {
			BigDecimal percentDiscount = subtotal.multiply(promotion.getDiscountValue())
					.divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
			if (promotion.getMaxDiscountAmount() != null) {
				return percentDiscount.min(promotion.getMaxDiscountAmount());
			}
			return percentDiscount;
		}
		return subtotal.min(promotion.getDiscountValue());
	}

	private String slugify(String rawValue) {
		String normalized = Normalizer.normalize(rawValue, Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "")
				.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("-{2,}", "-")
				.replaceAll("^-+", "")
				.replaceAll("-+$", "");
		return normalized.isBlank() ? "demo" : normalized;
	}

	private String twoDigit(int value) {
		return String.format("%02d", value);
	}
}
