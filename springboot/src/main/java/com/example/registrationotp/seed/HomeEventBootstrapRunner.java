package com.example.registrationotp.seed;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.support.EventSlugNormalizer;

@Component
@ConditionalOnProperty(
		prefix = "app.demo",
		name = "bootstrap-home-events",
		havingValue = "true",
		matchIfMissing = true
)
public class HomeEventBootstrapRunner implements ApplicationRunner {

	private static final DateTimeFormatter SCHEDULE_FORMATTER =
			DateTimeFormatter.ofPattern("HH:mm - dd/MM", Locale.ENGLISH)
					.withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

	private static final List<EventSeed> EVENT_SEEDS = List.of(
			new EventSeed(
					"Matcha Tasting Flight",
					"A small tasting session where guests can try three signature matcha profiles at the store.",
					"Try three standout matcha profiles and receive suggestions that match your taste.",
					List.of("tasting", "matcha", "signature")
			),
			new EventSeed(
					"Tea Pairing Night",
					"A workshop that pairs matcha with dessert to elevate the in-store experience.",
					"An evening matcha-and-dessert pairing session with limited seating.",
					List.of("pairing", "dessert", "night")
			),
			new EventSeed(
					"Latte Art Mini Class",
					"A mini Kamatcha-style latte art class for new guests.",
					"Practice pouring foam and take photos in-store during a short session.",
					List.of("latte art", "foam", "beginner")
			),
			new EventSeed(
					"Signature Menu Preview",
					"A preview of signature best sellers and new drinks of the month.",
					"Get an early look at trending signature drinks and receive an event offer code.",
					List.of("preview", "best seller", "menu")
			),
			new EventSeed(
					"Morning Matcha Ritual",
					"A morning session for guests who want to start the day with a matcha ritual.",
					"A gentle early-morning session that works well for check-ins and takeaway orders.",
					List.of("morning", "ritual", "wellness")
			),
			new EventSeed(
					"Cold Whisk Workshop",
					"A workshop on cold-whisked matcha and modern layered drink building.",
					"Learn cold whisking, layering, and take the recipe home.",
					List.of("cold whisk", "workshop", "refreshing")
			),
			new EventSeed(
					"Community Brew Session",
					"A small in-store community gathering for matcha fans.",
					"Hear tasting notes about matcha and sample signature drinks on-site.",
					List.of("community", "brew", "sharing")
			),
			new EventSeed(
					"Weekend Matcha Club",
					"A weekend meet-up for matcha lovers and casual check-ins with friends.",
					"A weekend space to try new drinks and discover small perks.",
					List.of("weekend", "club", "meetup")
			)
	);

	private final EventItemRepository eventItemRepository;
	private final StoreRepository storeRepository;
	private final DishRepository dishRepository;

	public HomeEventBootstrapRunner(
			EventItemRepository eventItemRepository,
			StoreRepository storeRepository,
			DishRepository dishRepository
	) {
		this.eventItemRepository = eventItemRepository;
		this.storeRepository = storeRepository;
		this.dishRepository = dishRepository;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		List<Store> stores = storeRepository.findAll().stream()
				.filter(store -> store.getId() != null)
				.sorted(Comparator.comparing(Store::getId))
				.limit(3)
				.toList();
		List<Dish> signatureDishes = dishRepository.findAll().stream()
				.filter(this::isSignatureDish)
				.filter(dish -> dish.getId() != null)
				.sorted(Comparator.comparing(Dish::getId))
				.toList();
		if (stores.isEmpty() || signatureDishes.isEmpty()) {
			return;
		}

		var existingBySlug = eventItemRepository.findAll().stream()
				.filter(event -> event.getSlug() != null && !event.getSlug().isBlank())
				.collect(Collectors.toMap(
						event -> event.getSlug().trim().toLowerCase(Locale.ROOT),
						Function.identity(),
						(left, right) -> left));

		Instant now = Instant.now();
		for (int index = 0; index < EVENT_SEEDS.size(); index++) {
			EventSeed seed = EVENT_SEEDS.get(index);
			Store store = stores.get(index % stores.size());
			Dish featuredDish = signatureDishes.get(index % signatureDishes.size());
			String baseSlug = EventSlugNormalizer.normalize(seed.name() + " " + store.getName());
			String slug = baseSlug == null ? "home-event-" + index : baseSlug;
			EventItem event = existingBySlug.getOrDefault(slug.toLowerCase(Locale.ROOT), new EventItem());

			Instant startsAt = now.plusSeconds(86400L * (index + 2L)).plusSeconds((index % 3) * 5400L);
			Instant endsAt = startsAt.plusSeconds(7200L);

			event.setSlug(slug);
			event.setName(seed.name());
			event.setDescription(seed.description());
			event.setHighlightSummary(seed.highlightSummary());
			event.setStore(store);
			event.setLocation(store.getAddress());
			event.setScheduleText(SCHEDULE_FORMATTER.format(startsAt));
			event.setStartsAt(startsAt);
			event.setEndsAt(endsAt);
			event.setCapacity(26 + (index * 3));
			event.setBookedCount(4 + (index % 9));
			event.setFeaturedDishIds(List.of(featuredDish.getId()));
			event.setHighlightTags(seed.highlightTags());
			if (event.getImagePaths() == null || event.getImagePaths().isEmpty()) {
				event.setImagePaths(List.of());
			}
			event.setActive(true);

			EventItem savedEvent = eventItemRepository.save(event);
			existingBySlug.put(savedEvent.getSlug().trim().toLowerCase(Locale.ROOT), savedEvent);
		}
	}

	private boolean isSignatureDish(Dish dish) {
		if (dish == null || dish.getCategory() == null || dish.getCategory().getName() == null) {
			return false;
		}
		String normalized = dish.getCategory().getName().trim().toUpperCase(Locale.ROOT);
		return normalized.equals("SIGNATURE") || normalized.contains("SIGNATURE");
	}

	private record EventSeed(
			String name,
			String description,
			String highlightSummary,
			List<String> highlightTags
	) {
	}
}
