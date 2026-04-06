package com.example.registrationotp.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.registrationotp.dto.AdminDashboardResponse;
import com.example.registrationotp.dto.AdminSummaryResponse;
import com.example.registrationotp.dto.AdminUserRequest;
import com.example.registrationotp.dto.AdminUserResponse;
import com.example.registrationotp.dto.AdminUserVerificationRequest;
import com.example.registrationotp.dto.CategoryRequest;
import com.example.registrationotp.dto.CategoryResponse;
import com.example.registrationotp.dto.DishRequest;
import com.example.registrationotp.dto.DishResponse;
import com.example.registrationotp.dto.EventItemRequest;
import com.example.registrationotp.dto.EventItemResponse;
import com.example.registrationotp.dto.HighlightMetadataRequest;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.NewsArticleRequest;
import com.example.registrationotp.dto.NewsArticleResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.ReviewResponse;
import com.example.registrationotp.dto.StoreRequest;
import com.example.registrationotp.dto.StoreDishRequest;
import com.example.registrationotp.dto.StoreDishResponse;
import com.example.registrationotp.dto.StoreResponse;
import com.example.registrationotp.dto.UploadImagesResponse;
import com.example.registrationotp.service.AdminService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

	private final AdminService adminService;

	public AdminController(AdminService adminService) {
		this.adminService = adminService;
	}

	@GetMapping("/dashboard")
	public ResponseEntity<AdminDashboardResponse> dashboard(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Long storeId
	) {
		return ResponseEntity.ok(adminService.dashboard(authorizationHeader, storeId));
	}

	@GetMapping("/summary")
	public ResponseEntity<AdminSummaryResponse> summary(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Long storeId
	) {
		return ResponseEntity.ok(adminService.summary(authorizationHeader, storeId));
	}

	@PostMapping(value = "/uploads/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<UploadImagesResponse> uploadImages(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam("files") List<MultipartFile> files,
			@RequestParam(value = "folder", required = false) String folder
	) {
		return ResponseEntity.ok(adminService.uploadImages(authorizationHeader, files, folder));
	}

	@GetMapping("/users")
	public ResponseEntity<PageResponse<AdminUserResponse>> listUsers(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listUsers(authorizationHeader, page, size, search));
	}

	@GetMapping("/users/{id}")
	public ResponseEntity<AdminUserResponse> getUser(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getUser(authorizationHeader, id));
	}

	@PostMapping("/users")
	public ResponseEntity<AdminUserResponse> createUser(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody AdminUserRequest request
	) {
		return ResponseEntity.ok(adminService.createUser(authorizationHeader, request));
	}

	@PutMapping("/users/{id}")
	public ResponseEntity<AdminUserResponse> updateUser(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody AdminUserRequest request
	) {
		return ResponseEntity.ok(adminService.updateUser(authorizationHeader, id, request));
	}

	@PutMapping("/users/{id}/verification")
	public ResponseEntity<AdminUserResponse> updateUserVerification(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody AdminUserVerificationRequest request
	) {
		return ResponseEntity.ok(adminService.updateUserVerification(authorizationHeader, id, request));
	}

	@DeleteMapping("/users/{id}")
	public ResponseEntity<MessageResponse> deleteUser(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteUser(authorizationHeader, id));
	}

	@GetMapping("/stores")
	public ResponseEntity<PageResponse<StoreResponse>> listStores(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listStores(authorizationHeader, page, size, search));
	}

	@GetMapping("/stores/{id}")
	public ResponseEntity<StoreResponse> getStore(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getStore(authorizationHeader, id));
	}

	@PostMapping("/stores")
	public ResponseEntity<StoreResponse> createStore(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody StoreRequest request
	) {
		return ResponseEntity.ok(adminService.createStore(authorizationHeader, request));
	}

	@PutMapping("/stores/{id}")
	public ResponseEntity<StoreResponse> updateStore(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody StoreRequest request
	) {
		return ResponseEntity.ok(adminService.updateStore(authorizationHeader, id, request));
	}

	@PutMapping("/stores/{id}/highlights")
	public ResponseEntity<StoreResponse> updateStoreHighlights(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody HighlightMetadataRequest request
	) {
		return ResponseEntity.ok(adminService.updateStoreHighlights(authorizationHeader, id, request));
	}

	@DeleteMapping("/stores/{id}")
	public ResponseEntity<MessageResponse> deleteStore(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteStore(authorizationHeader, id));
	}

	@GetMapping("/events")
	public ResponseEntity<PageResponse<EventItemResponse>> listEvents(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listEvents(authorizationHeader, page, size, search));
	}

	@GetMapping("/events/{id}")
	public ResponseEntity<EventItemResponse> getEvent(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getEvent(authorizationHeader, id));
	}

	@PostMapping("/events")
	public ResponseEntity<EventItemResponse> createEvent(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody EventItemRequest request
	) {
		return ResponseEntity.ok(adminService.createEvent(authorizationHeader, request));
	}

	@PutMapping("/events/{id}")
	public ResponseEntity<EventItemResponse> updateEvent(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody EventItemRequest request
	) {
		return ResponseEntity.ok(adminService.updateEvent(authorizationHeader, id, request));
	}

	@PutMapping("/events/{id}/highlights")
	public ResponseEntity<EventItemResponse> updateEventHighlights(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody HighlightMetadataRequest request
	) {
		return ResponseEntity.ok(adminService.updateEventHighlights(authorizationHeader, id, request));
	}

	@DeleteMapping("/events/{id}")
	public ResponseEntity<MessageResponse> deleteEvent(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteEvent(authorizationHeader, id));
	}

	@GetMapping("/categories")
	public ResponseEntity<PageResponse<CategoryResponse>> listCategories(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listCategories(authorizationHeader, page, size, search));
	}

	@GetMapping("/categories/{id}")
	public ResponseEntity<CategoryResponse> getCategory(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getCategory(authorizationHeader, id));
	}

	@PostMapping("/categories")
	public ResponseEntity<CategoryResponse> createCategory(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody CategoryRequest request
	) {
		return ResponseEntity.ok(adminService.createCategory(authorizationHeader, request));
	}

	@PutMapping("/categories/{id}")
	public ResponseEntity<CategoryResponse> updateCategory(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody CategoryRequest request
	) {
		return ResponseEntity.ok(adminService.updateCategory(authorizationHeader, id, request));
	}

	@DeleteMapping("/categories/{id}")
	public ResponseEntity<MessageResponse> deleteCategory(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteCategory(authorizationHeader, id));
	}

	@GetMapping("/dishes")
	public ResponseEntity<PageResponse<DishResponse>> listDishes(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listDishes(authorizationHeader, page, size, search));
	}

	@GetMapping("/dishes/{id}")
	public ResponseEntity<DishResponse> getDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getDish(authorizationHeader, id));
	}

	@PostMapping("/dishes")
	public ResponseEntity<DishResponse> createDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody DishRequest request
	) {
		return ResponseEntity.ok(adminService.createDish(authorizationHeader, request));
	}

	@PutMapping("/dishes/{id}")
	public ResponseEntity<DishResponse> updateDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody DishRequest request
	) {
		return ResponseEntity.ok(adminService.updateDish(authorizationHeader, id, request));
	}

	@PutMapping("/dishes/{id}/highlights")
	public ResponseEntity<DishResponse> updateDishHighlights(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody HighlightMetadataRequest request
	) {
		return ResponseEntity.ok(adminService.updateDishHighlights(authorizationHeader, id, request));
	}

	@DeleteMapping("/dishes/{id}")
	public ResponseEntity<MessageResponse> deleteDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteDish(authorizationHeader, id));
	}

	@GetMapping("/reviews")
	public ResponseEntity<PageResponse<ReviewResponse>> listReviews(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listReviews(authorizationHeader, page, size, search));
	}

	@GetMapping("/reviews/{id}")
	public ResponseEntity<ReviewResponse> getReview(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getReview(authorizationHeader, id));
	}

	@DeleteMapping("/reviews/{id}")
	public ResponseEntity<MessageResponse> deleteReview(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteReview(authorizationHeader, id));
	}

	@GetMapping("/news")
	public ResponseEntity<PageResponse<NewsArticleResponse>> listNews(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listNews(authorizationHeader, page, size, search));
	}

	@GetMapping("/news/{id}")
	public ResponseEntity<NewsArticleResponse> getNews(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getNews(authorizationHeader, id));
	}

	@PostMapping("/news")
	public ResponseEntity<NewsArticleResponse> createNews(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody NewsArticleRequest request
	) {
		return ResponseEntity.ok(adminService.createNews(authorizationHeader, request));
	}

	@PutMapping("/news/{id}")
	public ResponseEntity<NewsArticleResponse> updateNews(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody NewsArticleRequest request
	) {
		return ResponseEntity.ok(adminService.updateNews(authorizationHeader, id, request));
	}

	@DeleteMapping("/news/{id}")
	public ResponseEntity<MessageResponse> deleteNews(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteNews(authorizationHeader, id));
	}

	@GetMapping("/store-dishes")
	public ResponseEntity<PageResponse<StoreDishResponse>> listStoreDishes(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(adminService.listStoreDishes(authorizationHeader, page, size, search));
	}

	@GetMapping("/store-dishes/{id}")
	public ResponseEntity<StoreDishResponse> getStoreDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.getStoreDish(authorizationHeader, id));
	}

	@PostMapping("/store-dishes")
	public ResponseEntity<StoreDishResponse> createStoreDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody StoreDishRequest request
	) {
		return ResponseEntity.ok(adminService.createStoreDish(authorizationHeader, request));
	}

	@PutMapping("/store-dishes/{id}")
	public ResponseEntity<StoreDishResponse> updateStoreDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody StoreDishRequest request
	) {
		return ResponseEntity.ok(adminService.updateStoreDish(authorizationHeader, id, request));
	}

	@DeleteMapping("/store-dishes/{id}")
	public ResponseEntity<MessageResponse> deleteStoreDish(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(adminService.deleteStoreDish(authorizationHeader, id));
	}
}
