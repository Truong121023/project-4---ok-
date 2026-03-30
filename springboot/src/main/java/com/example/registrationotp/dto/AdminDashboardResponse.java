package com.example.registrationotp.dto;

import java.util.List;

public record AdminDashboardResponse(
		List<AdminUserResponse> users,
		List<StoreResponse> stores,
		List<EventItemResponse> events,
		List<CategoryResponse> categories,
		List<DishResponse> dishes,
		List<StoreDishResponse> storeDishes,
		List<OrderResponse> orders,
		List<ReviewResponse> reviews,
		List<CustomerFeedbackResponse> feedbacks,
		List<PromotionResponse> promotions,
		List<NewsArticleResponse> news
) {
}
