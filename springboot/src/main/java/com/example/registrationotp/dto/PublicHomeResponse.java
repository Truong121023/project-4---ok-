package com.example.registrationotp.dto;

import java.util.List;

public record PublicHomeResponse(
		String brand,
		List<PublicStoreCardResponse> featuredStores,
		List<PublicDishCardResponse> featuredDishes,
		List<PublicEventCardResponse> upcomingEvents,
		List<PublicStoreLocationResponse> storeLocations,
		List<PublicNewsCardResponse> latestNews
) {
}
