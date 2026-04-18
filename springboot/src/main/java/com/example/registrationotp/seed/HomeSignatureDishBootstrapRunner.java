package com.example.registrationotp.seed;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.repository.CategoryRepository;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.StoreRepository;

@Component
@ConditionalOnProperty(
		prefix = "app.demo",
		name = "bootstrap-home-signature-dishes",
		havingValue = "true",
		matchIfMissing = true
)
public class HomeSignatureDishBootstrapRunner implements ApplicationRunner {

	private static final List<SignatureDishSeed> SIGNATURE_DISH_SEEDS = List.of(
			new SignatureDishSeed(
					"Velvet Matcha Latte",
					"A bold signature latte featured on the home page for quick ordering.",
					"A best seller that leads the signature collection.",
					BigDecimal.valueOf(69000),
					List.of("signature", "best seller", "matcha")
			),
			new SignatureDishSeed(
					"Cloud Foam Matcha",
					"A matcha drink with soft foam that suits both new and returning guests.",
					"Soft foam with a clear green tea finish.",
					BigDecimal.valueOf(72000),
					List.of("signature", "foam", "creamy")
			),
			new SignatureDishSeed(
					"Yuzu Matcha Spark",
					"A refreshing signature yuzu drink that fits warm weather.",
					"Light citrus acidity, easy to drink, and still highlights the matcha.",
					BigDecimal.valueOf(74000),
					List.of("signature", "citrus", "refreshing")
			),
			new SignatureDishSeed(
					"Hojicha Matcha Fusion",
					"A hojicha and matcha blend for guests who enjoy roasted notes.",
					"Warm roasted aromas with a balanced matcha finish.",
					BigDecimal.valueOf(76000),
					List.of("signature", "hojicha", "roasted")
			),
			new SignatureDishSeed(
					"Coconut Matcha Cream",
					"A lightly creamy coconut signature suited to the dessert-drink lineup.",
					"Soft coconut body with a rich green tea character.",
					BigDecimal.valueOf(78000),
					List.of("signature", "coconut", "dessert")
			),
			new SignatureDishSeed(
					"Strawberry Matcha Velvet",
					"A fruit-forward version designed for home cards and younger audiences.",
					"Distinct strawberry and matcha layers with strong visual appeal.",
					BigDecimal.valueOf(79000),
					List.of("signature", "fruit", "layered")
			),
			new SignatureDishSeed(
					"Pure Ceremonial Matcha",
					"A pure matcha version for guests who prioritize tea quality.",
					"Clean tea flavor that suits experienced matcha drinkers.",
					BigDecimal.valueOf(82000),
					List.of("signature", "ceremonial", "premium")
			),
			new SignatureDishSeed(
					"Brown Sugar Matcha",
					"A familiar brown sugar signature built to sell quickly.",
					"Balanced sweetness, easy to approach, and a good match for pastry.",
					BigDecimal.valueOf(75000),
					List.of("signature", "brown sugar", "popular")
			),
			new SignatureDishSeed(
					"Pistachio Matcha Creme",
					"A premium pistachio signature made to anchor the featured carousel.",
					"Clear pistachio aroma with a rich texture and premium card presence.",
					BigDecimal.valueOf(84000),
					List.of("signature", "pistachio", "premium")
			),
			new SignatureDishSeed(
					"Sunrise Matcha Float",
					"A signature drink suited for morning demand and best-seller campaigns.",
					"Cold cream layers with bright matcha notes, ideal for banners.",
					BigDecimal.valueOf(77000),
					List.of("signature", "float", "morning")
			)
	);

	private final CategoryRepository categoryRepository;
	private final DishRepository dishRepository;
	private final StoreRepository storeRepository;
	private final StoreDishRepository storeDishRepository;

	public HomeSignatureDishBootstrapRunner(
			CategoryRepository categoryRepository,
			DishRepository dishRepository,
			StoreRepository storeRepository,
			StoreDishRepository storeDishRepository
	) {
		this.categoryRepository = categoryRepository;
		this.dishRepository = dishRepository;
		this.storeRepository = storeRepository;
		this.storeDishRepository = storeDishRepository;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		List<Store> stores = storeRepository.findAll().stream()
				.filter(store -> store.getId() != null)
				.sorted(Comparator.comparing(Store::getId))
				.limit(3)
				.toList();
		if (stores.isEmpty()) {
			return;
		}

		Category signatureCategory = findOrCreateSignatureCategory();
		Map<String, Dish> existingByName = dishRepository.findAll().stream()
				.filter(dish -> dish.getName() != null && !dish.getName().isBlank())
				.collect(Collectors.toMap(
						dish -> normalize(dish.getName()),
						Function.identity(),
						(left, right) -> left));

		for (int index = 0; index < SIGNATURE_DISH_SEEDS.size(); index++) {
			SignatureDishSeed seed = SIGNATURE_DISH_SEEDS.get(index);
			Dish dish = existingByName.getOrDefault(normalize(seed.name()), new Dish());
			dish.setCategory(signatureCategory);
			dish.setName(seed.name());
			dish.setDescription(seed.description());
			dish.setNote("Home signature demo " + (index + 1));
			dish.setPrice(seed.price());
			dish.setAvailable(true);
			dish.setStatus("ACTIVE");
			dish.setFranchiseRequired(false);
			dish.setFranchiseNote("Demo signature dish for home carousel");
			dish.setHighlightSummary(seed.highlightSummary());
			dish.setActive(true);
			dish.setHighlightTags(seed.highlightTags());
			if (dish.getImagePaths() == null || dish.getImagePaths().isEmpty()) {
				dish.setImagePaths(List.of());
			}
			Dish savedDish = dishRepository.save(dish);
			attachDishToStores(savedDish, stores, index);
		}
	}

	private void attachDishToStores(Dish dish, List<Store> stores, int index) {
		for (int storeIndex = 0; storeIndex < stores.size(); storeIndex++) {
			Store store = stores.get(storeIndex);
			StoreDish storeDish = storeDishRepository.findByStoreIdAndDishId(store.getId(), dish.getId())
					.orElseGet(StoreDish::new);
			storeDish.setStore(store);
			storeDish.setDish(dish);
			storeDish.setAvailable(true);
			storeDish.setQuantity(18 + index + (storeIndex * 4));
			storeDish.setPriceOverride(dish.getPrice().add(BigDecimal.valueOf(storeIndex * 2000L)));
			storeDishRepository.save(storeDish);
		}
	}

	private Category findOrCreateSignatureCategory() {
		return categoryRepository.findAll().stream()
				.filter(category -> isSignatureCategory(category.getName()))
				.sorted(Comparator.comparing(
						Category::getStore,
						Comparator.nullsFirst(Comparator.comparing(Store::getId))))
				.findFirst()
				.map(category -> ensureCategoryState(categoryRepository.save(category)))
				.orElseGet(() -> {
					Category category = new Category();
					category.setName("SIGNATURE");
					category.setDescription("System category for signature home dishes.");
					category.setStore(null);
					category.setSortOrder(1);
					category.setActive(true);
					category.setImagePaths(List.of());
					return categoryRepository.save(category);
				});
	}

	private Category ensureCategoryState(Category category) {
		category.setActive(true);
		if (category.getSortOrder() == null) {
			category.setSortOrder(1);
		}
		return category;
	}

	private boolean isSignatureCategory(String categoryName) {
		if (categoryName == null || categoryName.isBlank()) {
			return false;
		}
		String normalized = normalize(categoryName);
		return normalized.equals("SIGNATURE") || normalized.contains("SIGNATURE");
	}

	private String normalize(String value) {
		return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
	}

	private record SignatureDishSeed(
			String name,
			String description,
			String highlightSummary,
			BigDecimal price,
			List<String> highlightTags
	) {
	}
}
