package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

import org.springframework.stereotype.Service;

import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.StoreDish;

@Service
public class CatalogAvailabilityService {

	private final ZoneId zoneId = ZoneId.systemDefault();

	public boolean isStoreOpen(Store store) {
		return isStoreOpenAt(store, LocalTime.now(zoneId));
	}

	public boolean isStoreOpenAt(Store store, Instant instant) {
		if (instant == null) {
			return isStoreOpen(store);
		}
		return isStoreOpenAt(store, instant.atZone(zoneId).toLocalTime());
	}

	public boolean isStoreOpenAt(Store store, LocalTime now) {
		if (store == null || !store.isActive()) {
			return false;
		}
		if (store.getOpenTime() == null || store.getCloseTime() == null) {
			return true;
		}

		LocalTime openTime = store.getOpenTime();
		LocalTime closeTime = store.getCloseTime();
		if (openTime.equals(closeTime)) {
			return true;
		}
		if (openTime.isBefore(closeTime)) {
			return !now.isBefore(openTime) && !now.isAfter(closeTime);
		}
		return !now.isBefore(openTime) || !now.isAfter(closeTime);
	}

	public boolean isStoreDisabled(Store store) {
		return resolveStoreDisabledReason(store) != null;
	}

	public String resolveStoreDisabledReason(Store store) {
		return resolveStoreDisabledReasonAt(store, Instant.now());
	}

	public String resolveStoreDisabledReasonAt(Store store, Instant instant) {
		String operationalReason = resolveStoreOperationalDisabledReason(store);
		if (operationalReason != null) {
			return operationalReason;
		}
		if (!isStoreOpenAt(store, instant)) {
			return "OUTSIDE_OPEN_HOURS";
		}
		return null;
	}

	public String resolveStoreOperationalDisabledReason(Store store) {
		if (store == null) {
			return "STORE_NOT_FOUND";
		}
		if (!store.isActive()) {
			return "STORE_INACTIVE";
		}
		return null;
	}

	public boolean isStoreDishDisabled(StoreDish storeDish) {
		return resolveStoreDishDisabledReason(storeDish) != null;
	}

	public String resolveStoreDishDisabledReason(StoreDish storeDish) {
		return resolveStoreDishDisabledReasonAt(storeDish, Instant.now());
	}

	public String resolveStoreDishDisabledReasonAt(StoreDish storeDish, Instant instant) {
		String staticReason = resolveStoreDishStaticDisabledReason(storeDish);
		if (staticReason != null) {
			return staticReason;
		}
		if (!isStoreOpenAt(storeDish.getStore(), instant)) {
			return "OUTSIDE_OPEN_HOURS";
		}
		return null;
	}

	public String resolveStoreDishStaticDisabledReason(StoreDish storeDish) {
		if (storeDish == null) {
			return "STORE_DISH_NOT_FOUND";
		}
		String storeReason = resolveStoreOperationalDisabledReason(storeDish.getStore());
		if (storeReason != null) {
			return storeReason;
		}
		if (!storeDish.getDish().isActive()) {
			return "DISH_INACTIVE";
		}
		if (!storeDish.getDish().getCategory().isActive()) {
			return "CATEGORY_INACTIVE";
		}
		if (!storeDish.getDish().isAvailable()) {
			return "DISH_UNAVAILABLE";
		}
		if (!storeDish.isAvailable()) {
			return "STORE_DISH_UNAVAILABLE";
		}
		if (storeDish.getQuantity() == null || storeDish.getQuantity() <= 0) {
			return "OUT_OF_STOCK";
		}
		return null;
	}

	public BigDecimal resolveEffectivePrice(StoreDish storeDish) {
		return storeDish.getPriceOverride() != null ? storeDish.getPriceOverride() : storeDish.getDish().getPrice();
	}

	public boolean isEventDisabled(EventItem eventItem) {
		return resolveEventDisabledReason(eventItem) != null;
	}

	public String resolveEventDisabledReason(EventItem eventItem) {
		if (eventItem == null) {
			return "EVENT_NOT_FOUND";
		}
		if (!eventItem.isActive()) {
			return "EVENT_INACTIVE";
		}
		if (eventItem.getEndsAt() != null && eventItem.getEndsAt().isBefore(Instant.now())) {
			return "EVENT_ENDED";
		}
		if (eventItem.getCapacity() != null && eventItem.getBookedCount() != null
				&& eventItem.getBookedCount() >= eventItem.getCapacity()) {
			return "EVENT_FULL";
		}
		String storeReason = resolveStoreDisabledReason(eventItem.getStore());
		if (storeReason != null) {
			return storeReason;
		}
		return null;
	}

	public Integer resolveRemainingSlots(EventItem eventItem) {
		if (eventItem.getCapacity() == null) {
			return null;
		}
		int booked = eventItem.getBookedCount() == null ? 0 : eventItem.getBookedCount();
		return Math.max(eventItem.getCapacity() - booked, 0);
	}
}
