import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.registrationotp.RegistrationOtpApplication;
import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.CartStatus;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.Favorite;
import com.example.registrationotp.model.FavoriteTargetType;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.Review;
import com.example.registrationotp.model.ReviewTargetType;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.CartItemRepository;
import com.example.registrationotp.repository.CartRepository;
import com.example.registrationotp.repository.CategoryRepository;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EmailOtpRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.FavoriteRepository;
import com.example.registrationotp.repository.NewsArticleRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.OrderRepository;
import com.example.registrationotp.repository.ReviewRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.UserRepository;
import com.example.registrationotp.repository.UserSessionRepository;

public class SeedDb {

	private static final String DEFAULT_PASSWORD = "12312345";

	public static void main(String[] args) throws Exception {
		try (ConfigurableApplicationContext context = new SpringApplicationBuilder(RegistrationOtpApplication.class)
				.web(WebApplicationType.NONE)
				.logStartupInfo(false)
				.run(args)) {
			new Seeder(context).run();
		}
	}

	private static final class Seeder {
		private final DataSource dataSource;
		private final PasswordEncoder passwordEncoder;
		private final UserRepository userRepository;
		private final StoreRepository storeRepository;
		private final CategoryRepository categoryRepository;
		private final DishRepository dishRepository;
		private final StoreDishRepository storeDishRepository;
		private final EventItemRepository eventItemRepository;
		private final ReviewRepository reviewRepository;
		private final FavoriteRepository favoriteRepository;
		private final NewsArticleRepository newsArticleRepository;
		private final CartRepository cartRepository;
		private final CartItemRepository cartItemRepository;
		private final OrderRepository orderRepository;
		private final OrderItemRepository orderItemRepository;
		private final EmailOtpRepository emailOtpRepository;
		private final UserSessionRepository userSessionRepository;
		private final Path uploadRoot;
		private final HttpClient httpClient;

		Seeder(ConfigurableApplicationContext context) {
			this.dataSource = context.getBean(DataSource.class);
			this.passwordEncoder = context.getBean(PasswordEncoder.class);
			this.userRepository = context.getBean(UserRepository.class);
			this.storeRepository = context.getBean(StoreRepository.class);
			this.categoryRepository = context.getBean(CategoryRepository.class);
			this.dishRepository = context.getBean(DishRepository.class);
			this.storeDishRepository = context.getBean(StoreDishRepository.class);
			this.eventItemRepository = context.getBean(EventItemRepository.class);
			this.reviewRepository = context.getBean(ReviewRepository.class);
			this.favoriteRepository = context.getBean(FavoriteRepository.class);
			this.newsArticleRepository = context.getBean(NewsArticleRepository.class);
			this.cartRepository = context.getBean(CartRepository.class);
			this.cartItemRepository = context.getBean(CartItemRepository.class);
			this.orderRepository = context.getBean(OrderRepository.class);
			this.orderItemRepository = context.getBean(OrderItemRepository.class);
			this.emailOtpRepository = context.getBean(EmailOtpRepository.class);
			this.userSessionRepository = context.getBean(UserSessionRepository.class);
			this.uploadRoot = Path.of("uploads").toAbsolutePath().normalize();
			this.httpClient = HttpClient.newBuilder()
					.followRedirects(HttpClient.Redirect.ALWAYS)
					.build();
		}

		void run() throws Exception {
			normalizeLegacySchema();
			truncateAllTables();

			Map<String, Store> stores = seedStores();
			Map<String, User> users = seedUsers(stores);
			Map<String, Category> categories = seedCategories(stores);
			Map<String, Dish> dishes = seedDishes(categories);
			Map<String, StoreDish> storeDishes = seedStoreDishes(stores, dishes);
			Map<String, EventItem> events = seedEvents(stores, dishes);
			attachDemoImages(stores, categories, dishes, events);
			seedNews(stores, events);
			seedOrders(users, storeDishes);
			seedReviews(users, stores, dishes, events);
			seedFavorites(users, stores, dishes, events);
			seedCarts(users, storeDishes);

			System.out.println("Database reset and seed completed.");
			System.out.println("Default password for all seeded accounts: " + DEFAULT_PASSWORD);
			System.out.println("Seeded users: " + userRepository.count());
			System.out.println("Seeded stores: " + storeRepository.count());
			System.out.println("Seeded categories: " + categoryRepository.count());
			System.out.println("Seeded dishes: " + dishRepository.count());
			System.out.println("Seeded store_dishes: " + storeDishRepository.count());
			System.out.println("Seeded events: " + eventItemRepository.count());
			System.out.println("Seeded orders: " + orderRepository.count());
			System.out.println("Seeded order_items: " + orderItemRepository.count());
			System.out.println("Seeded reviews: " + reviewRepository.count());
			System.out.println("Seeded favorites: " + favoriteRepository.count());
			System.out.println("Seeded news: " + newsArticleRepository.count());
			System.out.println("Seeded carts: " + cartRepository.count());
			System.out.println("Demo images stored under: " + uploadRoot);
			System.out.println("Admin login: admin@kamatcha.local / " + DEFAULT_PASSWORD);
			System.out.println("Manager login: manager.d1@kamatcha.local / " + DEFAULT_PASSWORD);
			System.out.println("Buyer login: user.anna@kamatcha.local / " + DEFAULT_PASSWORD);
		}

		private void normalizeLegacySchema() throws Exception {
			try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
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
			emailOtpRepository.deleteAll();
			userSessionRepository.deleteAll();

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

		private Map<String, Store> seedStores() {
			Map<String, Store> stores = new LinkedHashMap<>();
			stores.put("district-1", storeRepository.save(store(
					"district-1",
					"Kamatcha District One",
					"Flagship store with a bright tasting bar and fast city-center pickup.",
					"12 Nguyen Hue, District 1, Ho Chi Minh City",
					"district1@kamatcha.local",
					"0901000101",
					10.77690,
					106.70090,
					"District 1",
					"Nguyen Hue walking street",
					"06:30 - 22:00",
					LocalTime.of(6, 30),
					LocalTime.of(22, 0),
					"Fast-paced city flagship",
					"Open brew bar",
					"Modern flagship energy",
					"Signature lattes and ceremonial matcha",
					List.of("pickup-fast", "workspace", "pet-friendly")
			)));
			stores.put("riverside", storeRepository.save(store(
					"riverside",
					"Kamatcha Riverside",
					"Calmer riverside branch focused on brunch pairings and events.",
					"28 Tran Nao, Thu Duc City, Ho Chi Minh City",
					"riverside@kamatcha.local",
					"0901000102",
					10.78750,
					106.74210,
					"Thu Duc",
					"Saigon riverside",
					"07:00 - 22:30",
					LocalTime.of(7, 0),
					LocalTime.of(22, 30),
					"Slow weekend lounge",
					"Wood and stone interior",
					"Riverside retreat",
					"Desserts and bottled brews",
					List.of("brunch", "event-space", "group-friendly")
			)));
			stores.put("airport", storeRepository.save(store(
					"airport",
					"Kamatcha Airport Hub",
					"Travel-oriented branch for bottled drinks, quick tea, and grab-and-go food.",
					"05 Truong Son, Tan Binh, Ho Chi Minh City",
					"airport@kamatcha.local",
					"0901000103",
					10.81230,
					106.66470,
					"Tan Binh",
					"Near Tan Son Nhat airport",
					"05:30 - 23:00",
					LocalTime.of(5, 30),
					LocalTime.of(23, 0),
					"Efficient travel stop",
					"Compact transit bar",
					"Airport convenience",
					"Bottled drinks and tea fizz",
					List.of("grab-go", "late-open", "delivery")
			)));
			stores.put("garden", storeRepository.save(store(
					"garden",
					"Kamatcha Garden",
					"Leafy branch built for slow afternoons, cakes, and community workshops.",
					"91 Le Van Sy, Phu Nhuan, Ho Chi Minh City",
					"garden@kamatcha.local",
					"0901000104",
					10.79740,
					106.68140,
					"Phu Nhuan",
					"Courtyard garden",
					"07:30 - 21:30",
					LocalTime.of(7, 30),
					LocalTime.of(21, 30),
					"Warm neighborhood cafe",
					"Indoor garden seating",
					"Community and craft",
					"Desserts and workshops",
					List.of("family-friendly", "workshop", "quiet-zone")
			)));
			stores.put("sunset", storeRepository.save(store(
					"sunset",
					"Kamatcha Sunset Lab",
					"Experimental rooftop branch currently paused for menu revamp.",
					"44 Vo Thi Sau, District 3, Ho Chi Minh City",
					"sunset@kamatcha.local",
					"0901000105",
					10.78630,
					106.69210,
					"District 3",
					"Rooftop tasting room",
					"16:00 - 23:00",
					LocalTime.of(16, 0),
					LocalTime.of(23, 0),
					"Experimental night concept",
					"Lab counter and rooftop",
					"Playful and bold",
					"Seasonal drinks and limited desserts",
					List.of("night-scene", "signature-menu", "rooftop")
			)));
			stores.get("sunset").setActive(false);
			storeRepository.save(stores.get("sunset"));
			return stores;
		}

		private Map<String, User> seedUsers(Map<String, Store> stores) {
			Map<String, User> users = new LinkedHashMap<>();
			users.put("admin", userRepository.save(user("Platform Admin", "admin@kamatcha.local", Role.ADMIN, null)));
			users.put("manager-d1", userRepository.save(user("District Manager", "manager.d1@kamatcha.local", Role.MANAGER, stores.get("district-1"))));
			users.put("manager-river", userRepository.save(user("Riverside Manager", "manager.riverside@kamatcha.local", Role.MANAGER, stores.get("riverside"))));
			users.put("ops-manager-d1", userRepository.save(user("District Operations Manager", "ops.manager.d1@kamatcha.local", Role.MANAGER, stores.get("district-1"))));
			users.put("ops-manager-garden", userRepository.save(user("Garden Operations Manager", "ops.manager.garden@kamatcha.local", Role.MANAGER, stores.get("garden"))));
			users.put("shipper-d1", userRepository.save(user("District Shipper", "shipper.d1@kamatcha.local", Role.SHIPPER, stores.get("district-1"))));
			users.put("shipper-airport", userRepository.save(user("Airport Shipper", "shipper.airport@kamatcha.local", Role.SHIPPER, stores.get("airport"))));
			users.put("anna", userRepository.save(user("Anna Nguyen", "user.anna@kamatcha.local", Role.USER, null)));
			users.put("bao", userRepository.save(user("Bao Tran", "user.bao@kamatcha.local", Role.USER, null)));
			users.put("chi", userRepository.save(user("Chi Le", "user.chi@kamatcha.local", Role.USER, null)));
			users.put("dan", userRepository.save(user("Dan Pham", "user.dan@kamatcha.local", Role.USER, null)));
			users.put("em", userRepository.save(user("Em Vu", "user.em@kamatcha.local", Role.USER, null)));
			users.put("gia", userRepository.save(user("Gia Ho", "user.gia@kamatcha.local", Role.USER, null)));
			users.put("huy", userRepository.save(user("Huy Do", "user.huy@kamatcha.local", Role.USER, null)));
			users.put("khanh", userRepository.save(user("Khanh Bui", "user.khanh@kamatcha.local", Role.USER, null)));
			users.put("linh", userRepository.save(user("Linh Ha", "user.linh@kamatcha.local", Role.USER, null)));
			return users;
		}

		private Map<String, Category> seedCategories(Map<String, Store> stores) {
			Map<String, Category> categories = new LinkedHashMap<>();
			categories.put("signature-latte", categoryRepository.save(category(stores.get("district-1"), "Signature Latte", "Creamy matcha lattes and best sellers.", 1)));
			categories.put("ceremonial-tea", categoryRepository.save(category(stores.get("district-1"), "Ceremonial Tea", "Straight whisked matcha and clean tea service.", 2)));
			categories.put("dessert-bar", categoryRepository.save(category(stores.get("riverside"), "Dessert Bar", "Basque cakes, rolls, and chilled sweets.", 1)));
			categories.put("bottled-brew", categoryRepository.save(category(stores.get("riverside"), "Bottled Brew", "Cold brew bottles and travel drinks.", 2)));
			categories.put("tea-fizz", categoryRepository.save(category(stores.get("airport"), "Tea Fizz", "Sparkling tea, citrus, and quick refreshers.", 1)));
			categories.put("grab-go", categoryRepository.save(category(stores.get("airport"), "Grab & Go", "Portable meals and ready-to-go pairings.", 2)));
			categories.put("garden-cakes", categoryRepository.save(category(stores.get("garden"), "Garden Cakes", "Soft cakes and afternoon desserts.", 1)));
			categories.put("workshop-menu", categoryRepository.save(category(stores.get("garden"), "Workshop Menu", "Slow bar drinks built for classes and events.", 2)));
			categories.put("seasonal-lab", categoryRepository.save(category(stores.get("sunset"), "Seasonal Lab", "Experimental seasonal drinks.", 1)));
			categories.put("night-desserts", categoryRepository.save(category(stores.get("sunset"), "Night Desserts", "Late-night plated sweets.", 2)));
			return categories;
		}

		private Map<String, Dish> seedDishes(Map<String, Category> categories) {
			Map<String, Dish> dishes = new LinkedHashMap<>();
			dishes.put("iced-signature-latte", dishRepository.save(dish(categories.get("signature-latte"), "Iced Signature Matcha Latte", "Smooth matcha latte with house cream foam.", "Best seller all year", new BigDecimal("65000"), true, false, null)));
			dishes.put("strawberry-cloud", dishRepository.save(dish(categories.get("signature-latte"), "Strawberry Cloud Matcha", "Layered strawberry puree with thick matcha cloud.", "Photogenic layered drink", new BigDecimal("78000"), true, true, "Requires franchise-grade strawberry puree")));
			dishes.put("dirty-houjicha", dishRepository.save(dish(categories.get("signature-latte"), "Dirty Houjicha Matcha", "Matcha shot over roasted tea cream.", "Bold roast finish", new BigDecimal("72000"), true, false, null)));
			dishes.put("ceremonial-usucha", dishRepository.save(dish(categories.get("ceremonial-tea"), "Ceremonial Usucha", "Clean whisked matcha for purists.", "Low sugar and grassy finish", new BigDecimal("59000"), true, false, null)));
			dishes.put("yuzu-tea", dishRepository.save(dish(categories.get("ceremonial-tea"), "Yuzu Matcha Tea", "Bright yuzu peel on top of shaken matcha tea.", "Citrus-forward and light", new BigDecimal("62000"), true, false, null)));
			dishes.put("burnt-cheesecake", dishRepository.save(dish(categories.get("dessert-bar"), "Burnt Matcha Cheesecake", "Creamy burnt cheesecake with matcha dust.", "Pairs well with hot tea", new BigDecimal("69000"), true, false, null)));
			dishes.put("moss-roll", dishRepository.save(dish(categories.get("dessert-bar"), "Moss Swiss Roll", "Soft sponge rolled with matcha cream.", "Soft and not too sweet", new BigDecimal("56000"), true, false, null)));
			dishes.put("cold-brew-bottle", dishRepository.save(dish(categories.get("bottled-brew"), "Cold Brew Matcha Bottle", "Ready-to-go cold brew matcha bottle.", "Great for long commutes", new BigDecimal("68000"), true, false, null)));
			dishes.put("banana-bottle", dishRepository.save(dish(categories.get("bottled-brew"), "Banana Oat Matcha Bottle", "Creamy bottled oat matcha with banana.", "Breakfast bottle", new BigDecimal("74000"), true, true, "Needs oat blend")));
			dishes.put("sparkling-yuzu", dishRepository.save(dish(categories.get("tea-fizz"), "Sparkling Yuzu Matcha", "Sparkling citrus matcha fizz.", "High refreshment", new BigDecimal("66000"), true, false, null)));
			dishes.put("sparkling-passion", dishRepository.save(dish(categories.get("tea-fizz"), "Passion Fruit Matcha Fizz", "Tart passion fruit matcha cooler.", "Tropical and bright", new BigDecimal("67000"), true, false, null)));
			dishes.put("onigiri-set", dishRepository.save(dish(categories.get("grab-go"), "Matcha Onigiri Set", "Savory rice set paired with hot tea.", "Quick airport meal", new BigDecimal("85000"), true, false, null)));
			dishes.put("garden-tiramisu", dishRepository.save(dish(categories.get("garden-cakes"), "Matcha Tiramisu Garden", "Soft tiramisu with earthy cream.", "Best afternoon dessert", new BigDecimal("72000"), true, false, null)));
			dishes.put("pistachio-shortcake", dishRepository.save(dish(categories.get("garden-cakes"), "Pistachio Matcha Shortcake", "Layered cake with pistachio cream.", "Limited weekend slice", new BigDecimal("76000"), true, true, "Weekend pistachio stock only")));
			dishes.put("slow-bar-flight", dishRepository.save(dish(categories.get("workshop-menu"), "Slow Bar Matcha Flight", "Three-mini-cup tasting flight.", "Shared tasting experience", new BigDecimal("99000"), true, false, null)));
			dishes.put("seasonal-plum", dishRepository.save(dish(categories.get("seasonal-lab"), "Salted Plum Matcha", "Savory-sour seasonal matcha tonic.", "Limited lab release", new BigDecimal("82000"), true, true, "Seasonal syrup batch")));
			dishes.put("cacao-night", dishRepository.save(dish(categories.get("seasonal-lab"), "Cacao Night Matcha", "Dark cacao matcha latte for evening menu.", "Late-night comfort", new BigDecimal("79000"), true, false, null)));
			dishes.put("toasted-mochi", dishRepository.save(dish(categories.get("night-desserts"), "Toasted Mochi Sundae", "Warm mochi with cold matcha cream.", "Night menu favorite", new BigDecimal("88000"), true, false, null)));
			return dishes;
		}

		private Map<String, StoreDish> seedStoreDishes(Map<String, Store> stores, Map<String, Dish> dishes) {
			Map<String, StoreDish> storeDishes = new LinkedHashMap<>();
			putStoreDish(storeDishes, "district-1", stores.get("district-1"), "iced-signature-latte", dishes.get("iced-signature-latte"), 48, true, null);
			putStoreDish(storeDishes, "district-1", stores.get("district-1"), "strawberry-cloud", dishes.get("strawberry-cloud"), 22, true, null);
			putStoreDish(storeDishes, "district-1", stores.get("district-1"), "dirty-houjicha", dishes.get("dirty-houjicha"), 18, true, new BigDecimal("75000"));
			putStoreDish(storeDishes, "district-1", stores.get("district-1"), "ceremonial-usucha", dishes.get("ceremonial-usucha"), 24, true, null);
			putStoreDish(storeDishes, "district-1", stores.get("district-1"), "yuzu-tea", dishes.get("yuzu-tea"), 16, true, null);
			putStoreDish(storeDishes, "district-1", stores.get("district-1"), "slow-bar-flight", dishes.get("slow-bar-flight"), 10, true, null);

			putStoreDish(storeDishes, "riverside", stores.get("riverside"), "iced-signature-latte", dishes.get("iced-signature-latte"), 30, true, new BigDecimal("67000"));
			putStoreDish(storeDishes, "riverside", stores.get("riverside"), "burnt-cheesecake", dishes.get("burnt-cheesecake"), 14, true, null);
			putStoreDish(storeDishes, "riverside", stores.get("riverside"), "moss-roll", dishes.get("moss-roll"), 12, true, null);
			putStoreDish(storeDishes, "riverside", stores.get("riverside"), "cold-brew-bottle", dishes.get("cold-brew-bottle"), 20, true, null);
			putStoreDish(storeDishes, "riverside", stores.get("riverside"), "banana-bottle", dishes.get("banana-bottle"), 9, true, new BigDecimal("76000"));
			putStoreDish(storeDishes, "riverside", stores.get("riverside"), "garden-tiramisu", dishes.get("garden-tiramisu"), 8, true, null);

			putStoreDish(storeDishes, "airport", stores.get("airport"), "cold-brew-bottle", dishes.get("cold-brew-bottle"), 35, true, null);
			putStoreDish(storeDishes, "airport", stores.get("airport"), "banana-bottle", dishes.get("banana-bottle"), 12, true, null);
			putStoreDish(storeDishes, "airport", stores.get("airport"), "sparkling-yuzu", dishes.get("sparkling-yuzu"), 28, true, null);
			putStoreDish(storeDishes, "airport", stores.get("airport"), "sparkling-passion", dishes.get("sparkling-passion"), 26, true, null);
			putStoreDish(storeDishes, "airport", stores.get("airport"), "onigiri-set", dishes.get("onigiri-set"), 15, true, null);
			putStoreDish(storeDishes, "airport", stores.get("airport"), "iced-signature-latte", dishes.get("iced-signature-latte"), 10, true, new BigDecimal("69000"));

			putStoreDish(storeDishes, "garden", stores.get("garden"), "garden-tiramisu", dishes.get("garden-tiramisu"), 18, true, null);
			putStoreDish(storeDishes, "garden", stores.get("garden"), "pistachio-shortcake", dishes.get("pistachio-shortcake"), 7, true, null);
			putStoreDish(storeDishes, "garden", stores.get("garden"), "slow-bar-flight", dishes.get("slow-bar-flight"), 11, true, new BigDecimal("105000"));
			putStoreDish(storeDishes, "garden", stores.get("garden"), "ceremonial-usucha", dishes.get("ceremonial-usucha"), 13, true, null);
			putStoreDish(storeDishes, "garden", stores.get("garden"), "moss-roll", dishes.get("moss-roll"), 0, false, null);

			putStoreDish(storeDishes, "sunset", stores.get("sunset"), "seasonal-plum", dishes.get("seasonal-plum"), 6, true, null);
			putStoreDish(storeDishes, "sunset", stores.get("sunset"), "cacao-night", dishes.get("cacao-night"), 4, true, null);
			putStoreDish(storeDishes, "sunset", stores.get("sunset"), "toasted-mochi", dishes.get("toasted-mochi"), 0, false, null);
			putStoreDish(storeDishes, "sunset", stores.get("sunset"), "strawberry-cloud", dishes.get("strawberry-cloud"), 5, true, new BigDecimal("81000"));
			return storeDishes;
		}

		private Map<String, EventItem> seedEvents(Map<String, Store> stores, Map<String, Dish> dishes) {
			Map<String, EventItem> events = new LinkedHashMap<>();
			events.put("latte-night", eventItemRepository.save(event(
					stores.get("district-1"),
					"Late Night Matcha Bar",
					"Signature latte tasting with a guided menu walk-through.",
					"Flagship tasting counter",
					"Friday 20:00",
					Instant.parse("2026-04-03T13:00:00Z"),
					Instant.parse("2026-04-03T15:00:00Z"),
					40,
					24,
					true,
					List.of(dishes.get("iced-signature-latte").getId(), dishes.get("dirty-houjicha").getId())
			)));
			events.put("river-brunch", eventItemRepository.save(event(
					stores.get("riverside"),
					"Riverside Brunch Pairing",
					"Dessert and bottled brew pairing by the river.",
					"Riverside terrace",
					"Sunday 09:00",
					Instant.parse("2026-04-05T02:00:00Z"),
					Instant.parse("2026-04-05T04:00:00Z"),
					30,
					18,
					true,
					List.of(dishes.get("burnt-cheesecake").getId(), dishes.get("cold-brew-bottle").getId())
			)));
			events.put("airport-sampling", eventItemRepository.save(event(
					stores.get("airport"),
					"Commuter Sampling Booth",
					"Quick seasonal samples for travelers.",
					"Airport pickup zone",
					"Daily 08:00",
					Instant.parse("2026-03-25T01:00:00Z"),
					Instant.parse("2026-03-25T03:00:00Z"),
					50,
					41,
					true,
					List.of(dishes.get("sparkling-yuzu").getId(), dishes.get("cold-brew-bottle").getId())
			)));
			events.put("garden-workshop", eventItemRepository.save(event(
					stores.get("garden"),
					"Garden Matcha Workshop",
					"Slow bar class with tasting flight and dessert pairing.",
					"Garden studio room",
					"Saturday 15:00",
					Instant.parse("2026-04-11T08:00:00Z"),
					Instant.parse("2026-04-11T10:30:00Z"),
					16,
					12,
					true,
					List.of(dishes.get("slow-bar-flight").getId(), dishes.get("garden-tiramisu").getId())
			)));
			events.put("sunset-lab", eventItemRepository.save(event(
					stores.get("sunset"),
					"Sunset Lab Preview",
					"Experimental rooftop menu preview while the branch is paused.",
					"Rooftop lab bar",
					"Saturday 19:00",
					Instant.parse("2026-04-18T12:00:00Z"),
					Instant.parse("2026-04-18T14:00:00Z"),
					20,
					8,
					false,
					List.of(dishes.get("seasonal-plum").getId(), dishes.get("cacao-night").getId())
			)));
			events.put("district-past", eventItemRepository.save(event(
					stores.get("district-1"),
					"Flagship Cupping Archive",
					"An already-finished tasting used for disabled-state testing.",
					"Flagship tasting counter",
					"Past event",
					Instant.parse("2026-03-01T10:00:00Z"),
					Instant.parse("2026-03-01T12:00:00Z"),
					25,
					25,
					true,
					List.of(dishes.get("ceremonial-usucha").getId())
			)));
			return events;
		}

		private void seedOrders(Map<String, User> users, Map<String, StoreDish> storeDishes) {
			createOrder(users.get("anna"), OrderStatus.COMPLETED, List.of(
					line(storeDishes.get(key("district-1", "iced-signature-latte")), 2),
					line(storeDishes.get(key("district-1", "ceremonial-usucha")), 1)
			));
			createOrder(users.get("bao"), OrderStatus.COMPLETED, List.of(
					line(storeDishes.get(key("riverside", "burnt-cheesecake")), 1),
					line(storeDishes.get(key("riverside", "cold-brew-bottle")), 2)
			));
			createOrder(users.get("chi"), OrderStatus.CONFIRMED, List.of(
					line(storeDishes.get(key("airport", "sparkling-yuzu")), 1),
					line(storeDishes.get(key("airport", "onigiri-set")), 1)
			));
			createOrder(users.get("dan"), OrderStatus.PENDING, List.of(
					line(storeDishes.get(key("garden", "garden-tiramisu")), 1),
					line(storeDishes.get(key("garden", "slow-bar-flight")), 1)
			));
			createOrder(users.get("em"), OrderStatus.COMPLETED, List.of(
					line(storeDishes.get(key("district-1", "dirty-houjicha")), 1),
					line(storeDishes.get(key("district-1", "strawberry-cloud")), 1)
			));
			createOrder(users.get("gia"), OrderStatus.COMPLETED, List.of(
					line(storeDishes.get(key("airport", "cold-brew-bottle")), 1),
					line(storeDishes.get(key("airport", "sparkling-passion")), 2)
			));
			createOrder(users.get("huy"), OrderStatus.CONFIRMED, List.of(
					line(storeDishes.get(key("district-1", "iced-signature-latte")), 1)
			));
			createOrder(users.get("khanh"), OrderStatus.COMPLETED, List.of(
					line(storeDishes.get(key("garden", "pistachio-shortcake")), 1),
					line(storeDishes.get(key("garden", "ceremonial-usucha")), 1)
			));
			createOrder(users.get("linh"), OrderStatus.COMPLETED, List.of(
					line(storeDishes.get(key("riverside", "banana-bottle")), 1),
					line(storeDishes.get(key("riverside", "iced-signature-latte")), 1)
			));
		}

		private void seedReviews(
				Map<String, User> users,
				Map<String, Store> stores,
				Map<String, Dish> dishes,
				Map<String, EventItem> events
		) {
			reviewRepository.save(review(users.get("anna"), ReviewTargetType.STORE, stores.get("district-1").getId(), 5, "Fast and bright", "Flagship branch was fast even during rush hour.", true));
			reviewRepository.save(review(users.get("anna"), ReviewTargetType.DISH, dishes.get("iced-signature-latte").getId(), 5, "Still the best", "Balanced sweetness and strong matcha body.", true));
			reviewRepository.save(review(users.get("bao"), ReviewTargetType.STORE, stores.get("riverside").getId(), 4, "Relaxed vibe", "Dessert setup by the river feels very calm.", true));
			reviewRepository.save(review(users.get("bao"), ReviewTargetType.EVENT, events.get("river-brunch").getId(), 5, "Worth the weekend", "The pairing session felt polished and thoughtful.", true));
			reviewRepository.save(review(users.get("chi"), ReviewTargetType.DISH, dishes.get("sparkling-yuzu").getId(), 4, "Very fresh", "Perfect airport pickup drink.", true));
			reviewRepository.save(review(users.get("dan"), ReviewTargetType.STORE, stores.get("garden").getId(), 5, "Peaceful branch", "Great place to sit and work for an afternoon.", true));
			reviewRepository.save(review(users.get("em"), ReviewTargetType.EVENT, events.get("latte-night").getId(), 4, "Fun guided tasting", "Good pace and the tasting order made sense.", true));
			reviewRepository.save(review(users.get("gia"), ReviewTargetType.DISH, dishes.get("cold-brew-bottle").getId(), 5, "Commute saver", "Convenient and still tastes fresh later.", true));
			reviewRepository.save(review(users.get("linh"), ReviewTargetType.STORE, stores.get("riverside").getId(), 5, "Brunch favorite", "Service was warm and desserts looked great.", true));

			reviewRepository.save(review(users.get("huy"), ReviewTargetType.STORE, stores.get("district-1").getId(), 4, "Reliable flagship", "Consistent drinks and fast pickup.", true));
			reviewRepository.save(review(users.get("khanh"), ReviewTargetType.DISH, dishes.get("pistachio-shortcake").getId(), 5, "Weekend favorite", "Textured cake and balanced cream.", true));
			reviewRepository.save(review(users.get("dan"), ReviewTargetType.EVENT, events.get("garden-workshop").getId(), 5, "Workshop highlight", "Good pacing and clear hands-on guidance.", true));
		}

		private void seedFavorites(
				Map<String, User> users,
				Map<String, Store> stores,
				Map<String, Dish> dishes,
				Map<String, EventItem> events
		) {
			favoriteRepository.save(favorite(users.get("anna"), FavoriteTargetType.STORE, stores.get("district-1").getId()));
			favoriteRepository.save(favorite(users.get("anna"), FavoriteTargetType.DISH, dishes.get("iced-signature-latte").getId()));
			favoriteRepository.save(favorite(users.get("bao"), FavoriteTargetType.EVENT, events.get("river-brunch").getId()));
			favoriteRepository.save(favorite(users.get("bao"), FavoriteTargetType.STORE, stores.get("riverside").getId()));
			favoriteRepository.save(favorite(users.get("chi"), FavoriteTargetType.DISH, dishes.get("sparkling-yuzu").getId()));
			favoriteRepository.save(favorite(users.get("chi"), FavoriteTargetType.STORE, stores.get("airport").getId()));
			favoriteRepository.save(favorite(users.get("dan"), FavoriteTargetType.EVENT, events.get("garden-workshop").getId()));
			favoriteRepository.save(favorite(users.get("dan"), FavoriteTargetType.DISH, dishes.get("garden-tiramisu").getId()));
			favoriteRepository.save(favorite(users.get("em"), FavoriteTargetType.STORE, stores.get("district-1").getId()));
			favoriteRepository.save(favorite(users.get("gia"), FavoriteTargetType.DISH, dishes.get("cold-brew-bottle").getId()));
			favoriteRepository.save(favorite(users.get("huy"), FavoriteTargetType.EVENT, events.get("latte-night").getId()));
			favoriteRepository.save(favorite(users.get("linh"), FavoriteTargetType.STORE, stores.get("riverside").getId()));
		}

		private void seedNews(Map<String, Store> stores, Map<String, EventItem> events) {
			newsArticleRepository.save(news(
					"Kamatcha Airport Hub is now open",
					"Kamatcha officially opens a new branch near the airport with a grab-and-go and bottled brew menu.",
					"Kamatcha officially opens Kamatcha Airport Hub for guests who need a quick, reliable stop that is easy to take away. The new branch focuses on bottled brew, tea fizz, and compact snack sets for travelers.",
					stores.get("airport"),
					List.of("khai-truong", "chi-nhanh-moi", "san-bay"),
					stores.get("airport").getImagePaths(),
					true,
					true,
					Instant.parse("2026-03-20T02:00:00Z")
			));
			newsArticleRepository.save(news(
					"Kamatcha mo rong workshop tai Garden",
					"Chuoi workshop cuoi tuan tai Kamatcha Garden duoc mo rong them nhieu khung gio moi.",
					"Starting this month, Kamatcha Garden will add more weekend workshops for guests who enjoy a slower matcha experience. Guests can follow the new schedule and reserve spots through the event page.",
					stores.get("garden"),
					List.of("workshop", "community", "garden"),
					events.get("garden-workshop").getImagePaths(),
					true,
					true,
					Instant.parse("2026-03-18T02:00:00Z")
			));
			newsArticleRepository.save(news(
					"Summer menu 2026 is coming soon",
					"The brand is preparing a new summer lineup built around fruit flavors and bottled tea.",
					"Kamatcha is finalizing the 2026 summer menu, focusing on refreshing, lower-sugar drinks that work well on the go. This article was updated early to announce the upcoming launch.",
					null,
					List.of("menu-moi", "mua-he", "coming-soon"),
					List.of(),
					false,
					true,
					Instant.parse("2026-03-17T02:00:00Z")
			));
			newsArticleRepository.save(news(
					"Internal draft for the rooftop concept",
					"A draft document for the internal team to prepare the next testing phase.",
					"Internal content only, not published externally.",
					stores.get("sunset"),
					List.of("draft", "internal"),
					List.of(),
					false,
					false,
					null
			));
		}

		private void seedCarts(Map<String, User> users, Map<String, StoreDish> storeDishes) {
			createOpenCart(users.get("anna"), List.of(
					line(storeDishes.get(key("district-1", "strawberry-cloud")), 1),
					line(storeDishes.get(key("district-1", "yuzu-tea")), 2)
			));
			createOpenCart(users.get("chi"), List.of(
					line(storeDishes.get(key("airport", "cold-brew-bottle")), 2),
					line(storeDishes.get(key("airport", "onigiri-set")), 1)
			));
			createOpenCart(users.get("linh"), List.of(
					line(storeDishes.get(key("riverside", "burnt-cheesecake")), 1),
					line(storeDishes.get(key("riverside", "banana-bottle")), 1)
			));
		}

		private void attachDemoImages(
				Map<String, Store> stores,
				Map<String, Category> categories,
				Map<String, Dish> dishes,
				Map<String, EventItem> events
		) throws Exception {
			Map<String, List<String>> storeImages = new LinkedHashMap<>();
			storeImages.put("district-1", List.of(
					downloadDemoImage("stores", "seed-store-district-1-1.jpg", "matcha,cafe,interior", 101),
					downloadDemoImage("stores", "seed-store-district-1-2.jpg", "tea,bar,interior", 102)
			));
			storeImages.put("riverside", List.of(
					downloadDemoImage("stores", "seed-store-riverside-1.jpg", "cafe,interior,river", 103),
					downloadDemoImage("stores", "seed-store-riverside-2.jpg", "brunch,cafe,interior", 104)
			));
			storeImages.put("airport", List.of(
					downloadDemoImage("stores", "seed-store-airport-1.jpg", "coffee,shop,interior", 105),
					downloadDemoImage("stores", "seed-store-airport-2.jpg", "bottle,drink,cafe", 106)
			));
			storeImages.put("garden", List.of(
					downloadDemoImage("stores", "seed-store-garden-1.jpg", "garden,cafe,interior", 107),
					downloadDemoImage("stores", "seed-store-garden-2.jpg", "dessert,cafe,garden", 108)
			));
			storeImages.put("sunset", List.of(
					downloadDemoImage("stores", "seed-store-sunset-1.jpg", "rooftop,cafe,night", 109),
					downloadDemoImage("stores", "seed-store-sunset-2.jpg", "bar,interior,night", 110)
			));

			storeImages.forEach((key, paths) -> stores.get(key).setImagePaths(paths));
			storeRepository.saveAll(stores.values());

			Map<String, String> categoryImages = new LinkedHashMap<>();
			categoryImages.put("signature-latte", downloadDemoImage("categories", "seed-category-signature-latte.jpg", "matcha,latte", 201));
			categoryImages.put("ceremonial-tea", downloadDemoImage("categories", "seed-category-ceremonial-tea.jpg", "tea,ceremony", 202));
			categoryImages.put("dessert-bar", downloadDemoImage("categories", "seed-category-dessert-bar.jpg", "dessert,cake", 203));
			categoryImages.put("bottled-brew", downloadDemoImage("categories", "seed-category-bottled-brew.jpg", "bottled,drink", 204));
			categoryImages.put("tea-fizz", downloadDemoImage("categories", "seed-category-tea-fizz.jpg", "sparkling,drink", 205));
			categoryImages.put("grab-go", downloadDemoImage("categories", "seed-category-grab-go.jpg", "food,meal", 206));
			categoryImages.put("garden-cakes", downloadDemoImage("categories", "seed-category-garden-cakes.jpg", "cake,dessert", 207));
			categoryImages.put("workshop-menu", downloadDemoImage("categories", "seed-category-workshop-menu.jpg", "tea,workshop", 208));
			categoryImages.put("seasonal-lab", downloadDemoImage("categories", "seed-category-seasonal-lab.jpg", "matcha,drink", 209));
			categoryImages.put("night-desserts", downloadDemoImage("categories", "seed-category-night-desserts.jpg", "dessert,night", 210));

			categoryImages.forEach((key, path) -> categories.get(key).setImagePaths(List.of(path)));
			categoryRepository.saveAll(categories.values());

			Map<String, String> dishImages = new LinkedHashMap<>();
			dishImages.put("iced-signature-latte", downloadDemoImage("dishes", "seed-dish-iced-signature-latte.jpg", "matcha,latte", 301));
			dishImages.put("strawberry-cloud", downloadDemoImage("dishes", "seed-dish-strawberry-cloud.jpg", "strawberry,drink", 302));
			dishImages.put("dirty-houjicha", downloadDemoImage("dishes", "seed-dish-dirty-houjicha.jpg", "tea,latte", 303));
			dishImages.put("ceremonial-usucha", downloadDemoImage("dishes", "seed-dish-ceremonial-usucha.jpg", "tea,ceremony", 304));
			dishImages.put("yuzu-tea", downloadDemoImage("dishes", "seed-dish-yuzu-tea.jpg", "citrus,tea", 305));
			dishImages.put("burnt-cheesecake", downloadDemoImage("dishes", "seed-dish-burnt-cheesecake.jpg", "cheesecake,dessert", 306));
			dishImages.put("moss-roll", downloadDemoImage("dishes", "seed-dish-moss-roll.jpg", "cake,roll", 307));
			dishImages.put("cold-brew-bottle", downloadDemoImage("dishes", "seed-dish-cold-brew-bottle.jpg", "bottled,drink", 308));
			dishImages.put("banana-bottle", downloadDemoImage("dishes", "seed-dish-banana-bottle.jpg", "banana,drink", 309));
			dishImages.put("sparkling-yuzu", downloadDemoImage("dishes", "seed-dish-sparkling-yuzu.jpg", "sparkling,citrus", 310));
			dishImages.put("sparkling-passion", downloadDemoImage("dishes", "seed-dish-sparkling-passion.jpg", "sparkling,drink", 311));
			dishImages.put("onigiri-set", downloadDemoImage("dishes", "seed-dish-onigiri-set.jpg", "onigiri,food", 312));
			dishImages.put("garden-tiramisu", downloadDemoImage("dishes", "seed-dish-garden-tiramisu.jpg", "tiramisu,dessert", 313));
			dishImages.put("pistachio-shortcake", downloadDemoImage("dishes", "seed-dish-pistachio-shortcake.jpg", "shortcake,dessert", 314));
			dishImages.put("slow-bar-flight", downloadDemoImage("dishes", "seed-dish-slow-bar-flight.jpg", "tea,workshop", 315));
			dishImages.put("seasonal-plum", downloadDemoImage("dishes", "seed-dish-seasonal-plum.jpg", "plum,drink", 316));
			dishImages.put("cacao-night", downloadDemoImage("dishes", "seed-dish-cacao-night.jpg", "cocoa,latte", 317));
			dishImages.put("toasted-mochi", downloadDemoImage("dishes", "seed-dish-toasted-mochi.jpg", "mochi,dessert", 318));

			dishImages.forEach((key, path) -> dishes.get(key).setImagePaths(List.of(path)));
			dishRepository.saveAll(dishes.values());

			Map<String, String> eventImages = new LinkedHashMap<>();
			eventImages.put("latte-night", downloadDemoImage("events", "seed-event-latte-night.jpg", "matcha,workshop", 401));
			eventImages.put("river-brunch", downloadDemoImage("events", "seed-event-river-brunch.jpg", "brunch,cafe", 402));
			eventImages.put("airport-sampling", downloadDemoImage("events", "seed-event-airport-sampling.jpg", "tasting,event", 403));
			eventImages.put("garden-workshop", downloadDemoImage("events", "seed-event-garden-workshop.jpg", "tea,workshop", 404));
			eventImages.put("sunset-lab", downloadDemoImage("events", "seed-event-sunset-lab.jpg", "rooftop,event", 405));
			eventImages.put("district-past", downloadDemoImage("events", "seed-event-district-past.jpg", "tea,tasting", 406));

			eventImages.forEach((key, path) -> events.get(key).setImagePaths(List.of(path)));
			eventItemRepository.saveAll(events.values());
		}

		private String downloadDemoImage(String folder, String fileName, String tags, int lock) throws Exception {
			Path folderPath = uploadRoot.resolve(folder);
			Files.createDirectories(folderPath);
			Path targetPath = folderPath.resolve(fileName);
			if (Files.exists(targetPath) && Files.size(targetPath) > 0) {
				return "/uploads/" + folder + "/" + fileName;
			}

			IOException lastException = null;
			for (String candidateTags : List.of(tags, "matcha,cafe", "matcha")) {
				try {
					HttpRequest request = HttpRequest.newBuilder()
							.uri(URI.create("https://loremflickr.com/1200/900/" + candidateTags + "?lock=" + lock))
							.header("User-Agent", "KamatchaSeeder/1.0")
							.GET()
							.build();
					HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
					if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body().length > 0) {
						Files.write(targetPath, response.body());
						return "/uploads/" + folder + "/" + fileName;
					}
					lastException = new IOException("Unexpected response " + response.statusCode() + " for " + candidateTags);
				} catch (IOException exception) {
					lastException = exception;
				} catch (InterruptedException exception) {
					Thread.currentThread().interrupt();
					throw exception;
				}
			}

			throw new IOException("Unable to download demo image for " + fileName, lastException);
		}

		private Store store(
				String slug,
				String name,
				String description,
				String address,
				String contactEmail,
				String phoneNumber,
				double latitude,
				double longitude,
				String area,
				String positionLabel,
				String hoursText,
				LocalTime openTime,
				LocalTime closeTime,
				String personality,
				String designSignature,
				String franchiseMood,
				String specialty,
				List<String> serviceTags
		) {
			Store store = new Store();
			store.setSlug(slug);
			store.setName(name);
			store.setDescription(description);
			store.setAddress(address);
			store.setContactEmail(contactEmail);
			store.setPhoneNumber(phoneNumber);
			store.setLatitude(latitude);
			store.setLongitude(longitude);
			store.setArea(area);
			store.setPositionLabel(positionLabel);
			store.setHoursText(hoursText);
			store.setOpenTime(openTime);
			store.setCloseTime(closeTime);
			store.setPersonality(personality);
			store.setDesignSignature(designSignature);
			store.setFranchiseMood(franchiseMood);
			store.setSpecialty(specialty);
			store.setServiceTags(serviceTags);
			store.setImagePaths(List.of());
			store.setActive(true);
			return store;
		}

		private User user(String fullName, String email, Role role, Store workingStore) {
			User user = new User();
			user.setFullName(fullName);
			user.setEmail(email);
			user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
			user.setRole(role);
			user.setWorkingStore(workingStore);
			user.setEnabled(true);
			user.setVerifiedAt(Instant.now());
			return user;
		}

		private Category category(Store store, String name, String description, int sortOrder) {
			Category category = new Category();
			category.setStore(store);
			category.setName(name);
			category.setDescription(description);
			category.setSortOrder(sortOrder);
			category.setActive(true);
			category.setImagePaths(List.of());
			return category;
		}

		private Dish dish(
				Category category,
				String name,
				String description,
				String note,
				BigDecimal price,
				boolean available,
				boolean franchiseRequired,
				String franchiseNote
		) {
			Dish dish = new Dish();
			dish.setCategory(category);
			dish.setName(name);
			dish.setDescription(description);
			dish.setNote(note);
			dish.setPrice(price);
			dish.setAvailable(available);
			dish.setStatus("ACTIVE");
			dish.setFranchiseRequired(franchiseRequired);
			dish.setFranchiseNote(franchiseNote);
			dish.setActive(true);
			dish.setImagePaths(List.of());
			return dish;
		}

		private void putStoreDish(
				Map<String, StoreDish> target,
				String storeKey,
				Store store,
				String dishKey,
				Dish dish,
				int quantity,
				boolean available,
				BigDecimal priceOverride
		) {
			StoreDish storeDish = new StoreDish();
			storeDish.setStore(store);
			storeDish.setDish(dish);
			storeDish.setQuantity(quantity);
			storeDish.setAvailable(available);
			storeDish.setPriceOverride(priceOverride);
			target.put(key(storeKey, dishKey), storeDishRepository.save(storeDish));
		}

		private EventItem event(
				Store store,
				String name,
				String description,
				String location,
				String scheduleText,
				Instant startsAt,
				Instant endsAt,
				int capacity,
				int bookedCount,
				boolean active,
				List<Long> featuredDishIds
		) {
			EventItem event = new EventItem();
			event.setStore(store);
			event.setName(name);
			event.setDescription(description);
			event.setLocation(location);
			event.setScheduleText(scheduleText);
			event.setStartsAt(startsAt);
			event.setEndsAt(endsAt);
			event.setCapacity(capacity);
			event.setBookedCount(bookedCount);
			event.setActive(active);
			event.setFeaturedDishIds(featuredDishIds);
			event.setImagePaths(List.of());
			return event;
		}

		private void createOrder(User user, OrderStatus status, List<OrderLine> lines) {
			Order order = new Order();
			order.setUser(user);
			order.setStatus(status);
			order.setTotalAmount(BigDecimal.ZERO);
			Order savedOrder = orderRepository.save(order);

			BigDecimal total = BigDecimal.ZERO;
			for (OrderLine line : lines) {
				OrderItem orderItem = new OrderItem();
				orderItem.setOrder(savedOrder);
				orderItem.setStore(line.storeDish().getStore());
				orderItem.setDish(line.storeDish().getDish());
				orderItem.setQuantity(line.quantity());
				orderItem.setUnitPrice(effectivePrice(line.storeDish()));
				orderItemRepository.save(orderItem);
				total = total.add(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())));
			}

			savedOrder.setTotalAmount(total);
			orderRepository.save(savedOrder);
		}

		private Review review(
				User user,
				ReviewTargetType targetType,
				Long targetId,
				int rating,
				String title,
				String comment,
				boolean approved
		) {
			Review review = new Review();
			review.setUser(user);
			review.setTargetType(targetType);
			review.setTargetId(targetId);
			review.setRating(rating);
			review.setTitle(title);
			review.setComment(comment);
			review.setApproved(approved);
			return review;
		}

		private Favorite favorite(User user, FavoriteTargetType targetType, Long targetId) {
			Favorite favorite = new Favorite();
			favorite.setUser(user);
			favorite.setTargetType(targetType);
			favorite.setTargetId(targetId);
			return favorite;
		}

		private NewsArticle news(
				String title,
				String summary,
				String content,
				Store relatedStore,
				List<String> tags,
				List<String> imagePaths,
				boolean featured,
				boolean published,
				Instant publishedAt
		) {
			NewsArticle newsArticle = new NewsArticle();
			newsArticle.setTitle(title);
			newsArticle.setSlug(com.example.registrationotp.support.NewsSlugNormalizer.normalize(title));
			newsArticle.setSummary(summary);
			newsArticle.setContent(content);
			newsArticle.setRelatedStore(relatedStore);
			newsArticle.setTags(tags);
			newsArticle.setImagePaths(imagePaths);
			newsArticle.setFeatured(featured);
			newsArticle.setPublished(published);
			newsArticle.setPublishedAt(publishedAt);
			return newsArticle;
		}

		private void createOpenCart(User user, List<OrderLine> lines) {
			Cart cart = new Cart();
			cart.setUser(user);
			cart.setStatus(CartStatus.OPEN);
			Cart savedCart = cartRepository.save(cart);

			for (OrderLine line : lines) {
				CartItem item = new CartItem();
				item.setCart(savedCart);
				item.setStore(line.storeDish().getStore());
				item.setDish(line.storeDish().getDish());
				item.setQuantity(line.quantity());
				item.setUnitPrice(effectivePrice(line.storeDish()));
				cartItemRepository.save(item);
			}
		}

		private BigDecimal effectivePrice(StoreDish storeDish) {
			return storeDish.getPriceOverride() != null ? storeDish.getPriceOverride() : storeDish.getDish().getPrice();
		}

		private OrderLine line(StoreDish storeDish, int quantity) {
			return new OrderLine(storeDish, quantity);
		}

		private String key(String left, String right) {
			return left + "|" + right;
		}
	}

	private record OrderLine(StoreDish storeDish, int quantity) {
	}
}
