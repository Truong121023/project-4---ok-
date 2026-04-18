package com.example.registrationotp.seed;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.PromotionDiscountTarget;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.StoreRepository;

@Component
@ConditionalOnProperty(
		prefix = "app.demo",
		name = "bootstrap-home-promotions",
		havingValue = "true",
		matchIfMissing = true
)
public class HomePromotionBootstrapRunner implements ApplicationRunner {

	private final PromotionRepository promotionRepository;
	private final DishRepository dishRepository;
	private final StoreRepository storeRepository;

	public HomePromotionBootstrapRunner(
			PromotionRepository promotionRepository,
			DishRepository dishRepository,
			StoreRepository storeRepository
	) {
		this.promotionRepository = promotionRepository;
		this.dishRepository = dishRepository;
		this.storeRepository = storeRepository;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		List<Store> stores = storeRepository.findAll().stream()
				.filter(store -> store.getId() != null)
				.sorted(Comparator.comparing(Store::getId))
				.toList();
		List<Dish> signatureDishes = dishRepository.findAll().stream()
				.filter(this::isSignatureDish)
				.filter(dish -> dish.getId() != null)
				.sorted(Comparator.comparing(Dish::getId))
				.toList();
		if (stores.isEmpty() || signatureDishes.isEmpty()) {
			return;
		}

		Store primaryStore = stores.get(0);
		Store secondaryStore = stores.size() > 1 ? stores.get(1) : primaryStore;
		Dish firstSignatureDish = signatureDishes.get(0);
		Dish secondSignatureDish = signatureDishes.size() > 1
				? signatureDishes.get(1)
				: firstSignatureDish;

		Instant now = Instant.now();
		List<Promotion> promotions = new ArrayList<>();
		promotions.add(upsertPromotion(
				"KAMATCHASHIP",
				"Easy shipping voucher",
				"Use this code on any delivery order to reduce the shipping fee. No credits are required.",
				PromotionScope.ORDER,
				PromotionDiscountType.FIXED_AMOUNT,
				PromotionDiscountTarget.SHIPPING,
				BigDecimal.valueOf(20000),
				null,
				BigDecimal.valueOf(20000),
				0,
				List.of(),
				now.minusSeconds(86400L),
				now.plusSeconds(86400L * 90)
		));
		promotions.add(upsertPromotion(
				"WELCOME15",
				"Weekly welcome discount",
				"Save 15% on eligible signature items for your first orders this week.",
				PromotionScope.ORDER,
				PromotionDiscountType.PERCENT,
				PromotionDiscountTarget.ITEMS,
				BigDecimal.valueOf(15),
				BigDecimal.valueOf(99000),
				BigDecimal.valueOf(35000),
				120,
				List.of(),
				now.minusSeconds(86400L * 7),
				now.plusSeconds(86400L * 45)
		));
		promotions.add(upsertPromotion(
				"PUREMATCHA",
				"Best-selling signature deal",
				"Instant savings on a best-selling signature drink so users can try a highlighted item.",
				PromotionScope.DISH,
				PromotionDiscountType.FIXED_AMOUNT,
				PromotionDiscountTarget.ITEMS,
				BigDecimal.valueOf(18000),
				BigDecimal.valueOf(89000),
				BigDecimal.valueOf(18000),
				90,
				List.of(firstSignatureDish.getId()),
				now.minusSeconds(86400L * 5),
				now.plusSeconds(86400L * 35)
		));
		promotions.add(upsertPromotion(
				"SHIPFREE25",
				"Peak-hour shipping support",
				"Reduced shipping fees for fast-delivery orders with a complete address.",
				PromotionScope.ORDER,
				PromotionDiscountType.FIXED_AMOUNT,
				PromotionDiscountTarget.SHIPPING,
				BigDecimal.valueOf(25000),
				BigDecimal.valueOf(150000),
				BigDecimal.valueOf(25000),
				160,
				List.of(),
				now.minusSeconds(86400L * 3),
				now.plusSeconds(86400L * 30)
		));
		promotions.add(upsertPromotion(
				"GREENDAY20",
				"Green day signature deal",
				"Save 20% on the most frequently ordered signature items.",
				PromotionScope.DISH,
				PromotionDiscountType.PERCENT,
				PromotionDiscountTarget.BOTH,
				BigDecimal.valueOf(20),
				BigDecimal.valueOf(200000),
				BigDecimal.valueOf(50000),
				180,
				List.of(firstSignatureDish.getId(), secondSignatureDish.getId()),
				now.minusSeconds(86400L * 2),
				now.plusSeconds(86400L * 40)
		));
		promotions.add(upsertPromotion(
				"AFTERNOON25",
				"Afternoon delivery deal",
				"Instant savings for fast-delivery orders placed during the afternoon window.",
				PromotionScope.ORDER,
				PromotionDiscountType.FIXED_AMOUNT,
				PromotionDiscountTarget.BOTH,
				BigDecimal.valueOf(25000),
				BigDecimal.valueOf(140000),
				BigDecimal.valueOf(25000),
				140,
				List.of(),
				now.minusSeconds(86400L),
				now.plusSeconds(86400L * 28)
		));

		promotionRepository.saveAll(promotions);
	}

	private Promotion upsertPromotion(
			String code,
			String name,
			String description,
			PromotionScope scope,
			PromotionDiscountType discountType,
			PromotionDiscountTarget discountTarget,
			BigDecimal discountValue,
			BigDecimal minOrderAmount,
			BigDecimal maxDiscountAmount,
			Integer creditCost,
			List<Long> applicableDishIds,
			Instant startsAt,
			Instant endsAt
	) {
		Promotion promotion = promotionRepository.findByCodeIgnoreCase(code)
				.orElseGet(Promotion::new);
		promotion.setCode(code);
		promotion.setName(name);
		promotion.setDescription(description);
		promotion.setScope(scope);
		promotion.setDiscountType(discountType);
		promotion.setDiscountTarget(discountTarget);
		promotion.setDiscountValue(discountValue);
		promotion.setMinOrderAmount(minOrderAmount);
		promotion.setMaxDiscountAmount(maxDiscountAmount);
		promotion.setCreditCost(creditCost);
		promotion.setMinStoreBillAmount(null);
		promotion.setMinCrossStoreBillAmount(null);
		promotion.setApplicableDishIds(applicableDishIds);
		promotion.setEligibleStoreIds(List.of());
		promotion.setEligibleUserLevelIds(List.of());
		promotion.setUsageLimit(500);
		promotion.setUsedCount(promotion.getUsedCount() == null ? 0 : promotion.getUsedCount());
		promotion.setStartsAt(startsAt);
		promotion.setEndsAt(endsAt);
		promotion.setActive(true);
		return promotion;
	}

	private boolean isSignatureDish(Dish dish) {
		if (dish == null || dish.getCategory() == null || dish.getCategory().getName() == null) {
			return false;
		}
		String normalized = dish.getCategory().getName().trim().toUpperCase();
		return normalized.equals("SIGNATURE") || normalized.contains("SIGNATURE");
	}
}
