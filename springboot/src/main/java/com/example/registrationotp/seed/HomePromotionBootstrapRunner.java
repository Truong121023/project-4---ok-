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

		Instant now = Instant.now();
		List<Promotion> promotions = new ArrayList<>();
		promotions.add(upsertPromotion(
				"KAMATCHASHIP",
				"Easy shipping voucher",
				"Use this code on any delivery order to reduce the shipping fee.",
				PromotionScope.SHIP,
				BigDecimal.valueOf(20),
				null,
				BigDecimal.valueOf(20000),
				now.minusSeconds(86400L),
				now.plusSeconds(86400L * 90)
		));
		promotions.add(upsertPromotion(
				"WELCOME15",
				"Weekly welcome discount",
				"Save 15% on the full order for this week's welcome campaign.",
				PromotionScope.ORDER,
				BigDecimal.valueOf(15),
				BigDecimal.valueOf(99000),
				BigDecimal.valueOf(35000),
				now.minusSeconds(86400L * 7),
				now.plusSeconds(86400L * 45)
		));
		promotions.add(upsertPromotion(
				"PUREMATCHA",
				"All drinks spotlight",
				"Instant savings across all drinks in the cart.",
				PromotionScope.DISH,
				BigDecimal.valueOf(12),
				BigDecimal.valueOf(89000),
				BigDecimal.valueOf(18000),
				now.minusSeconds(86400L * 5),
				now.plusSeconds(86400L * 35)
		));
		promotions.add(upsertPromotion(
				"SHIPFREE25",
				"Peak-hour shipping support",
				"Reduced shipping fees for fast-delivery orders with a complete address.",
				PromotionScope.SHIP,
				BigDecimal.valueOf(25),
				BigDecimal.valueOf(150000),
				BigDecimal.valueOf(25000),
				now.minusSeconds(86400L * 3),
				now.plusSeconds(86400L * 30)
		));
		promotions.add(upsertPromotion(
				"GREENDAY18",
				"Green day order deal",
				"Save 18% on the full order during the green day campaign.",
				PromotionScope.ORDER,
				BigDecimal.valueOf(20),
				BigDecimal.valueOf(200000),
				BigDecimal.valueOf(50000),
				now.minusSeconds(86400L * 2),
				now.plusSeconds(86400L * 40)
		));
		promotions.add(upsertPromotion(
				"AFTERNOON25",
				"Afternoon delivery deal",
				"Instant savings for fast-delivery orders placed during the afternoon window.",
				PromotionScope.DISH,
				BigDecimal.valueOf(25),
				BigDecimal.valueOf(140000),
				BigDecimal.valueOf(25000),
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
			BigDecimal discountValue,
			BigDecimal minOrderAmount,
			BigDecimal maxDiscountAmount,
			Instant startsAt,
			Instant endsAt
	) {
		Promotion promotion = promotionRepository.findByCodeIgnoreCase(code)
				.orElseGet(Promotion::new);
		promotion.setCode(code);
		promotion.setName(name);
		promotion.setDescription(description);
		promotion.setScope(scope);
		promotion.setDiscountType(PromotionDiscountType.PERCENT);
		promotion.setDiscountTarget(scope.discountTarget());
		promotion.setDiscountValue(discountValue);
		promotion.setMinOrderAmount(minOrderAmount);
		promotion.setMaxDiscountAmount(maxDiscountAmount);
		promotion.setCreditCost(0);
		promotion.setMinStoreBillAmount(null);
		promotion.setMinCrossStoreBillAmount(null);
		promotion.setApplicableDishIds(List.of());
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
