package com.example.registrationotp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.CartStatus;
import com.example.registrationotp.model.CustomerFeedback;
import com.example.registrationotp.model.DeliveryType;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EmailOtp;
import com.example.registrationotp.model.EmployeeAttendance;
import com.example.registrationotp.model.EmployeeWorkSchedule;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.FeedbackCategory;
import com.example.registrationotp.model.Favorite;
import com.example.registrationotp.model.FavoriteTargetType;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.OrderStatus;
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
import com.example.registrationotp.model.UserLevelDefinition;
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
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.UserRepository;
import com.example.registrationotp.repository.UserDeliveryAddressRepository;
import com.example.registrationotp.repository.UserLevelDefinitionRepository;
import com.example.registrationotp.repository.UserNotificationRepository;
import com.example.registrationotp.repository.UserSessionRepository;
import com.example.registrationotp.service.EmailSender;
import com.example.registrationotp.service.GoogleIdTokenVerifierService;
import com.example.registrationotp.service.PayOsClient;
import com.example.registrationotp.support.EventSlugNormalizer;
import com.example.registrationotp.support.StoreSlugNormalizer;

@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:testdb;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
		"spring.datasource.driver-class-name=org.h2.Driver",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop",
		"spring.jpa.show-sql=false",
		"spring.mail.host=localhost",
		"spring.mail.port=2525",
		"spring.mail.username=test@example.com",
		"spring.mail.password=test-password",
		"app.mail.from=no-reply@example.com",
		"app.otp.exp-minutes=5",
		"app.session.exp-days=7",
		"app.upload.dir=target/test-uploads"
})
@AutoConfigureMockMvc
class RegistrationOtpApplicationTests {

	private static final Path TEST_UPLOAD_DIR = Path.of("target", "test-uploads").toAbsolutePath();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private EmailOtpRepository emailOtpRepository;

	@Autowired
	private EmployeeAttendanceRepository employeeAttendanceRepository;

	@Autowired
	private EmployeeWorkScheduleRepository employeeWorkScheduleRepository;

	@Autowired
	private UserSessionRepository userSessionRepository;

	@Autowired
	private UserDeliveryAddressRepository userDeliveryAddressRepository;

	@Autowired
	private UserNotificationRepository userNotificationRepository;

	@Autowired
	private StoreRepository storeRepository;

	@Autowired
	private EventItemRepository eventItemRepository;

	@Autowired
	private CategoryRepository categoryRepository;

	@Autowired
	private DishRepository dishRepository;

	@Autowired
	private ReviewRepository reviewRepository;

	@Autowired
	private FavoriteRepository favoriteRepository;

	@Autowired
	private CustomerFeedbackRepository customerFeedbackRepository;

	@Autowired
	private NewsArticleRepository newsArticleRepository;

	@Autowired
	private StoreDishRepository storeDishRepository;

	@Autowired
	private CartRepository cartRepository;

	@Autowired
	private CartItemRepository cartItemRepository;

	@Autowired
	private OrderRepository orderRepository;

	@Autowired
	private PromotionRepository promotionRepository;

	@Autowired
	private OrderItemRepository orderItemRepository;

	@Autowired
	private UserLevelDefinitionRepository userLevelDefinitionRepository;

	@MockitoBean
	private EmailSender emailSender;

	@MockitoBean
	private PayOsClient payOsClient;

	@MockitoBean
	private GoogleIdTokenVerifierService googleIdTokenVerifierService;

	@BeforeEach
	void setUp() {
		cleanUploadDirectory();
		customerFeedbackRepository.deleteAll();
		employeeAttendanceRepository.deleteAll();
		employeeWorkScheduleRepository.deleteAll();
		orderItemRepository.deleteAll();
		orderRepository.deleteAll();
		promotionRepository.deleteAll();
		userLevelDefinitionRepository.deleteAll();
		cartItemRepository.deleteAll();
		cartRepository.deleteAll();
		favoriteRepository.deleteAll();
		reviewRepository.deleteAll();
		newsArticleRepository.deleteAll();
		userDeliveryAddressRepository.deleteAll();
		userNotificationRepository.deleteAll();
		storeDishRepository.deleteAll();
		dishRepository.deleteAll();
		categoryRepository.deleteAll();
		eventItemRepository.deleteAll();
		userSessionRepository.deleteAll();
		emailOtpRepository.deleteAll();
		userRepository.deleteAll();
		storeRepository.deleteAll();
		doNothing().when(emailSender).sendOtpEmail(any(), any(), any(), any());
		when(payOsClient.createPaymentLink(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentLinkData(
				"plink-default",
				"https://pay.payos.vn/web/default",
				"qr-default",
				"PENDING",
				1L,
				1000
		));
		when(payOsClient.getPaymentStatus(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentStatusResponse(
				"plink-default",
				1L,
				1000,
				0,
				1000,
				"PENDING"
		));
	}

	@Test
	void contextLoads() {
	}

	@Test
	void registerVerifyLoginAndLogoutFlowWorks() throws Exception {
		mockMvc.perform(post("/api/auth/register")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Alice Nguyen",
								  "email": "ALICE@example.com",
								  "password": "Password123"
								}
								"""))
				.andExpect(status().isAccepted())
				.andExpect(jsonPath("$.email").value("alice@example.com"))
				.andExpect(jsonPath("$.userId").isNumber())
				.andExpect(jsonPath("$.role").value("USER"))
				.andExpect(jsonPath("$.otpExpiresAt").exists());

		User user = userRepository.findByEmail("alice@example.com").orElseThrow();
		assertThat(user.isEnabled()).isFalse();

		EmailOtp emailOtp = emailOtpRepository.findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
				.orElseThrow();

		mockMvc.perform(post("/api/auth/verify-otp")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "email": "alice@example.com",
								  "otp": "%s"
								}
								""".formatted(emailOtp.getOtpCode())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.user.email").value("alice@example.com"))
				.andExpect(jsonPath("$.user.role").value("USER"));

		MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "email": "alice@example.com",
								  "password": "Password123"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.accessToken").isString())
				.andExpect(jsonPath("$.user.role").value("USER"))
				.andReturn();

		Map<String, Object> loginBody = objectMapper.readValue(
				loginResult.getResponse().getContentAsByteArray(),
				new TypeReference<>() {
				}
		);
		String accessToken = loginBody.get("accessToken").toString();

		mockMvc.perform(get("/api/auth/me")
						.header("Authorization", "Bearer " + accessToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.email").value("alice@example.com"))
				.andExpect(jsonPath("$.user.role").value("USER"));

		mockMvc.perform(post("/api/auth/logout")
						.header("Authorization", "Bearer " + accessToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Logout successful"));

		assertThat(userSessionRepository.findByToken(accessToken)).isEmpty();
	}

	@Test
	void googleLoginWorksForExistingLinkedUser() throws Exception {
		User user = saveUser("Google User", "google-linked@example.com", Role.USER, true);
		String previousToken = createSession(user);
		when(googleIdTokenVerifierService.verify("google-id-token"))
				.thenReturn(new GoogleIdTokenVerifierService.GoogleAccount(
						"google-linked@example.com",
						"Google User"
				));

		MvcResult result = mockMvc.perform(post("/api/auth/google/login")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "idToken": "google-id-token"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Google login successful"))
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.accessToken").isString())
				.andExpect(jsonPath("$.user.email").value("google-linked@example.com"))
				.andExpect(jsonPath("$.user.role").value("USER"))
				.andExpect(jsonPath("$.user.profileCompleted").value(true))
				.andReturn();

		Map<String, Object> body = objectMapper.readValue(
				result.getResponse().getContentAsByteArray(),
				new TypeReference<>() {
				}
		);
		String newToken = body.get("accessToken").toString();
		assertThat(newToken).isNotBlank();
		assertThat(newToken).isNotEqualTo(previousToken);
		assertThat(userSessionRepository.findByToken(previousToken)).isEmpty();
		assertThat(userSessionRepository.findByToken(newToken)).isPresent();
	}

	@Test
	void googleLoginCreatesNewUserAndRequiresProfileCompletion() throws Exception {
		when(googleIdTokenVerifierService.verify("google-new-user-token"))
				.thenReturn(new GoogleIdTokenVerifierService.GoogleAccount(
						"google-new@example.com",
						"Google New User"
				));

		MvcResult loginResult = mockMvc.perform(post("/api/auth/google/login")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "idToken": "google-new-user-token"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Google login successful. Please complete your profile."))
				.andExpect(jsonPath("$.user.email").value("google-new@example.com"))
				.andExpect(jsonPath("$.user.fullName").value("Google New User"))
				.andExpect(jsonPath("$.user.verified").value(true))
				.andExpect(jsonPath("$.user.profileCompleted").value(false))
				.andReturn();

		Map<String, Object> loginBody = objectMapper.readValue(
				loginResult.getResponse().getContentAsByteArray(),
				new TypeReference<>() {
				}
		);
		String accessToken = loginBody.get("accessToken").toString();

		User createdUser = userRepository.findByEmail("google-new@example.com").orElseThrow();
		assertThat(createdUser.isEnabled()).isTrue();
		assertThat(createdUser.getVerifiedAt()).isNotNull();
		assertThat(createdUser.isProfileCompleted()).isFalse();

		mockMvc.perform(get("/api/auth/me")
						.header("Authorization", "Bearer " + accessToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.email").value("google-new@example.com"))
				.andExpect(jsonPath("$.user.profileCompleted").value(false));

		mockMvc.perform(post("/api/auth/google/complete-profile")
						.header("Authorization", "Bearer " + accessToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Nguyen Google",
								  "password": "Password123"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Google profile completed successfully"))
				.andExpect(jsonPath("$.user.email").value("google-new@example.com"))
				.andExpect(jsonPath("$.user.fullName").value("Nguyen Google"))
				.andExpect(jsonPath("$.user.profileCompleted").value(true));

		User completedUser = userRepository.findByEmail("google-new@example.com").orElseThrow();
		assertThat(completedUser.isProfileCompleted()).isTrue();

		mockMvc.perform(post("/api/auth/login")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "email": "google-new@example.com",
								  "password": "Password123"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Login successful"))
				.andExpect(jsonPath("$.user.profileCompleted").value(true));
	}

	@Test
	void verifyOtpReturnsBadRequestWhenOtpIsWrong() throws Exception {
		mockMvc.perform(post("/api/auth/register")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Bob Tran",
								  "email": "bob@example.com",
								  "password": "Password123"
								}
								"""))
				.andExpect(status().isAccepted());

		mockMvc.perform(post("/api/auth/verify-otp")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "email": "bob@example.com",
								  "otp": "000000"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("OTP is invalid"));
	}

	@Test
	void loginFailsWhenEmailIsNotVerified() throws Exception {
		mockMvc.perform(post("/api/auth/register")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Chris Le",
								  "email": "chris@example.com",
								  "password": "Password123"
								}
								"""))
				.andExpect(status().isAccepted());

		mockMvc.perform(post("/api/auth/login")
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "email": "chris@example.com",
								  "password": "Password123"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Email is not verified. Please verify OTP before login."));
	}

	@Test
	void adminCanManageResourcesAndReviews() throws Exception {
		User adminUser = saveUser("System Admin", "admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User reviewer = saveUser("Reviewer", "reviewer@example.com", Role.USER, true);
		String reviewerToken = createSession(reviewer);

		MvcResult storeResult = mockMvc.perform(post("/api/admin/stores")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "name": "Downtown Matcha House",
								  "description": "Premium drinks and desserts",
								  "address": "12 Nguyen Hue",
								  "contactEmail": "store@example.com",
								  "phoneNumber": "0900000000",
								  "imagePaths": [
								    "/uploads/stores/downtown-matcha-house.jpg",
								    "/uploads/stores/downtown-matcha-house-2.jpg"
								  ],
								  "active": true
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Downtown Matcha House"))
				.andExpect(jsonPath("$.imagePaths", hasSize(2)))
				.andExpect(jsonPath("$.imagePaths[0]").value("/uploads/stores/downtown-matcha-house.jpg"))
				.andReturn();

		Long storeId = extractId(storeResult);

		mockMvc.perform(post("/api/admin/events")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Matcha Launch Week",
								  "description": "Seasonal event for new drinks",
								  "location": "12 Nguyen Hue",
								  "imagePaths": [
								    "/uploads/events/matcha-launch-week.jpg",
								    "/uploads/events/matcha-launch-week-2.jpg"
								  ],
								  "startsAt": "2026-03-19T10:00:00Z",
								  "endsAt": "2026-03-26T10:00:00Z",
								  "active": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.storeId").value(storeId))
				.andExpect(jsonPath("$.imagePaths", hasSize(2)))
				.andExpect(jsonPath("$.imagePaths[0]").value("/uploads/events/matcha-launch-week.jpg"));

		MvcResult categoryResult = mockMvc.perform(post("/api/admin/categories")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Latte",
								  "description": "Milk tea drinks",
								  "imagePaths": [
								    "/uploads/categories/latte.jpg",
								    "/uploads/categories/latte-2.jpg"
								  ],
								  "active": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Latte"))
				.andExpect(jsonPath("$.storeId").value(storeId))
				.andExpect(jsonPath("$.imagePaths", hasSize(2)))
				.andExpect(jsonPath("$.imagePaths[0]").value("/uploads/categories/latte.jpg"))
				.andReturn();

		Long categoryId = extractId(categoryResult);

		MvcResult dishResult = mockMvc.perform(post("/api/admin/dishes")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "name": "Iced Matcha Latte",
								  "description": "Signature iced matcha",
								  "price": 65000,
								  "available": true,
								  "imagePaths": [
								    "/uploads/dishes/iced-matcha-latte.jpg",
								    "/uploads/dishes/iced-matcha-latte-2.jpg"
								  ],
								  "categoryId": %d
								}
								""".formatted(categoryId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.storeId").value(storeId))
				.andExpect(jsonPath("$.categoryId").value(categoryId))
				.andExpect(jsonPath("$.imagePaths", hasSize(2)))
				.andExpect(jsonPath("$.imagePaths[0]").value("/uploads/dishes/iced-matcha-latte.jpg"))
				.andReturn();

		Long dishId = extractId(dishResult);
		saveOrderWithItem(
				reviewer,
				storeRepository.findById(storeId).orElseThrow(),
				dishRepository.findById(dishId).orElseThrow(),
				1,
				new BigDecimal("65000")
		);

		MvcResult reviewResult = mockMvc.perform(post("/api/reviews")
						.header("Authorization", "Bearer " + reviewerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "DISH",
								  "targetId": %d,
								  "rating": 5,
								  "title": "Perfect drink",
								  "comment": "Very smooth and balanced."
								}
								""".formatted(dishId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.targetType").value("DISH"))
				.andExpect(jsonPath("$.targetLabel").value("Dish: Iced Matcha Latte"))
				.andExpect(jsonPath("$.approved").value(true))
				.andExpect(jsonPath("$.targetImagePaths", hasSize(2)))
				.andExpect(jsonPath("$.targetImagePaths[0]").value("/uploads/dishes/iced-matcha-latte.jpg"))
				.andReturn();

		Long reviewId = extractId(reviewResult);

		mockMvc.perform(put("/api/reviews/{id}", reviewId)
						.header("Authorization", "Bearer " + reviewerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "DISH",
								  "targetId": %d,
								  "rating": 4,
								  "title": "Still good",
								  "comment": "Updated review content."
								}
								""".formatted(dishId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.rating").value(4))
				.andExpect(jsonPath("$.title").value("Still good"));

		mockMvc.perform(get("/api/reviews/mine")
						.header("Authorization", "Bearer " + reviewerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(reviewId));

		mockMvc.perform(put("/api/admin/users/{id}", reviewer.getId())
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Reviewer Updated",
								  "email": "reviewer@example.com",
								  "password": "",
								  "role": "MANAGER",
								  "workingStoreId": %d,
								  "enabled": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("MANAGER"))
				.andExpect(jsonPath("$.workingStoreId").value(storeId))
				.andExpect(jsonPath("$.workingStoreName").value("Downtown Matcha House"));

		mockMvc.perform(get("/api/admin/dashboard")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.stores", hasSize(1)))
				.andExpect(jsonPath("$.events", hasSize(1)))
				.andExpect(jsonPath("$.categories", hasSize(1)))
				.andExpect(jsonPath("$.dishes", hasSize(1)))
				.andExpect(jsonPath("$.reviews", hasSize(1)));
	}

	@Test
	void nonAdminCannotAccessAdminDashboard() throws Exception {
		User normalUser = saveUser("Normal User", "normal@example.com", Role.USER, true);
		String token = createSession(normalUser);

		mockMvc.perform(get("/api/admin/dashboard")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Admin role is required"));
	}

	@Test
	void adminCanUploadMultipleImages() throws Exception {
		User adminUser = saveUser("System Admin", "admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		MockMultipartFile firstFile = new MockMultipartFile(
				"files",
				"first-image.jpg",
				"image/jpeg",
				"first-image-content".getBytes()
		);
		MockMultipartFile secondFile = new MockMultipartFile(
				"files",
				"second-image.png",
				"image/png",
				"second-image-content".getBytes()
		);

		mockMvc.perform(multipart("/api/admin/uploads/images")
						.file(firstFile)
						.file(secondFile)
						.param("folder", "stores")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paths", hasSize(2)))
				.andExpect(jsonPath("$.files", hasSize(2)))
				.andExpect(jsonPath("$.paths[0]").exists());

		assertThat(Files.exists(TEST_UPLOAD_DIR.resolve("stores"))).isTrue();
		try (var uploadedFiles = Files.list(TEST_UPLOAD_DIR.resolve("stores"))) {
			assertThat(uploadedFiles.count()).isEqualTo(2);
		}
	}

	@Test
	void adminCannotCreateEmployeeRoleWithoutWorkingStore() throws Exception {
		User adminUser = saveUser("System Admin", "admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		mockMvc.perform(post("/api/admin/users")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Store Staff",
								  "email": "staff@example.com",
								  "password": "Password123",
								  "role": "MANAGER",
								  "enabled": true
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("workingStoreId is required for MANAGER, SHIPPER, and STAFF"));
	}

	@Test
	void onlyUserCanCreateReviewAndManagerCanModerateReviews() throws Exception {
		User managerUser = saveUser("Store Manager", "manager@example.com", Role.MANAGER, true);
		String managerToken = createSession(managerUser);
		User staffUser = saveUser("Store Staff", "staff@example.com", Role.MANAGER, true);
		String staffToken = createSession(staffUser);
		User buyerUser = saveUser("Buyer User", "buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("65000"));
		saveOrderWithItem(buyerUser, store, dish, 2, new BigDecimal("65000"));

		mockMvc.perform(post("/api/reviews")
						.header("Authorization", "Bearer " + staffToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "DISH",
								  "targetId": %d,
								  "rating": 4,
								  "title": "Should fail",
								  "comment": "Non-user review should not be allowed."
								}
								""".formatted(dish.getId())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Only USER accounts can manage reviews"));

		MvcResult reviewResult = mockMvc.perform(post("/api/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "DISH",
								  "targetId": %d,
								  "rating": 5,
								  "title": "Great",
								  "comment": "User review should be allowed."
								}
								""".formatted(dish.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.userEmail").value("buyer@example.com"))
				.andExpect(jsonPath("$.approved").value(true))
				.andReturn();

		Long reviewId = extractId(reviewResult);

		mockMvc.perform(get("/api/admin/reviews")
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(reviewId));

		mockMvc.perform(delete("/api/admin/reviews/{id}", reviewId)
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Review deleted successfully"));

		mockMvc.perform(get("/api/reviews/mine")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(0)));
	}

	@Test
	void buyerCanReviewPurchasedStoreOnlyOnceAndManageOwnReview() throws Exception {
		User buyerUser = saveUser("Buyer User", "buyer@example.com", Role.USER, true);
		User otherBuyer = saveUser("Other Buyer", "other@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		String otherBuyerToken = createSession(otherBuyer);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("65000"));

		mockMvc.perform(post("/api/user/reviews")
						.header("Authorization", "Bearer " + otherBuyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "STORE",
								  "targetId": %d,
								  "rating": 5,
								  "title": "Should fail",
								  "comment": "No order yet"
								}
								""".formatted(store.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("You can only review targets from stores you have ordered from"));

		MvcResult reviewResult = mockMvc.perform(post("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "STORE",
								  "targetId": %d,
								  "rating": 5,
								  "title": "Great branch",
								  "comment": "Fast service and stable quality"
								}
								""".formatted(store.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.targetType").value("STORE"))
				.andReturn();

		Long reviewId = extractId(reviewResult);

		mockMvc.perform(post("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "STORE",
								  "targetId": %d,
								  "rating": 4,
								  "title": "Duplicate",
								  "comment": "Should be rejected"
								}
								""".formatted(store.getId())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("You have already reviewed this target"));

		mockMvc.perform(put("/api/user/reviews/{id}", reviewId)
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "STORE",
								  "targetId": %d,
								  "rating": 4,
								  "title": "Updated branch review",
								  "comment": "I adjusted my rating after a second visit"
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.rating").value(4))
				.andExpect(jsonPath("$.title").value("Updated branch review"));

		mockMvc.perform(delete("/api/user/reviews/{id}", reviewId)
						.header("Authorization", "Bearer " + otherBuyerToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Review not found"));

		mockMvc.perform(delete("/api/user/reviews/{id}", reviewId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Review deleted successfully"));

		mockMvc.perform(get("/api/user/reviews/me")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(0)));
	}

	@Test
	void adminListEndpointsArePaginatedAndSearchable() throws Exception {
		User adminUser = saveUser("System Admin", "admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		Store searchableStore = saveStore("Searchable Store Alpha", "12 Nguyen Hue", "alpha@example.com", "0900111222");
		for (int index = 0; index < 11; index++) {
			saveStore("Store " + index, "Address " + index, "store" + index + "@example.com", "09000000" + index);
		}

		User buyerUser = saveUser("Dynamic Search Buyer", "buyer@example.com", Role.USER, true);
		User staffUser = saveUser("Store Staff", "staff@example.com", Role.MANAGER, true);
		staffUser.setWorkingStore(searchableStore);
		userRepository.save(staffUser);

		EventItem eventItem = saveEvent("Spring Launch", searchableStore, "Searchable Store Alpha");
		Category category = saveCategory("Premium Matcha", searchableStore);
		Dish dish = saveDish("Alpha Latte", category, new BigDecimal("65000"));
		saveReview(buyerUser, ReviewTargetType.DISH, dish.getId(), "Loved it", "Best matcha in town");

		mockMvc.perform(get("/api/admin/summary")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userCount").value(3))
				.andExpect(jsonPath("$.storeCount").value(12))
				.andExpect(jsonPath("$.eventCount").value(1))
				.andExpect(jsonPath("$.categoryCount").value(1))
				.andExpect(jsonPath("$.dishCount").value(1))
				.andExpect(jsonPath("$.storeDishCount").value(0))
				.andExpect(jsonPath("$.promotionCount").value(0))
				.andExpect(jsonPath("$.orderCount").value(0))
				.andExpect(jsonPath("$.reviewCount").value(1));

		mockMvc.perform(get("/api/admin/stores")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(10)))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(10))
				.andExpect(jsonPath("$.totalItems").value(12))
				.andExpect(jsonPath("$.totalPages").value(2))
				.andExpect(jsonPath("$.hasNext").value(true))
				.andExpect(jsonPath("$.hasPrevious").value(false));

		mockMvc.perform(get("/api/admin/users")
						.header("Authorization", "Bearer " + adminToken)
						.param("search", "searchable store alpha"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].email").value("staff@example.com"))
				.andExpect(jsonPath("$.items[0].workingStoreName").value("Searchable Store Alpha"));

		mockMvc.perform(get("/api/admin/events")
						.header("Authorization", "Bearer " + adminToken)
						.param("search", "searchable store alpha"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].name").value("Spring Launch"));

		mockMvc.perform(get("/api/admin/categories")
						.header("Authorization", "Bearer " + adminToken)
						.param("search", "searchable store alpha"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].name").value("Premium Matcha"));

		mockMvc.perform(get("/api/admin/dishes")
						.header("Authorization", "Bearer " + adminToken)
						.param("search", "premium matcha"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].name").value("Alpha Latte"));

		mockMvc.perform(get("/api/admin/reviews")
						.header("Authorization", "Bearer " + adminToken)
						.param("search", "searchable store alpha"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].userEmail").value("buyer@example.com"))
				.andExpect(jsonPath("$.items[0].targetType").value("DISH"));
	}

	@Test
	void adminCanManageStoreDishesAndPublicApisReadJoinedData() throws Exception {
		User adminUser = saveUser("System Admin", "admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User buyerUser = saveUser("Buyer User", "buyer@example.com", Role.USER, true);
		saveSession(buyerUser);

		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		store.setLatitude(10.7769);
		store.setLongitude(106.7009);
		storeRepository.save(store);

		Category category = saveSignatureCategory();
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));

		mockMvc.perform(post("/api/admin/store-dishes")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 8,
								  "available": true,
								  "priceOverride": 70000
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.storeId").value(store.getId()))
				.andExpect(jsonPath("$.dishId").value(dish.getId()))
				.andExpect(jsonPath("$.effectivePrice").value(70000));

		saveReview(buyerUser, ReviewTargetType.STORE, store.getId(), "Great branch", "Nice vibe");
		saveReview(buyerUser, ReviewTargetType.DISH, dish.getId(), "Great drink", "Loved it");
		saveFavorite(buyerUser, FavoriteTargetType.STORE, store.getId());
		saveFavorite(buyerUser, FavoriteTargetType.DISH, dish.getId());

		mockMvc.perform(get("/api/public/stores")
						.param("search", "downtown")
						.param("lat", "10.776")
						.param("lng", "106.701"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].slug").value(store.getSlug()))
				.andExpect(jsonPath("$.items[0].availableItemCount").value(1))
				.andExpect(jsonPath("$.items[0].favoriteCount").value(1));

		mockMvc.perform(get("/api/public/dishes")
						.param("search", "iced")
						.param("lat", "10.776")
						.param("lng", "106.701"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].priceDisplay").value("70.000 Ä‘"))
				.andExpect(jsonPath("$.items[0].stock").value(8))
				.andExpect(jsonPath("$.items[0].storeId").value(store.getId()))
				.andExpect(jsonPath("$.items[0].storeName").value(store.getName()))
				.andExpect(jsonPath("$.items[0].bestStore.storeSlug").value(store.getSlug()))
				.andExpect(jsonPath("$.items[0].bestStore.slug").value(store.getSlug()))
				.andExpect(jsonPath("$.items[0].bestStore.address").value(store.getAddress()));

		mockMvc.perform(get("/api/public/stores/{id}", store.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.store.slug").value(store.getSlug()))
				.andExpect(jsonPath("$.categories", hasSize(1)))
				.andExpect(jsonPath("$.categories[0].title").value(category.getName()))
				.andExpect(jsonPath("$.categories[0].items", hasSize(1)))
				.andExpect(jsonPath("$.categories[0].items[0].categoryId").value(category.getId()))
				.andExpect(jsonPath("$.categories[0].items[0].stock").value(8))
				.andExpect(jsonPath("$.categories[0].items[0].price").value(70000))
				.andExpect(jsonPath("$.categories[0].items[0].schedulable").value(true));

		mockMvc.perform(get("/api/public/stores/{storeKey}", store.getSlug()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.store.id").value(store.getId()))
				.andExpect(jsonPath("$.store.slug").value(store.getSlug()));

		mockMvc.perform(get("/api/public/dishes/{id}", dish.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.stats.totalStock").value(8))
				.andExpect(jsonPath("$.stores", hasSize(1)))
				.andExpect(jsonPath("$.stores[0].id").value(store.getId()))
				.andExpect(jsonPath("$.stores[0].slug").value(store.getSlug()))
				.andExpect(jsonPath("$.stores[0].name").value(store.getName()))
				.andExpect(jsonPath("$.stores[0].storeSlug").value(store.getSlug()))
				.andExpect(jsonPath("$.stores[0].schedulable").value(true))
				.andExpect(jsonPath("$.stores[0].price").value(70000));
	}

	@Test
	void userCanManageFavoritesAndCart() throws Exception {
		User buyerUser = saveUser("Buyer User", "buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		EventItem eventItem = saveEvent("Spring Matcha Day", store, "12 Nguyen Hue");
		saveStoreDish(store, dish, 10, true, new BigDecimal("68000"));

		mockMvc.perform(post("/api/user/favorites")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "EVENT",
								  "targetId": %d
								}
								""".formatted(eventItem.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.targetType").value("EVENT"))
				.andExpect(jsonPath("$.targetLabel").value("Spring Matcha Day"));

		mockMvc.perform(get("/api/user/favorites")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].targetId").value(eventItem.getId()));

		MvcResult addCartResult = mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 2
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].storeSlug").value(store.getSlug()))
				.andExpect(jsonPath("$.subtotal").value(136000))
				.andReturn();

		Map<String, Object> cartBody = objectMapper.readValue(
				addCartResult.getResponse().getContentAsByteArray(),
				new TypeReference<>() {
				}
		);
		List<Map<String, Object>> cartItems = (List<Map<String, Object>>) cartBody.get("items");
		Long cartItemId = ((Number) cartItems.get(0).get("id")).longValue();

		mockMvc.perform(put("/api/user/cart/items/{id}", cartItemId)
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 3
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.subtotal").value(204000))
				.andExpect(jsonPath("$.totalItems").value(3));

		mockMvc.perform(delete("/api/user/cart/items/{id}", cartItemId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(0)));

		mockMvc.perform(delete("/api/user/favorites")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "EVENT",
								  "targetId": %d
								}
								""".formatted(eventItem.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Favorite removed successfully"));
	}

	@Test
	void userReviewRoutesRejectCategoryTargetAndHideLegacyCategoryReviews() throws Exception {
		User buyerUser = saveUser("Buyer User", "buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("65000"));
		saveReview(buyerUser, ReviewTargetType.CATEGORY, category.getId(), "Legacy", "Legacy category review");

		mockMvc.perform(post("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "CATEGORY",
								  "targetId": %d,
								  "rating": 5,
								  "title": "Nope",
								  "comment": "Should fail"
								}
								""".formatted(category.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("CATEGORY reviews are no longer supported"));

		mockMvc.perform(post("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "targetType": "DISH",
								  "targetId": %d,
								  "rating": 5,
								  "title": "Great",
								  "comment": "User review through new path works"
								}
								""".formatted(dish.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.targetType").value("DISH"))
				.andExpect(jsonPath("$.targetLabel").value("Dish: Iced Matcha Latte"))
				.andExpect(jsonPath("$.approved").value(true));

		mockMvc.perform(get("/api/user/reviews/me")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].targetType").value("DISH"));

		mockMvc.perform(get("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].targetType").value("DISH"));

		mockMvc.perform(get("/api/public/reviews")
						.param("targetType", "CATEGORY")
						.param("targetId", category.getId().toString()))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("CATEGORY reviews are no longer supported"));

		mockMvc.perform(get("/api/public/reviews"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].targetType").value("DISH"));
	}

	@Test
	void favoritesSupportTargetFilterAndPurchasedDishFilter() throws Exception {
		User buyerUser = saveUser("Favorite Buyer", "favorite-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveCategory("Latte", store);
		Dish purchasedDish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		Dish notPurchasedDish = saveDish("Hojicha Latte", category, new BigDecimal("55000"));
		EventItem eventItem = saveEvent("Spring Matcha Day", store, "12 Nguyen Hue");
		saveOrderWithItem(buyerUser, store, purchasedDish, 1, new BigDecimal("65000"));

		saveFavorite(buyerUser, FavoriteTargetType.STORE, store.getId());
		saveFavorite(buyerUser, FavoriteTargetType.EVENT, eventItem.getId());
		saveFavorite(buyerUser, FavoriteTargetType.DISH, purchasedDish.getId());
		saveFavorite(buyerUser, FavoriteTargetType.DISH, notPurchasedDish.getId());

		mockMvc.perform(get("/api/user/favorites")
						.header("Authorization", "Bearer " + buyerToken)
						.param("targetType", "STORE"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].targetType").value("STORE"))
				.andExpect(jsonPath("$[0].targetSlug").value(store.getSlug()))
				.andExpect(jsonPath("$[0].purchased").value(true));

		mockMvc.perform(get("/api/user/favorites")
						.header("Authorization", "Bearer " + buyerToken)
						.param("purchasedOnly", "true"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].targetType").value("DISH"))
				.andExpect(jsonPath("$[0].targetId").value(purchasedDish.getId()))
				.andExpect(jsonPath("$[0].purchased").value(true));
	}

	@Test
	void userAndPublicReviewsSupportTargetFilterAndTimeOrRatingSort() throws Exception {
		User buyerUser = saveUser("Review Buyer", "review-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		EventItem eventItem = saveEvent("Spring Matcha Day", store, "12 Nguyen Hue");

		Review storeReview = saveReview(buyerUser, ReviewTargetType.STORE, store.getId(), "Store review", "Nice space");
		storeReview.setRating(2);
		reviewRepository.save(storeReview);
		Thread.sleep(5);

		Review dishReview = saveReview(buyerUser, ReviewTargetType.DISH, dish.getId(), "Dish review", "Good drink");
		dishReview.setRating(4);
		reviewRepository.save(dishReview);
		Thread.sleep(5);

		Review eventReview = saveReview(buyerUser, ReviewTargetType.EVENT, eventItem.getId(), "Event review", "Great event");
		eventReview.setRating(5);
		reviewRepository.save(eventReview);

		mockMvc.perform(get("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.param("targetType", "EVENT")
						.param("sort", "rating_desc"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].targetType").value("EVENT"));

		mockMvc.perform(get("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.param("sort", "rating_asc"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(3)))
				.andExpect(jsonPath("$.items[0].targetType").value("STORE"))
				.andExpect(jsonPath("$.items[0].rating").value(2));

		mockMvc.perform(get("/api/user/reviews")
						.header("Authorization", "Bearer " + buyerToken)
						.param("sort", "date_asc"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].targetType").value("STORE"));

		mockMvc.perform(get("/api/public/reviews")
						.param("targetType", "EVENT")
						.param("sort", "rating_desc"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].targetType").value("EVENT"));

		mockMvc.perform(get("/api/public/reviews")
						.param("sort", "rating_asc"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].targetType").value("STORE"))
				.andExpect(jsonPath("$.items[0].rating").value(2));

		mockMvc.perform(get("/api/public/reviews")
						.param("sort", "date_asc"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].targetType").value("STORE"));
	}

	@Test
	void managerCanUpdateHighlightsAndPublicApisCanSearchThem() throws Exception {
		User adminUser = saveUser("System Admin", "admin-highlight@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		MvcResult storeResult = mockMvc.perform(post("/api/admin/stores")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "name": "Garden Matcha House",
								  "description": "Garden branch",
								  "address": "45 Hoa Cuc, Phu Nhuan",
								  "contactEmail": "garden@example.com",
								  "phoneNumber": "0909990000",
								  "highlightSummary": "Khong gian xanh va de thu gian",
								  "highlightTags": ["garden", "relaxing"],
								  "active": true
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.highlightSummary").value("Khong gian xanh va de thu gian"))
				.andExpect(jsonPath("$.highlightTags", hasSize(2)))
				.andReturn();
		Long storeId = extractId(storeResult);
		Store store = storeRepository.findById(storeId).orElseThrow();

		User managerUser = saveUser("Garden Manager", "garden-manager@example.com", Role.MANAGER, true);
		managerUser.setWorkingStore(store);
		userRepository.save(managerUser);
		String managerToken = createSession(managerUser);

		MvcResult categoryResult = mockMvc.perform(post("/api/admin/categories")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Wellness Drinks",
								  "description": "Nhom mon nhe",
								  "active": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andReturn();
		Long categoryId = extractId(categoryResult);

		MvcResult dishResult = mockMvc.perform(post("/api/admin/dishes")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "categoryId": %d,
								  "name": "Morning Matcha",
								  "description": "Mon de bat dau ngay moi",
								  "price": 59000,
								  "highlightSummary": "Do uong nhe va can bang",
								  "highlightTags": ["light"],
								  "available": true,
								  "active": true
								}
								""".formatted(categoryId)))
				.andExpect(status().isOk())
				.andReturn();
		Long dishId = extractId(dishResult);
		Dish dish = dishRepository.findById(dishId).orElseThrow();
		saveStoreDish(store, dish, 12, true, new BigDecimal("59000"));

		MvcResult eventResult = mockMvc.perform(post("/api/admin/events")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Fan Night",
								  "description": "Su kien giao luu am nhac",
								  "location": "45 Hoa Cuc, Phu Nhuan",
								  "highlightSummary": "Dem nhac nhe",
								  "highlightTags": ["music night"],
								  "startsAt": "2026-03-25T11:00:00Z",
								  "endsAt": "2026-03-25T14:00:00Z",
								  "active": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andReturn();
		Long eventId = extractId(eventResult);

		mockMvc.perform(put("/api/admin/stores/{id}/highlights", storeId)
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "highlightSummary": "Quan yen tinh de hoc bai va gap mat nhe",
								  "highlightTags": ["quiet zone", "study-friendly", "calm corner"]
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.highlightSummary").value("Quan yen tinh de hoc bai va gap mat nhe"))
				.andExpect(jsonPath("$.highlightTags[0]").value("quiet zone"));

		mockMvc.perform(put("/api/admin/dishes/{id}/highlights", dishId)
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "highlightSummary": "Mon thanh dam, it ngot, de uong moi ngay",
								  "highlightTags": ["thanh dam", "it ngot", "wellness drink"]
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.highlightSummary").value("Mon thanh dam, it ngot, de uong moi ngay"))
				.andExpect(jsonPath("$.highlightTags[1]").value("it ngot"));

		mockMvc.perform(put("/api/admin/events/{id}/highlights", eventId)
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "highlightSummary": "Su kien Son Tung MTP mini fan meeting",
								  "highlightTags": ["son tung mtp", "fan meeting"]
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.highlightSummary").value("Su kien Son Tung MTP mini fan meeting"))
				.andExpect(jsonPath("$.highlightTags[0]").value("son tung mtp"));

		mockMvc.perform(get("/api/public/stores")
						.param("search", "yen tinh"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(storeId))
				.andExpect(jsonPath("$.items[0].highlightSummary").value("Quan yen tinh de hoc bai va gap mat nhe"))
				.andExpect(jsonPath("$.items[0].highlightTags[1]").value("study-friendly"));

		mockMvc.perform(get("/api/public/stores/{storeKey}", store.getSlug()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.store.highlightSummary").value("Quan yen tinh de hoc bai va gap mat nhe"))
				.andExpect(jsonPath("$.categories[0].items[0].highlightSummary").value("Mon thanh dam, it ngot, de uong moi ngay"));

		mockMvc.perform(get("/api/public/dishes")
						.param("search", "thanh dam"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(dishId))
				.andExpect(jsonPath("$.items[0].highlightTags[2]").value("wellness drink"));

		mockMvc.perform(get("/api/public/events")
						.param("search", "son tung mtp"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(eventId))
				.andExpect(jsonPath("$.items[0].title").value("Fan Night"))
				.andExpect(jsonPath("$.items[0].summary").value("Su kien Son Tung MTP mini fan meeting"))
				.andExpect(jsonPath("$.items[0].store.slug").value(store.getSlug()))
				.andExpect(jsonPath("$.items[0].store.open").isBoolean())
				.andExpect(jsonPath("$.items[0].highlightSummary").value("Su kien Son Tung MTP mini fan meeting"));
	}

	@Test
	void publicEventSupportsDedicatedSlugRouteKey() throws Exception {
		User adminUser = saveUser("System Admin", "admin-event-slug@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		Store store = saveStore("Garden Matcha House", "45 Hoa Cuc", "garden@example.com", "0909990000");

		MvcResult eventResult = mockMvc.perform(post("/api/admin/events")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Matcha Launch Week Q1",
								  "slug": "matcha-launch-week-q1",
								  "description": "Su kien mo man menu moi cho quy 1.",
								  "location": "45 Hoa Cuc",
								  "startsAt": "2026-03-25T10:00:00Z",
								  "endsAt": "2026-03-25T14:00:00Z",
								  "active": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("matcha-launch-week-q1"))
				.andReturn();

		Long eventId = extractId(eventResult);

		mockMvc.perform(get("/api/public/events")
						.param("search", "matcha-launch-week-q1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(eventId))
				.andExpect(jsonPath("$.items[0].slug").value("matcha-launch-week-q1"))
				.andExpect(jsonPath("$.items[0].storeSlug").value(store.getSlug()));

		mockMvc.perform(get("/api/public/events/{eventKey}", "matcha-launch-week-q1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(eventId))
				.andExpect(jsonPath("$.slug").value("matcha-launch-week-q1"))
				.andExpect(jsonPath("$.storeId").value(store.getId()))
				.andExpect(jsonPath("$.storeSlug").value(store.getSlug()))
				.andExpect(jsonPath("$.store.slug").value(store.getSlug()));

		mockMvc.perform(get("/api/public/events/{eventKey}", eventId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(eventId))
				.andExpect(jsonPath("$.slug").value("matcha-launch-week-q1"));
	}

	@Test
	void adminCanManageNewsAndPublicReadsOnlyPublishedArticles() throws Exception {
		User adminUser = saveUser("System Admin", "admin-news@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");

		MvcResult publishedNewsResult = mockMvc.perform(post("/api/admin/news")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Khai truong Downtown Matcha House",
								  "summary": "Chi nhanh moi da san sang don khach ngay trung tam.",
								  "content": "Tea Matcha chinh thuc khai truong chi nhanh Downtown Matcha House voi tasting bar moi.",
								  "relatedStoreId": %d,
								  "tags": ["khai-truong", "chi-nhanh-moi", "downtown"],
								  "imagePaths": ["/uploads/news/downtown-opening.jpg"],
								  "featured": true,
								  "published": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("khai-truong-downtown-matcha-house"))
				.andExpect(jsonPath("$.relatedStoreSlug").value(store.getSlug()))
				.andReturn();

		Long publishedNewsId = extractId(publishedNewsResult);

		mockMvc.perform(post("/api/admin/news")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Ban nhap noi bo thang 4",
								  "summary": "Ban nhap noi bo de chuan bi menu moi.",
								  "content": "Noi dung nay chua public.",
								  "relatedStoreId": %d,
								  "tags": ["noi-bo"],
								  "imagePaths": [],
								  "featured": false,
								  "published": false
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("ban-nhap-noi-bo-thang-4"));

		mockMvc.perform(get("/api/admin/news")
						.header("Authorization", "Bearer " + adminToken)
						.param("search", "khai truong"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalItems").value(1))
				.andExpect(jsonPath("$.items[0].id").value(publishedNewsId));

		mockMvc.perform(get("/api/public/news"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].slug").value("khai-truong-downtown-matcha-house"))
				.andExpect(jsonPath("$.items[0].relatedStoreSlug").value(store.getSlug()));

		mockMvc.perform(get("/api/public/news/{newsKey}", "khai-truong-downtown-matcha-house"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(publishedNewsId))
				.andExpect(jsonPath("$.relatedStoreSlug").value(store.getSlug()))
				.andExpect(jsonPath("$.content").value(containsString("khai truong")));

		mockMvc.perform(get("/api/public/home"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.latestNews[0].slug").value("khai-truong-downtown-matcha-house"));
	}

	@Test
	void adminAndPublicApisExposeSectionsForStoreDishEventAndNews() throws Exception {
		User adminUser = saveUser("System Admin", "admin-sections@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		MvcResult storeResult = mockMvc.perform(post("/api/admin/stores")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "name": "Story Matcha House",
								  "description": "Khong gian thuong hieu co bai viet rieng",
								  "address": "88 Le Loi",
								  "sections": [
								    {
								      "title": "Khong gian workshop",
								      "content": "Noi day co slow bar va workshop cuoi tuan cho cong dong yeu matcha.",
								      "imagePaths": [
								        "/uploads/stores/story-workshop.jpg",
								        "/uploads/stores/story-workshop-2.jpg"
								      ]
								    },
								    {
								      "title": "Goc meetup",
								      "content": "Ban dai phu hop cho meetup thuong hieu va nhom ban.",
								      "imagePath": "/uploads/stores/story-meetup.jpg"
								    }
								  ],
								  "active": true
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections", hasSize(2)))
				.andExpect(jsonPath("$.sections[0].title").value("Khong gian workshop"))
				.andExpect(jsonPath("$.sections[0].imagePaths", hasSize(2)))
				.andExpect(jsonPath("$.sections[0].imagePaths[1]").value("/uploads/stores/story-workshop-2.jpg"))
				.andExpect(jsonPath("$.sections[1].imagePath").value("/uploads/stores/story-meetup.jpg"))
				.andReturn();

		Long storeId = extractId(storeResult);

		MvcResult categoryResult = mockMvc.perform(post("/api/admin/categories")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Menu signature",
								  "description": "Danh muc mon signature",
								  "active": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andReturn();

		Long categoryId = extractId(categoryResult);

		MvcResult dishResult = mockMvc.perform(post("/api/admin/dishes")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "categoryId": %d,
								  "name": "Cloud Matcha",
								  "description": "Mon signature co lop kem mem",
								  "price": 79000,
								  "sections": [
								    {
								      "title": "Huong vi",
								      "content": "Lop matcha dam vi ket hop kem sua nhat va bot matcha xay moi.",
								      "imagePath": "/uploads/dishes/cloud-matcha-flavor.jpg"
								    },
								    {
								      "title": "Cach thuong thuc",
								      "content": "Nen khuay nhe truoc khi uong de vi beo va vi tra hoa quyen vao nhau.",
								      "imagePaths": [
								        "/uploads/dishes/cloud-matcha-serve.jpg",
								        "/uploads/dishes/cloud-matcha-serve-2.jpg"
								      ]
								    }
								  ],
								  "active": true
								}
								""".formatted(categoryId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections", hasSize(2)))
				.andExpect(jsonPath("$.sections[0].title").value("Huong vi"))
				.andExpect(jsonPath("$.sections[1].imagePaths", hasSize(2)))
				.andReturn();

		Long dishId = extractId(dishResult);

		MvcResult eventResult = mockMvc.perform(post("/api/admin/events")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Story Tasting Night",
								  "description": "Dem thuong thuc va chia se cau chuyen matcha",
								  "location": "88 Le Loi",
								  "sections": [
								    {
								      "title": "Lich trinh",
								      "content": "Mo dau bang tasting set, tiep theo la phan ke chuyen ve nguon goc hat matcha.",
								      "imagePaths": [
								        "/uploads/events/story-night-schedule.jpg",
								        "/uploads/events/story-night-schedule-2.jpg"
								      ]
								    },
								    {
								      "title": "Khach moi",
								      "content": "Barista truong se huong dan cach danh bot matcha bang chasen.",
								      "imagePath": "/uploads/events/story-night-guest.jpg"
								    }
								  ],
								  "startsAt": "2026-04-10T10:00:00Z",
								  "endsAt": "2026-04-10T12:00:00Z",
								  "active": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections", hasSize(2)))
				.andExpect(jsonPath("$.sections[1].title").value("Khach moi"))
				.andReturn();

		Long eventId = extractId(eventResult);

		MvcResult newsResult = mockMvc.perform(post("/api/admin/news")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Story Matcha House ra mat bai viet dai",
								  "summary": "Tin tuc gioi thieu noi dung co sections cho storefront.",
								  "content": "Bai viet tong hop gioi thieu thuong hieu va bo suu tap mon moi.",
								  "relatedStoreId": %d,
								  "sections": [
								    {
								      "title": "Nguon cam hung",
								      "content": "Thuong hieu tap trung vao trai nghiem doc nhu mot bai editorial ngan.",
								      "imagePaths": [
								        "/uploads/news/story-inspiration.jpg",
								        "/uploads/news/story-inspiration-2.jpg"
								      ]
								    },
								    {
								      "title": "Lo trinh hat matcha",
								      "content": "Bai viet mo ta qua trinh chon bot, danh bot va phoi vi cho menu moi.",
								      "imagePath": "/uploads/news/story-matcha-journey.jpg"
								    }
								  ],
								  "tags": ["story", "editorial"],
								  "featured": true,
								  "published": true
								}
								""".formatted(storeId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections", hasSize(2)))
				.andExpect(jsonPath("$.sections[0].title").value("Nguon cam hung"))
				.andReturn();

		Long newsId = extractId(newsResult);

		mockMvc.perform(get("/api/admin/stores/{id}", storeId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections[0].content").value(containsString("workshop cuoi tuan")))
				.andExpect(jsonPath("$.sections[0].imagePath").value("/uploads/stores/story-workshop.jpg"))
				.andExpect(jsonPath("$.sections[0].imagePaths", hasSize(2)));

		mockMvc.perform(get("/api/admin/dishes/{id}", dishId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections[1].title").value("Cach thuong thuc"))
				.andExpect(jsonPath("$.sections[1].imagePath").value("/uploads/dishes/cloud-matcha-serve.jpg"))
				.andExpect(jsonPath("$.sections[1].imagePaths[1]").value("/uploads/dishes/cloud-matcha-serve-2.jpg"));

		mockMvc.perform(get("/api/admin/events/{id}", eventId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections[0].imagePath").value("/uploads/events/story-night-schedule.jpg"))
				.andExpect(jsonPath("$.sections[0].imagePaths", hasSize(2)));

		mockMvc.perform(get("/api/admin/news/{id}", newsId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections[1].title").value("Lo trinh hat matcha"))
				.andExpect(jsonPath("$.sections[0].imagePaths[1]").value("/uploads/news/story-inspiration-2.jpg"));

		mockMvc.perform(get("/api/public/stores")
						.param("search", "workshop cuoi tuan"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(storeId));

		mockMvc.perform(get("/api/public/news")
						.param("search", "Lo trinh hat matcha"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(newsId));

		mockMvc.perform(get("/api/public/stores/{storeKey}", "story-matcha-house"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.store.sections", hasSize(2)))
				.andExpect(jsonPath("$.store.sections[0].title").value("Khong gian workshop"))
				.andExpect(jsonPath("$.store.sections[0].imagePaths[1]").value("/uploads/stores/story-workshop-2.jpg"));

		mockMvc.perform(get("/api/public/dishes/{id}", dishId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.dish.sections", hasSize(2)))
				.andExpect(jsonPath("$.dish.sections[1].imagePath").value("/uploads/dishes/cloud-matcha-serve.jpg"))
				.andExpect(jsonPath("$.dish.sections[1].imagePaths", hasSize(2)));

		mockMvc.perform(get("/api/public/events/{eventKey}", "story-tasting-night"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections", hasSize(2)))
				.andExpect(jsonPath("$.sections[1].content").value(containsString("chasen")));

		mockMvc.perform(get("/api/public/news/{newsKey}", "story-matcha-house-ra-mat-bai-viet-dai"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sections", hasSize(2)))
				.andExpect(jsonPath("$.sections[0].imagePath").value("/uploads/news/story-inspiration.jpg"))
				.andExpect(jsonPath("$.sections[0].imagePaths[1]").value("/uploads/news/story-inspiration-2.jpg"));
	}

	@Test
	void adminCanGetUpdateAndDeleteNewsById() throws Exception {
		User adminUser = saveUser("System Admin", "admin-news-crud@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		Store store = saveStore("Airport Hub", "2 Truong Son", "airport@example.com", "0900000001");

		MvcResult createdNewsResult = mockMvc.perform(post("/api/admin/news")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Airport Hub chuan bi khai truong",
								  "summary": "Thong bao mo them diem ban moi.",
								  "content": "Noi dung nhap de kiem thu thao tac xem sua xoa.",
								  "relatedStoreId": %d,
								  "tags": ["airport", "opening"],
								  "imagePaths": ["/uploads/news/airport-hub.jpg"],
								  "featured": false,
								  "published": false
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("airport-hub-chuan-bi-khai-truong"))
				.andReturn();

		Long newsId = extractId(createdNewsResult);

		mockMvc.perform(get("/api/admin/news/{id}", newsId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(newsId))
				.andExpect(jsonPath("$.relatedStoreId").value(store.getId()))
				.andExpect(jsonPath("$.published").value(false));

		mockMvc.perform(put("/api/admin/news/{id}", newsId)
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Airport Hub da san sang don khach",
								  "slug": "airport-hub-da-san-sang-don-khach",
								  "summary": "Tin da duoc cap nhat.",
								  "content": "Noi dung moi de frontend co the hien thi chinh xac.",
								  "relatedStoreId": %d,
								  "tags": ["airport", "ready"],
								  "imagePaths": ["/uploads/news/airport-hub-ready.jpg"],
								  "featured": true,
								  "published": true,
								  "publishedAt": "2026-03-20T02:00:00Z"
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Airport Hub da san sang don khach"))
				.andExpect(jsonPath("$.slug").value("airport-hub-da-san-sang-don-khach"))
				.andExpect(jsonPath("$.published").value(true))
				.andExpect(jsonPath("$.featured").value(true));

		mockMvc.perform(delete("/api/admin/news/{id}", newsId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("News deleted successfully"));

		mockMvc.perform(get("/api/admin/news/{id}", newsId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("News not found"));
	}

	@Test
	void userCanManageDeliveryAddresses() throws Exception {
		User buyerUser = saveUser("Delivery Buyer", "delivery@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);

		MvcResult createdAddressResult = mockMvc.perform(post("/api/user/delivery-addresses")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Nguyen Quang Truong",
								  "phoneNumber": "0901234567",
								  "deliveryAddress": "12 Nguyen Hue, Quan 1, TP HCM",
								  "latitude": 10.776889,
								  "longitude": 106.700806
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.fullName").value("Nguyen Quang Truong"))
				.andExpect(jsonPath("$.phoneNumber").value("0901234567"))
				.andExpect(jsonPath("$.deliveryAddress").value("12 Nguyen Hue, Quan 1, TP HCM"))
				.andExpect(jsonPath("$.latitude").value(10.776889))
				.andExpect(jsonPath("$.longitude").value(106.700806))
				.andExpect(jsonPath("$.primary").value(true))
				.andExpect(jsonPath("$.verified").value(false))
				.andReturn();

		Long addressId = extractId(createdAddressResult);

		mockMvc.perform(get("/api/user/delivery-addresses")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].id").value(addressId))
				.andExpect(jsonPath("$[0].latitude").value(10.776889))
				.andExpect(jsonPath("$[0].longitude").value(106.700806))
				.andExpect(jsonPath("$[0].primary").value(true))
				.andExpect(jsonPath("$[0].verified").value(false));

		mockMvc.perform(get("/api/user/delivery-addresses/primary")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(addressId))
				.andExpect(jsonPath("$.latitude").value(10.776889))
				.andExpect(jsonPath("$.longitude").value(106.700806))
				.andExpect(jsonPath("$.primary").value(true))
				.andExpect(jsonPath("$.verified").value(false));

		mockMvc.perform(get("/api/user/delivery-addresses/{id}", addressId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.fullName").value("Nguyen Quang Truong"))
				.andExpect(jsonPath("$.latitude").value(10.776889))
				.andExpect(jsonPath("$.longitude").value(106.700806))
				.andExpect(jsonPath("$.verified").value(false));

		mockMvc.perform(put("/api/user/delivery-addresses/{id}", addressId)
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "fullName": "Nguyen Quang Truong Updated",
								  "phoneNumber": "0911111111",
								  "deliveryAddress": "88 Le Loi, Quan 1, TP HCM",
								  "latitude": 10.773200,
								  "longitude": 106.703700
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.fullName").value("Nguyen Quang Truong Updated"))
				.andExpect(jsonPath("$.phoneNumber").value("0911111111"))
				.andExpect(jsonPath("$.deliveryAddress").value("88 Le Loi, Quan 1, TP HCM"))
				.andExpect(jsonPath("$.latitude").value(10.7732))
				.andExpect(jsonPath("$.longitude").value(106.7037));

		mockMvc.perform(delete("/api/user/delivery-addresses/{id}", addressId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Delivery address deleted successfully"));

		mockMvc.perform(get("/api/user/delivery-addresses")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void userCanCreateListAndDeleteFeedbacks() throws Exception {
		User buyerUser = saveUser("Feedback Buyer", "feedback@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Feedback Store", "12 Nguyen Hue", "feedback-store@example.com", "0900001234");

		MvcResult createdFeedbackResult = mockMvc.perform(post("/api/user/feedbacks")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "category": "STORE_SERVICE",
								  "relatedStoreId": %d,
								  "subject": "Nhan vien ho tro nhanh",
								  "message": "Mong quan giu phong cach phuc vu nay."
								}
								""".formatted(store.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.userEmail").value("feedback@example.com"))
				.andExpect(jsonPath("$.category").value("STORE_SERVICE"))
				.andExpect(jsonPath("$.relatedStoreSlug").value(store.getSlug()))
				.andReturn();

		Long feedbackId = extractId(createdFeedbackResult);
		assertThat(customerFeedbackRepository.count()).isEqualTo(1);

		mockMvc.perform(get("/api/user/feedbacks")
						.header("Authorization", "Bearer " + buyerToken)
						.param("page", "0")
						.param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalItems").value(1))
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(feedbackId))
				.andExpect(jsonPath("$.items[0].subject").value("Nhan vien ho tro nhanh"));

		mockMvc.perform(get("/api/user/feedbacks/{id}", feedbackId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Mong quan giu phong cach phuc vu nay."))
				.andExpect(jsonPath("$.replyMessage").value(nullValue()))
				.andExpect(jsonPath("$.repliedAt").value(nullValue()));

		mockMvc.perform(delete("/api/user/feedbacks/{id}", feedbackId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Feedback deleted successfully"));

		mockMvc.perform(get("/api/user/feedbacks")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalItems").value(0))
				.andExpect(jsonPath("$.items", hasSize(0)));
	}

	@Test
	void userCanCreateOrderFeedbackAndReceiveAdminReplyWithOrderContext() throws Exception {
		User buyerUser = saveUser("Order Feedback Buyer", "order-feedback@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		User adminUser = saveUser("Feedback Admin", "feedback-admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		Store store = saveStore("Order Feedback Store", "12 Nguyen Hue", "order-feedback-store@example.com", "0900999888");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		Order order = savePaidOrderWithItemAt(
				buyerUser,
				store,
				dish,
				1,
				new BigDecimal("65000"),
				OrderStatus.COMPLETED,
				instantInPreviousQuarter()
		);

		MvcResult feedbackResult = mockMvc.perform(post("/api/user/feedbacks")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "category": "ORDER_EXPERIENCE",
								  "relatedOrderId": %d,
								  "subject": "Don hang on",
								  "message": "Tra sua duoc giao dung gio."
								}
								""".formatted(order.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.relatedStoreId").value(store.getId()))
				.andExpect(jsonPath("$.relatedOrderId").value(order.getId()))
				.andExpect(jsonPath("$.relatedOrderStatus").value("COMPLETED"))
				.andExpect(jsonPath("$.relatedOrderPaymentStatus").value("PAID"))
				.andReturn();

		Long feedbackId = extractId(feedbackResult);

		mockMvc.perform(put("/api/admin/feedbacks/{id}/reply", feedbackId)
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "replyMessage": "Tea Matcha da ghi nhan va cam on ban."
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.feedbackId").value(feedbackId));

		mockMvc.perform(get("/api/user/feedbacks/{id}", feedbackId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.relatedStoreId").value(store.getId()))
				.andExpect(jsonPath("$.relatedOrderId").value(order.getId()))
				.andExpect(jsonPath("$.replyMessage").value("Tea Matcha da ghi nhan va cam on ban."));
	}

	@Test
	void adminAndManagerCanReviewFeedbackInboxByAccessRules() throws Exception {
		User adminUser = saveUser("Admin User", "admin-feedback@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		Store managedStore = saveStore("Managed Store", "12 Nguyen Hue", "managed-store@example.com", "0900001111");
		User managerUser = saveUser("Store Manager", "manager-feedback@example.com", Role.MANAGER, true);
		managerUser.setWorkingStore(managedStore);
		userRepository.save(managerUser);
		String managerToken = createSession(managerUser);

		Store otherStore = saveStore("Other Store", "88 Le Loi", "other-store@example.com", "0900002222");
		User buyerUser = saveUser("Feedback Buyer", "buyer-feedback@example.com", Role.USER, true);

		CustomerFeedback managedFeedback = saveCustomerFeedback(
				buyerUser,
				FeedbackCategory.STORE_SERVICE,
				managedStore,
				"Nhan vien vui ve",
				"Can tiep tuc phuc vu nhu vay."
		);
		CustomerFeedback otherFeedback = saveCustomerFeedback(
				buyerUser,
				FeedbackCategory.PRODUCT_QUALITY,
				otherStore,
				"Mui vi can cai thien",
				"Mon nay hoi ngot voi khau vi cua toi."
		);

		mockMvc.perform(get("/api/admin/feedbacks")
						.header("Authorization", "Bearer " + managerToken)
						.param("search", "vui ve"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalItems").value(1))
				.andExpect(jsonPath("$.items[0].id").value(managedFeedback.getId()))
				.andExpect(jsonPath("$.items[0].relatedStoreId").value(managedStore.getId()));

		mockMvc.perform(get("/api/admin/feedbacks/{id}", otherFeedback.getId())
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Feedback does not belong to your store"));

		mockMvc.perform(get("/api/admin/feedbacks")
						.header("Authorization", "Bearer " + adminToken)
						.param("search", "buyer-feedback@example.com"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalItems").value(2));

		mockMvc.perform(delete("/api/admin/feedbacks/{id}", managedFeedback.getId())
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Feedback deleted successfully"));

		assertThat(customerFeedbackRepository.existsById(managedFeedback.getId())).isFalse();
	}

	@Test
	void adminAndManagerCanReplyToFeedbackByAccessRules() throws Exception {
		Store managedStore = saveStore("Managed Reply Store", "12 Nguyen Hue", "managed-reply@example.com", "0900003333");
		Store otherStore = saveStore("Other Reply Store", "88 Le Loi", "other-reply@example.com", "0900004444");

		User adminUser = saveUser("Admin Reply", "admin-reply@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		User managerUser = saveUser("Manager Reply", "manager-reply@example.com", Role.MANAGER, true);
		managerUser.setWorkingStore(managedStore);
		userRepository.save(managerUser);
		String managerToken = createSession(managerUser);

		User buyerUser = saveUser("Reply Buyer", "reply-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);

		CustomerFeedback managedFeedback = saveCustomerFeedback(
				buyerUser,
				FeedbackCategory.STORE_SERVICE,
				managedStore,
				"Dich vu tot",
				"Cam on cua hang da ho tro nhanh."
		);
		CustomerFeedback otherFeedback = saveCustomerFeedback(
				buyerUser,
				FeedbackCategory.PRODUCT_QUALITY,
				otherStore,
				"Can cai thien mon nuoc",
				"Mui vi chua du can bang."
		);

		mockMvc.perform(put("/api/admin/feedbacks/{id}/reply", managedFeedback.getId())
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "replyMessage": "Cam on ban. Quan da ghi nhan va se tiep tuc giu chat luong phuc vu."
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.replyMessage").value("Cam on ban. Quan da ghi nhan va se tiep tuc giu chat luong phuc vu."))
				.andExpect(jsonPath("$.repliedByUserId").value(managerUser.getId()))
				.andExpect(jsonPath("$.repliedByUserName").value("Manager Reply"))
				.andExpect(jsonPath("$.repliedByUserRole").value("MANAGER"))
				.andExpect(jsonPath("$.repliedAt").exists());

		mockMvc.perform(get("/api/admin/feedbacks/{id}/reply", managedFeedback.getId())
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.feedbackId").value(managedFeedback.getId()))
				.andExpect(jsonPath("$.replyMessage").value("Cam on ban. Quan da ghi nhan va se tiep tuc giu chat luong phuc vu."))
				.andExpect(jsonPath("$.repliedByUserId").value(managerUser.getId()))
				.andExpect(jsonPath("$.repliedByUserName").value("Manager Reply"))
				.andExpect(jsonPath("$.repliedByUserRole").value("MANAGER"));

		mockMvc.perform(get("/api/user/feedbacks/{id}", managedFeedback.getId())
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.replyMessage").value("Cam on ban. Quan da ghi nhan va se tiep tuc giu chat luong phuc vu."))
				.andExpect(jsonPath("$.repliedByUserName").value("Manager Reply"))
				.andExpect(jsonPath("$.repliedByUserRole").value("MANAGER"));

		mockMvc.perform(put("/api/admin/feedbacks/{id}/reply", otherFeedback.getId())
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "replyMessage": "Quan da kiem tra va se dieu chinh cong thuc."
								}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Feedback does not belong to your store"));

		mockMvc.perform(put("/api/admin/feedbacks/{id}/reply", otherFeedback.getId())
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "replyMessage": "Tea Matcha da ghi nhan va se ra soat lai chat luong mon."
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.replyMessage").value("Tea Matcha da ghi nhan va se ra soat lai chat luong mon."))
				.andExpect(jsonPath("$.repliedByUserId").value(adminUser.getId()))
				.andExpect(jsonPath("$.repliedByUserName").value("Admin Reply"))
				.andExpect(jsonPath("$.repliedByUserRole").value("ADMIN"));

		mockMvc.perform(delete("/api/admin/feedbacks/{id}/reply", otherFeedback.getId())
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Feedback reply deleted successfully"));

		mockMvc.perform(get("/api/admin/feedbacks/{id}/reply", otherFeedback.getId())
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Feedback reply not found"));

		mockMvc.perform(get("/api/admin/feedbacks/{id}", otherFeedback.getId())
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.replyMessage").value(nullValue()))
				.andExpect(jsonPath("$.repliedAt").value(nullValue()))
				.andExpect(jsonPath("$.repliedByUserId").value(nullValue()))
				.andExpect(jsonPath("$.repliedByUserName").value(nullValue()))
				.andExpect(jsonPath("$.repliedByUserRole").value(nullValue()));
	}

	@Test
	void checkoutCanApplyPromotionAndCreatePayOsPaymentLink() throws Exception {
		User buyerUser = saveUser("Checkout Buyer", "checkout@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveStoreDish(store, dish, 10, true, new BigDecimal("68000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);
		Promotion promotion = savePromotion("MATCHA10", PromotionScope.ORDER, PromotionDiscountType.PERCENT, new BigDecimal("10"));

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 2
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk());

		when(payOsClient.createPaymentLink(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentLinkData(
				"plink-123",
				"https://pay.payos.vn/web/plink-123",
				"qr-123",
				"PENDING",
				1L,
				122400
		));

		MvcResult checkoutResult = mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "promotionCode": "MATCHA10",
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deliveryType").value("IMMEDIATE"))
				.andExpect(jsonPath("$.paymentProvider").value("PAYOS"))
				.andExpect(jsonPath("$.paymentStatus").value("PENDING"))
				.andExpect(jsonPath("$.statusSummary").value("Cho thanh toan"))
				.andExpect(jsonPath("$.promotionCode").value("MATCHA10"))
				.andExpect(jsonPath("$.orders", hasSize(1)))
				.andExpect(jsonPath("$.orders[0].promotionScope").value("ORDER"))
				.andExpect(jsonPath("$.orders[0].promotionEligibleAmount").value(136000))
				.andExpect(jsonPath("$.orders[0].promotionDishIds", hasSize(0)))
				.andExpect(jsonPath("$.subtotalAmount").value(136000))
				.andExpect(jsonPath("$.discountAmount").value(13600))
				.andExpect(jsonPath("$.totalAmount").value(122400))
				.andExpect(jsonPath("$.paymentReference").value("plink-123"))
				.andExpect(jsonPath("$.paymentCheckoutUrl").value("https://pay.payos.vn/web/plink-123"))
				.andExpect(jsonPath("$.paymentQrCode").value("qr-123"))
				.andReturn();

		Long orderId = extractId(checkoutResult);
		verify(emailSender).sendPaymentReminderEmail(
				eq("checkout@example.com"),
				eq("Checkout Buyer"),
				eq(orderId),
				any(BigDecimal.class),
				eq("https://pay.payos.vn/web/plink-123"),
				any(Instant.class),
				eq(DeliveryType.IMMEDIATE),
				isNull()
		);

		mockMvc.perform(get("/api/user/orders/{id}", orderId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.storeSlug").value(store.getSlug()))
				.andExpect(jsonPath("$.statusSummary").value("Cho thanh toan"))
				.andExpect(jsonPath("$.paymentReference").value("plink-123"))
				.andExpect(jsonPath("$.paymentCheckoutUrl").value("https://pay.payos.vn/web/plink-123"))
				.andExpect(jsonPath("$.paymentQrCode").value("qr-123"))
				.andExpect(jsonPath("$.deliveryFullName").value("Nguyen Quang Truong"))
				.andExpect(jsonPath("$.deliveryPhoneNumber").value("0901234567"))
				.andExpect(jsonPath("$.deliveryAddress").value("12 Nguyen Hue, Quan 1, TP HCM"));

		assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isEqualTo(1);
	}

	@Test
	void checkoutPreviewCheckoutAndOrderDetailExposeShippingFeeContract() throws Exception {
		User buyerUser = saveUser("Shipping Buyer", "shipping@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore(
				"Shipping Store",
				"12 Nguyen Hue",
				"shipping-store@example.com",
				"0900007777",
				10.781020,
				106.698340
		);
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Matcha Coconut", category, new BigDecimal("50000"));
		saveStoreDish(store, dish, 10, true, new BigDecimal("52000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Shipping Buyer",
				"0901234567",
				"1 Le Loi, Quan 1, TP HCM",
				10.776889,
				106.700806
		);

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/user/cart")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].storeId").value(store.getId()))
				.andExpect(jsonPath("$.items[0].storeLatitude").value(10.78102))
				.andExpect(jsonPath("$.items[0].storeLongitude").value(106.69834));

		BigDecimal expectedDistanceKm = haversineKm(
				store.getLatitude(),
				store.getLongitude(),
				deliveryAddress.getLatitude(),
				deliveryAddress.getLongitude()
		);
		BigDecimal expectedShippingDistanceKm = expectedDistanceKm.setScale(3, java.math.RoundingMode.HALF_UP);
		BigDecimal expectedShippingFeeAmount = BigDecimal.valueOf(Math.round(expectedDistanceKm.doubleValue() * 4000));
		BigDecimal expectedSubtotalAmount = new BigDecimal("52000");
		BigDecimal expectedTotalAmount = expectedSubtotalAmount.add(expectedShippingFeeAmount);

		MvcResult previewResult = mockMvc.perform(post("/api/user/cart/checkout-preview")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "deliveryType": "DELIVERY"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isOk())
				.andReturn();

		var previewJson = objectMapper.readTree(previewResult.getResponse().getContentAsString());
		assertThat(previewJson.path("subtotalAmount").decimalValue()).isEqualByComparingTo(expectedSubtotalAmount);
		assertThat(previewJson.path("discountAmount").decimalValue()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(previewJson.path("shippingDistanceKm").decimalValue()).isEqualByComparingTo(expectedShippingDistanceKm);
		assertThat(previewJson.path("shippingFeeAmount").decimalValue()).isEqualByComparingTo(expectedShippingFeeAmount);
		assertThat(previewJson.path("totalAmount").decimalValue()).isEqualByComparingTo(expectedTotalAmount);
		assertThat(previewJson.path("statusSummary").asText()).isEqualTo("Preview ready");
		assertThat(previewJson.path("shippingFeeBreakdown")).hasSize(1);
		assertThat(previewJson.path("shippingFeeBreakdown").get(0).path("storeId").asLong()).isEqualTo(store.getId());
		assertThat(previewJson.path("shippingFeeBreakdown").get(0).path("distanceKm").decimalValue()).isEqualByComparingTo(expectedShippingDistanceKm);
		assertThat(previewJson.path("shippingFeeBreakdown").get(0).path("shippingFeeAmount").decimalValue()).isEqualByComparingTo(expectedShippingFeeAmount);

		when(payOsClient.createPaymentLink(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentLinkData(
				"plink-shipping",
				"https://pay.payos.vn/web/plink-shipping",
				"qr-shipping",
				"PENDING",
				1L,
				expectedTotalAmount.intValueExact()
		));

		MvcResult checkoutResult = mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "deliveryType": "DELIVERY",
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isOk())
				.andReturn();

		var checkoutJson = objectMapper.readTree(checkoutResult.getResponse().getContentAsString());
		assertThat(checkoutJson.path("shippingDistanceKm").decimalValue()).isEqualByComparingTo(expectedShippingDistanceKm);
		assertThat(checkoutJson.path("shippingFeeAmount").decimalValue()).isEqualByComparingTo(expectedShippingFeeAmount);
		assertThat(checkoutJson.path("totalAmount").decimalValue()).isEqualByComparingTo(expectedTotalAmount);
		assertThat(checkoutJson.path("paymentCheckoutUrl").asText()).isEqualTo("https://pay.payos.vn/web/plink-shipping");
		assertThat(checkoutJson.path("paymentQrCode").asText()).isEqualTo("qr-shipping");
		assertThat(checkoutJson.path("orders")).hasSize(1);
		assertThat(checkoutJson.path("orders").get(0).path("shippingDistanceKm").decimalValue()).isEqualByComparingTo(expectedShippingDistanceKm);
		assertThat(checkoutJson.path("orders").get(0).path("shippingFeeAmount").decimalValue()).isEqualByComparingTo(expectedShippingFeeAmount);

		Long orderId = extractId(checkoutResult);

		MvcResult orderDetailResult = mockMvc.perform(get("/api/user/orders/{id}", orderId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andReturn();

		var orderDetailJson = objectMapper.readTree(orderDetailResult.getResponse().getContentAsString());
		assertThat(orderDetailJson.path("shippingDistanceKm").decimalValue()).isEqualByComparingTo(expectedShippingDistanceKm);
		assertThat(orderDetailJson.path("shippingFeeAmount").decimalValue()).isEqualByComparingTo(expectedShippingFeeAmount);
		assertThat(orderDetailJson.path("shippingFeeBreakdown")).hasSize(1);
		assertThat(orderDetailJson.path("shippingFeeBreakdown").get(0).path("storeName").asText()).isEqualTo(store.getName());
	}

	@Test
	void checkoutPromotesSelectedDeliveryAddressToPrimaryAndVerified() throws Exception {
		User buyerUser = saveUser("Primary Buyer", "primary-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveStoreDish(store, dish, 10, true, new BigDecimal("68000"));

		com.example.registrationotp.model.UserDeliveryAddress oldPrimaryAddress = saveDeliveryAddress(
				buyerUser,
				"Old Primary",
				"0900000001",
				"1 Nguyen Hue, Quan 1"
		);
		oldPrimaryAddress.setPrimaryAddress(true);
		userDeliveryAddressRepository.save(oldPrimaryAddress);

		com.example.registrationotp.model.UserDeliveryAddress selectedAddress = saveDeliveryAddress(
				buyerUser,
				"Selected Address",
				"0900000002",
				"88 Le Loi, Quan 1"
		);

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(selectedAddress.getId())))
				.andExpect(status().isOk());

		com.example.registrationotp.model.UserDeliveryAddress refreshedSelectedAddress = userDeliveryAddressRepository.findById(selectedAddress.getId())
				.orElseThrow();
		com.example.registrationotp.model.UserDeliveryAddress refreshedOldPrimaryAddress = userDeliveryAddressRepository.findById(oldPrimaryAddress.getId())
				.orElseThrow();

		assertThat(refreshedSelectedAddress.isPrimaryAddress()).isTrue();
		assertThat(refreshedSelectedAddress.getVerifiedAt()).isNotNull();
		assertThat(refreshedSelectedAddress.getLastUsedAt()).isNotNull();
		assertThat(refreshedOldPrimaryAddress.isPrimaryAddress()).isFalse();

		mockMvc.perform(get("/api/user/delivery-addresses/primary")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(selectedAddress.getId()))
				.andExpect(jsonPath("$.primary").value(true))
				.andExpect(jsonPath("$.verified").value(true));
	}

	@Test
	void adminCanToggleUserVerificationStatus() throws Exception {
		User adminUser = saveUser("System Admin", "admin-verify@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User targetUser = saveUser("Verify Me", "verify-me@example.com", Role.USER, true);
		String targetToken = createSession(targetUser);

		mockMvc.perform(put("/api/admin/users/{id}/verification", targetUser.getId())
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "verified": false
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.enabled").value(false))
				.andExpect(jsonPath("$.verified").value(false))
				.andExpect(jsonPath("$.verifiedAt").value(nullValue()));

		assertThat(userSessionRepository.findByToken(targetToken)).isEmpty();

		mockMvc.perform(put("/api/admin/users/{id}/verification", targetUser.getId())
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "verified": true
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.enabled").value(true))
				.andExpect(jsonPath("$.verified").value(true))
				.andExpect(jsonPath("$.verifiedAt").isNotEmpty());
	}

	@Test
	void adminPromotionCrudSupportsFrontendAliasFields() throws Exception {
		User adminUser = saveUser("Promo Admin", "promo-admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		Store store = saveStore("Promo Store", "12 Nguyen Hue", "promo-store@example.com", "0900001234");
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Ceremonial Matcha Latte", category, new BigDecimal("79000"));
		UserLevelDefinition level = saveUserLevelDefinition(store, "VIP", "VIP", new BigDecimal("100000"));

		MvcResult createResult = mockMvc.perform(post("/api/admin/promotions")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "code": "MATCHA-FEST",
								  "name": "Matcha Festival Promo",
								  "description": "Giam gia cho mon matcha trong dip le.",
								  "scope": "DISH",
								  "discountType": "PERCENT",
								  "discountValue": 15,
								  "minimumOrderAmount": 120000,
								  "maximumDiscountAmount": 30000,
								  "minStoreBillAmount": 140000,
								  "promotionDishIds": [%d],
								  "eligibleStoreIds": [%d],
								  "eligibleUserLevelIds": [%d],
								  "active": true
								}
								""".formatted(dish.getId(), store.getId(), level.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.code").value("MATCHA-FEST"))
				.andExpect(jsonPath("$.name").value("Matcha Festival Promo"))
				.andExpect(jsonPath("$.minimumOrderAmount").value(120000))
				.andExpect(jsonPath("$.minOrderAmount").value(120000))
				.andExpect(jsonPath("$.maximumDiscountAmount").value(30000))
				.andExpect(jsonPath("$.maxDiscountAmount").value(30000))
				.andExpect(jsonPath("$.minStoreBillAmount").value(140000))
				.andExpect(jsonPath("$.minCrossStoreBillAmount").value(nullValue()))
				.andExpect(jsonPath("$.promotionDishIds[0]").value(dish.getId()))
				.andExpect(jsonPath("$.applicableDishIds[0]").value(dish.getId()))
				.andExpect(jsonPath("$.eligibleStoreIds[0]").value(store.getId()))
				.andExpect(jsonPath("$.eligibleUserLevelIds[0]").value(level.getId()))
				.andReturn();

		Long promotionId = extractId(createResult);

		mockMvc.perform(get("/api/admin/promotions/{id}", promotionId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(promotionId))
				.andExpect(jsonPath("$.name").value("Matcha Festival Promo"))
				.andExpect(jsonPath("$.minimumOrderAmount").value(120000))
				.andExpect(jsonPath("$.maximumDiscountAmount").value(30000))
				.andExpect(jsonPath("$.minStoreBillAmount").value(140000))
				.andExpect(jsonPath("$.minCrossStoreBillAmount").value(nullValue()))
				.andExpect(jsonPath("$.promotionDishIds[0]").value(dish.getId()));

		mockMvc.perform(put("/api/admin/promotions/{id}", promotionId)
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "code": "MATCHA-FEST",
								  "name": "Matcha Festival Promo Updated",
								  "description": "Cap nhat muc uu dai cho mon matcha.",
								  "scope": "DISH",
								  "discountType": "PERCENT",
								  "discountValue": 20,
								  "minOrderAmount": 150000,
								  "maxDiscountAmount": 40000,
								  "minStoreBillAmount": 180000,
								  "applicableDishIds": [%d],
								  "eligibleStoreIds": [%d],
								  "eligibleUserLevelIds": [%d],
								  "active": true
								}
								""".formatted(dish.getId(), store.getId(), level.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Matcha Festival Promo Updated"))
				.andExpect(jsonPath("$.minimumOrderAmount").value(150000))
				.andExpect(jsonPath("$.minOrderAmount").value(150000))
				.andExpect(jsonPath("$.maximumDiscountAmount").value(40000))
				.andExpect(jsonPath("$.maxDiscountAmount").value(40000))
				.andExpect(jsonPath("$.minStoreBillAmount").value(180000))
				.andExpect(jsonPath("$.minCrossStoreBillAmount").value(nullValue()))
				.andExpect(jsonPath("$.promotionDishIds[0]").value(dish.getId()))
				.andExpect(jsonPath("$.applicableDishIds[0]").value(dish.getId()))
				.andExpect(jsonPath("$.eligibleStoreIds[0]").value(store.getId()))
				.andExpect(jsonPath("$.eligibleUserLevelIds[0]").value(level.getId()));

		mockMvc.perform(get("/api/admin/promotions")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].id").value(promotionId))
				.andExpect(jsonPath("$[0].name").value("Matcha Festival Promo Updated"))
				.andExpect(jsonPath("$[0].promotionDishIds[0]").value(dish.getId()))
				.andExpect(jsonPath("$[0].eligibleStoreIds[0]").value(store.getId()))
				.andExpect(jsonPath("$[0].eligibleUserLevelIds[0]").value(level.getId()));
	}

	@Test
	void checkoutCanApplyDishScopedPromotionOnlyToEligibleItems() throws Exception {
		User buyerUser = saveUser("Dish Promo Buyer", "dish-promo@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveSignatureCategory();
		Dish matchaDish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		Dish hojichaDish = saveDish("Hojicha Latte", category, new BigDecimal("55000"));
		saveStoreDish(store, matchaDish, 10, true, new BigDecimal("68000"));
		saveStoreDish(store, hojichaDish, 10, true, new BigDecimal("57000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);
		Promotion promotion = savePromotion(
				"MATCHADISH10",
				PromotionScope.DISH,
				PromotionDiscountType.PERCENT,
				new BigDecimal("10"),
				List.of(matchaDish.getId())
		);

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), matchaDish.getId())))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), hojichaDish.getId())))
				.andExpect(status().isOk());

		when(payOsClient.createPaymentLink(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentLinkData(
				"plink-dish-promo",
				"https://pay.payos.vn/web/plink-dish-promo",
				"qr-dish-promo",
				"PENDING",
				1L,
				118200
		));

		mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "promotionCode": "MATCHADISH10",
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.promotionCode").value("MATCHADISH10"))
				.andExpect(jsonPath("$.orders", hasSize(1)))
				.andExpect(jsonPath("$.orders[0].promotionScope").value("DISH"))
				.andExpect(jsonPath("$.orders[0].promotionEligibleAmount").value(68000))
				.andExpect(jsonPath("$.orders[0].promotionDishIds", hasSize(1)))
				.andExpect(jsonPath("$.orders[0].promotionDishIds[0]").value(matchaDish.getId()))
				.andExpect(jsonPath("$.subtotalAmount").value(125000))
				.andExpect(jsonPath("$.discountAmount").value(6800))
				.andExpect(jsonPath("$.totalAmount").value(118200));

		assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isEqualTo(1);
	}

	@Test
	void checkoutRejectsPromotionWhenCartContainsMultipleStores() throws Exception {
		User buyerUser = saveUser("Split Buyer", "split@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store firstStore = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store1@example.com", "0900000000");
		Store secondStore = saveStore("Riverside Matcha House", "88 Le Loi", "store2@example.com", "0911111111");
		Category signatureCategory = saveSignatureCategory();
		Dish firstDish = saveDish("Iced Matcha Latte", signatureCategory, new BigDecimal("65000"));
		Dish secondDish = saveDish("Hojicha Latte", signatureCategory, new BigDecimal("55000"));
		saveStoreDish(firstStore, firstDish, 10, true, new BigDecimal("68000"));
		saveStoreDish(secondStore, secondDish, 10, true, new BigDecimal("57000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);
		Promotion promotion = savePromotion("MATCHA10", PromotionScope.ORDER, PromotionDiscountType.PERCENT, new BigDecimal("10"));
		promotion.setEligibleStoreIds(List.of(firstStore.getId(), secondStore.getId()));
		promotion = promotionRepository.save(promotion);

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(firstStore.getId(), firstDish.getId())))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(secondStore.getId(), secondDish.getId())))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "promotionCode": "MATCHA10",
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Promotion code can only be applied to one store bill per checkout"));

		assertThat(orderRepository.findAllByUserId(buyerUser.getId())).isEmpty();
		assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isZero();
	}

	@Test
	void checkoutRejectsPromotionWhenOrderContainsStoreSpecialtyDish() throws Exception {
		User buyerUser = saveUser("Mixed Promo Buyer", "mixed-promo@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Promo Guard Store", "45 Nguyen Hue", "promo-guard@example.com", "0900005678");
		Category signatureCategory = saveSignatureCategory();
		Category localCategory = saveCategory("Local Special", store);
		Dish signatureDish = saveDish("Cloud Matcha", signatureCategory, new BigDecimal("65000"));
		Dish localDish = saveDish("Store Coconut Matcha", localCategory, new BigDecimal("55000"));
		saveStoreDish(store, signatureDish, 10, true, new BigDecimal("68000"));
		saveStoreDish(store, localDish, 10, true, new BigDecimal("57000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);
		savePromotion("MATCHA10", PromotionScope.ORDER, PromotionDiscountType.PERCENT, new BigDecimal("10"));

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), signatureDish.getId())))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), localDish.getId())))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "promotionCode": "MATCHA10",
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Promotion code only applies to SIGNATURE dishes and cannot be used with store specialty dishes"));
	}

	@Test
	void adminCanManageUserLevelsAndUserCanViewCurrentStoreLevel() throws Exception {
		User adminUser = saveUser("Level Admin", "level-admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User buyerUser = saveUser("Level Buyer", "level-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Level Store", "12 Nguyen Hue", "level-store@example.com", "0900001234");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Cloud Matcha", category, new BigDecimal("65000"));
		Instant previousQuarterPaidAt = instantInPreviousQuarter();
		savePaidOrderWithItemAt(buyerUser, store, dish, 2, new BigDecimal("90000"), OrderStatus.COMPLETED, previousQuarterPaidAt);
		savePaidOrderWithItemAt(buyerUser, store, dish, 1, new BigDecimal("140000"), OrderStatus.COMPLETED, previousQuarterPaidAt.plusSeconds(86400));

		MvcResult bronzeResult = mockMvc.perform(post("/api/admin/user-levels")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "code": "BRONZE",
								  "name": "Bronze",
								  "minPaidAmount": 100000,
								  "active": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.storeId").value(store.getId()))
				.andExpect(jsonPath("$.code").value("BRONZE"))
				.andReturn();

		Long bronzeId = extractId(bronzeResult);

		MvcResult silverResult = mockMvc.perform(post("/api/admin/user-levels")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "code": "SILVER",
								  "name": "Silver",
								  "minPaidAmount": 300000,
								  "active": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.code").value("SILVER"))
				.andReturn();

		Long silverId = extractId(silverResult);

		mockMvc.perform(put("/api/admin/user-levels/{id}", bronzeId)
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "code": "BRONZE",
								  "name": "Bronze Member",
								  "minPaidAmount": 100000,
								  "active": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Bronze Member"));

		mockMvc.perform(get("/api/admin/user-levels/{id}", silverId)
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.storeId").value(store.getId()))
				.andExpect(jsonPath("$.code").value("SILVER"));

		mockMvc.perform(get("/api/admin/user-levels")
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(2)));

		mockMvc.perform(get("/api/user/levels/current")
						.header("Authorization", "Bearer " + buyerToken)
						.param("storeId", store.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].storeId").value(store.getId()))
				.andExpect(jsonPath("$[0].qualifyingPaidAmount").value(320000))
				.andExpect(jsonPath("$[0].levelId").value(silverId))
				.andExpect(jsonPath("$[0].levelCode").value("SILVER"))
				.andExpect(jsonPath("$[0].levelName").value("Silver"));
	}

	@Test
	void checkoutCanScheduleDeliveryWhenStoreIsClosedNow() throws Exception {
		User buyerUser = saveUser("Scheduled Buyer", "scheduled@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Night Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Instant scheduledDeliveryAt = configureStoreClosedNowButOpenAtScheduledTime(store);
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveStoreDish(store, dish, 10, true, new BigDecimal("68000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].disabled").value(true))
				.andExpect(jsonPath("$.items[0].schedulable").value(true));

		when(payOsClient.createPaymentLink(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentLinkData(
				"plink-scheduled",
				"https://pay.payos.vn/web/plink-scheduled",
				"qr-scheduled",
				"PENDING",
				1L,
				68000
		));

		MvcResult checkoutResult = mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "deliveryType": "SCHEDULED",
								  "scheduledDeliveryAt": "%s",
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
				""".formatted(deliveryAddress.getId(), scheduledDeliveryAt)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deliveryType").value("SCHEDULED"))
				.andExpect(jsonPath("$.scheduledDeliveryAt", startsWith(scheduledDeliveryAt.toString().substring(0, 19))))
				.andExpect(jsonPath("$.paymentStatus").value("PENDING"))
				.andReturn();

		Long orderId = extractId(checkoutResult);

		mockMvc.perform(get("/api/user/orders/{id}", orderId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deliveryType").value("SCHEDULED"))
				.andExpect(jsonPath("$.scheduledDeliveryAt", startsWith(scheduledDeliveryAt.toString().substring(0, 19))));
	}

	@Test
	void checkoutRejectsImmediateDeliveryWhenStoreIsClosedNow() throws Exception {
		User buyerUser = saveUser("Immediate Buyer", "immediate@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Night Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		configureStoreClosedNowButOpenAtScheduledTime(store);
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveStoreDish(store, dish, 10, true, new BigDecimal("68000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].schedulable").value(true));

		mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "deliveryType": "IMMEDIATE",
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Store is currently closed. Choose deliveryType SCHEDULED with a delivery time inside operating hours"));
	}

	@Test
	void refreshPaymentStatusCanMarkOrderAsPaid() throws Exception {
		User buyerUser = saveUser("Refresh Buyer", "refresh@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveSignatureCategory();
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveStoreDish(store, dish, 10, true, new BigDecimal("68000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk());

		when(payOsClient.createPaymentLink(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentLinkData(
				"plink-456",
				"https://pay.payos.vn/web/plink-456",
				"qr-456",
				"PENDING",
				1L,
				68000
		));

		MvcResult checkoutResult = mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isOk())
				.andReturn();

		Long orderId = extractId(checkoutResult);

		when(payOsClient.getPaymentStatus(any())).thenReturn(new com.example.registrationotp.dto.PayOsPaymentStatusResponse(
				"plink-456",
				orderId,
				68000,
				68000,
				0,
				"PAID"
		));

		mockMvc.perform(post("/api/user/orders/{id}/refresh-payment", orderId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PAID"))
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.paymentReference").value("plink-456"))
				.andExpect(jsonPath("$.paymentCheckoutUrl").value(nullValue()))
				.andExpect(jsonPath("$.paymentQrCode").value(nullValue()))
				.andExpect(jsonPath("$.paymentExpiresAt").value(nullValue()))
				.andExpect(jsonPath("$.statusSummary").value("Cho cua hang xac nhan"));

		verify(emailSender).sendPaymentSuccessEmail(
				eq("refresh@example.com"),
				eq("Refresh Buyer"),
				eq(orderId),
				any(BigDecimal.class)
		);
		assertThat(userRepository.findById(buyerUser.getId()).orElseThrow().getCreditPoints()).isEqualTo(68);
	}

	@Test
	void orderDetailHidesExpiredPaymentLinkAndQrData() throws Exception {
		User buyerUser = saveUser("Expired Buyer", "expired@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));

		Order order = savePendingOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("65000"));
		order.setPayosOrderCode(order.getId());
		order.setPaymentLinkId("plink-expired");
		order.setPaymentReference("plink-expired");
		order.setPaymentCheckoutUrl("https://pay.payos.vn/web/plink-expired");
		order.setPaymentQrCode("qr-expired");
		order.setPaymentExpiresAt(Instant.now().minusSeconds(60));
		orderRepository.save(order);

		mockMvc.perform(get("/api/user/orders/{id}", order.getId())
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PENDING"))
				.andExpect(jsonPath("$.paymentReference").value("plink-expired"))
				.andExpect(jsonPath("$.paymentCheckoutUrl").value(nullValue()))
				.andExpect(jsonPath("$.paymentQrCode").value(nullValue()))
				.andExpect(jsonPath("$.paymentExpiresAt").value(nullValue()));
	}

	@Test
	void managerCanViewStoreOrdersAndUpdateOperationalStatus() throws Exception {
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Store otherStore = saveStore("Other Matcha House", "88 Le Loi", "other@example.com", "0911111111");
		Category category = saveCategory("Latte", store);
		Category otherCategory = saveCategory("Tea", otherStore);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		Dish otherDish = saveDish("Hojicha", otherCategory, new BigDecimal("55000"));

		User managerUser = saveUser("Store Manager", "manager@example.com", Role.MANAGER, true);
		managerUser.setWorkingStore(store);
		userRepository.save(managerUser);
		String managerToken = createSession(managerUser);

		User staffUser = saveUser("Barista A", "staff@example.com", Role.MANAGER, true);
		staffUser.setWorkingStore(store);
		userRepository.save(staffUser);
		String staffToken = createSession(staffUser);

		User shipperUser = saveUser("Shipper B", "shipper@example.com", Role.SHIPPER, true);
		shipperUser.setWorkingStore(store);
		userRepository.save(shipperUser);
		String shipperToken = createSession(shipperUser);

		User buyerUser = saveUser("Buyer User", "buyer@example.com", Role.USER, true);
		Order visibleOrder = savePendingOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("65000"));
		savePendingOrderWithItem(buyerUser, otherStore, otherDish, 1, new BigDecimal("55000"));

		mockMvc.perform(get("/api/admin/orders")
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(visibleOrder.getId()))
				.andExpect(jsonPath("$.items[0].paymentStatus").value("PENDING"))
				.andExpect(jsonPath("$.items[0].status").value("PENDING"))
				.andExpect(jsonPath("$.items[0].statusSummary").value("Cho thanh toan"));

		mockMvc.perform(get("/api/admin/orders")
						.header("Authorization", "Bearer " + managerToken)
						.param("search", "iced matcha latte"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(visibleOrder.getId()));

		mockMvc.perform(get("/api/admin/orders")
						.header("Authorization", "Bearer " + managerToken)
						.param("search", otherStore.getName()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(0)));

		mockMvc.perform(put("/api/admin/orders/{id}/status", visibleOrder.getId())
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "paymentStatus": "PAID"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PAID"))
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.statusSummary").value("Cho cua hang xac nhan"));

		mockMvc.perform(put("/api/admin/orders/{id}/status", visibleOrder.getId())
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "paymentStatus": "PENDING"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PENDING"))
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.statusSummary").value("Cho thanh toan"));

		mockMvc.perform(put("/api/admin/orders/{id}/status", visibleOrder.getId())
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "paymentStatus": "PAID"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PAID"))
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.statusSummary").value("Cho cua hang xac nhan"));

		mockMvc.perform(post("/api/admin/orders/{id}/confirm", visibleOrder.getId())
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CONFIRMED"))
				.andExpect(jsonPath("$.confirmedByUserId").value(managerUser.getId()))
				.andExpect(jsonPath("$.confirmedByUserName").value("Store Manager"))
				.andExpect(jsonPath("$.statusSummary").value("Store Manager da xac nhan don - cho quan ly nhan don"));

		mockMvc.perform(post("/api/employee/orders/{id}/accept-preparing", visibleOrder.getId())
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PREPARING"))
				.andExpect(jsonPath("$.preparingStaffId").value(staffUser.getId()))
				.andExpect(jsonPath("$.preparingStaffName").value("Barista A"))
				.andExpect(jsonPath("$.statusSummary").value("Quan ly Barista A dang xu ly don"));

		mockMvc.perform(post("/api/employee/orders/{id}/mark-ready", visibleOrder.getId())
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("READY_FOR_SHIPPER"))
				.andExpect(jsonPath("$.deliveringShipperId").value(shipperUser.getId()))
				.andExpect(jsonPath("$.deliveringShipperName").value("Shipper B"))
				.andExpect(jsonPath("$.statusSummary").value("Barista A da lam xong - cho shipper"));

		mockMvc.perform(post("/api/employee/orders/{id}/accept-delivery", visibleOrder.getId())
						.header("Authorization", "Bearer " + shipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("OUT_FOR_DELIVERY"))
				.andExpect(jsonPath("$.deliveringShipperId").value(shipperUser.getId()))
				.andExpect(jsonPath("$.deliveringShipperName").value("Shipper B"))
				.andExpect(jsonPath("$.statusSummary").value("Shipper B dang giao hang"));

		mockMvc.perform(post("/api/employee/orders/{id}/complete-delivery", visibleOrder.getId())
						.header("Authorization", "Bearer " + shipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("COMPLETED"))
				.andExpect(jsonPath("$.statusSummary").value("Shipper B da giao hang thanh cong"));
	}

	@Test
	void managerCannotDirectlyUpdateOperationalStatusOutsideEmployeeWorkflow() throws Exception {
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));

		User managerUser = saveUser("Store Manager", "manager-lite@example.com", Role.MANAGER, true);
		managerUser.setWorkingStore(store);
		userRepository.save(managerUser);
		String managerToken = createSession(managerUser);

		User buyerUser = saveUser("Buyer User", "buyer-lite@example.com", Role.USER, true);
		Order order = savePendingOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("65000"));

		mockMvc.perform(put("/api/admin/orders/{id}/status", order.getId())
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "status": "PREPARING"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Admin or Manager can only confirm or cancel orders directly"));

		mockMvc.perform(put("/api/admin/orders/{id}/status", order.getId())
						.header("Authorization", "Bearer " + managerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "status": "OUT_FOR_DELIVERY"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Admin or Manager can only confirm or cancel orders directly"));
	}

	@Test
	void paidOrderCanFlowFromStaffAcceptanceToShipperDeliveryWithEmployeeNotifications() throws Exception {
		User adminUser = saveUser("System Admin", "employee-order-admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User buyerUser = saveUser("Employee Flow Buyer", "employee-order-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);

		Store store = saveStore("District 1 Tea Matcha", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveCategory("Signature Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));

		User staffUser = saveUser("Barista A", "employee-flow-staff@example.com", Role.MANAGER, true);
		staffUser.setWorkingStore(store);
		userRepository.save(staffUser);
		String staffToken = createSession(staffUser);

		User shipperUser = saveUser("Shipper B", "employee-flow-shipper@example.com", Role.SHIPPER, true);
		shipperUser.setWorkingStore(store);
		userRepository.save(shipperUser);
		String shipperToken = createSession(shipperUser);

		Order order = savePendingOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("65000"));

		mockMvc.perform(put("/api/admin/orders/{id}/status", order.getId())
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "paymentStatus": "PAID"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PAID"))
				.andExpect(jsonPath("$.status").value("PENDING"));

		mockMvc.perform(post("/api/admin/orders/{id}/confirm", order.getId())
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CONFIRMED"));

		mockMvc.perform(get("/api/employee/notifications/unread-count")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(1));

		mockMvc.perform(get("/api/employee/notifications")
						.header("Authorization", "Bearer " + staffToken)
						.param("read", "false"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].type").value("ORDER_TASK"))
				.andExpect(jsonPath("$.items[0].relatedOrderId").value(order.getId()))
				.andExpect(jsonPath("$.items[0].actionUrl").value("/employee/orders/" + order.getId()));

		mockMvc.perform(get("/api/employee/orders")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].id").value(order.getId()))
				.andExpect(jsonPath("$.items[0].status").value("CONFIRMED"));

		mockMvc.perform(post("/api/employee/orders/{id}/accept-preparing", order.getId())
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(order.getId()))
				.andExpect(jsonPath("$.status").value("PREPARING"))
				.andExpect(jsonPath("$.preparingStaffId").value(staffUser.getId()))
				.andExpect(jsonPath("$.preparingStaffName").value("Barista A"));

		mockMvc.perform(get("/api/employee/orders")
						.header("Authorization", "Bearer " + staffToken)
						.param("mine", "true"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].status").value("PREPARING"));

		mockMvc.perform(post("/api/employee/orders/{id}/mark-ready", order.getId())
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("READY_FOR_SHIPPER"))
				.andExpect(jsonPath("$.deliveringShipperId").value(shipperUser.getId()))
				.andExpect(jsonPath("$.deliveringShipperName").value("Shipper B"));

		mockMvc.perform(get("/api/employee/notifications/unread-count")
						.header("Authorization", "Bearer " + shipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(1));

		mockMvc.perform(get("/api/employee/notifications")
						.header("Authorization", "Bearer " + shipperToken)
						.param("read", "false"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].type").value("ORDER_TASK"))
				.andExpect(jsonPath("$.items[0].relatedOrderId").value(order.getId()))
				.andExpect(jsonPath("$.items[0].actionUrl").value("/employee/orders/" + order.getId()))
				.andExpect(jsonPath("$.items[0].message").value(containsString("den quay nhan don")));

		mockMvc.perform(get("/api/employee/orders")
						.header("Authorization", "Bearer " + shipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].status").value("READY_FOR_SHIPPER"));

		mockMvc.perform(post("/api/employee/orders/{id}/accept-delivery", order.getId())
						.header("Authorization", "Bearer " + shipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("OUT_FOR_DELIVERY"))
				.andExpect(jsonPath("$.deliveringShipperId").value(shipperUser.getId()))
				.andExpect(jsonPath("$.deliveringShipperName").value("Shipper B"));

		mockMvc.perform(post("/api/employee/orders/{id}/complete-delivery", order.getId())
						.header("Authorization", "Bearer " + shipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("COMPLETED"))
				.andExpect(jsonPath("$.statusSummary").value("Shipper B da giao hang thanh cong"));

		mockMvc.perform(get("/api/user/notifications")
						.header("Authorization", "Bearer " + buyerToken)
						.param("read", "false"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[*].relatedOrderId", hasItems(order.getId().intValue())));
	}

	@Test
	void readyOrderAutoAssignsIdleShipperAndNotifiesOnlyThatShipper() throws Exception {
		User adminUser = saveUser("System Admin", "auto-shipper-admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User buyerUser = saveUser("Auto Shipper Buyer", "auto-shipper-buyer@example.com", Role.USER, true);

		Store store = saveStore("District 3 Tea Matcha", "45 Vo Van Tan", "district3@example.com", "0900001111");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Hot Matcha Latte", category, new BigDecimal("70000"));

		User managerUser = saveUser("Manager Auto", "auto-manager@example.com", Role.MANAGER, true);
		managerUser.setWorkingStore(store);
		managerUser = userRepository.save(managerUser);
		String managerToken = createSession(managerUser);

		User busyShipper = saveUser("Busy Shipper", "busy-shipper@example.com", Role.SHIPPER, true);
		busyShipper.setWorkingStore(store);
		busyShipper = userRepository.save(busyShipper);
		String busyShipperToken = createSession(busyShipper);

		User idleShipper = saveUser("Idle Shipper", "idle-shipper@example.com", Role.SHIPPER, true);
		idleShipper.setWorkingStore(store);
		idleShipper = userRepository.save(idleShipper);
		String idleShipperToken = createSession(idleShipper);

		Order busyOrder = savePendingOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("70000"));
		busyOrder.setPaymentStatus(PaymentStatus.PAID);
		busyOrder.setPaidAt(Instant.now());
		busyOrder.setStatus(OrderStatus.OUT_FOR_DELIVERY);
		busyOrder.setDeliveringShipper(busyShipper);
		orderRepository.save(busyOrder);

		Order targetOrder = savePendingOrderWithItem(buyerUser, store, dish, 1, new BigDecimal("70000"));

		mockMvc.perform(put("/api/admin/orders/{id}/status", targetOrder.getId())
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "paymentStatus": "PAID"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PAID"));

		mockMvc.perform(post("/api/admin/orders/{id}/confirm", targetOrder.getId())
						.header("Authorization", "Bearer " + adminToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CONFIRMED"));

		mockMvc.perform(post("/api/employee/orders/{id}/accept-preparing", targetOrder.getId())
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PREPARING"));

		mockMvc.perform(post("/api/employee/orders/{id}/mark-ready", targetOrder.getId())
						.header("Authorization", "Bearer " + managerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("READY_FOR_SHIPPER"))
				.andExpect(jsonPath("$.deliveringShipperId").value(idleShipper.getId()))
				.andExpect(jsonPath("$.deliveringShipperName").value("Idle Shipper"));

		mockMvc.perform(get("/api/employee/notifications/unread-count")
						.header("Authorization", "Bearer " + busyShipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(0));

		mockMvc.perform(get("/api/employee/notifications/unread-count")
						.header("Authorization", "Bearer " + idleShipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(1));

		mockMvc.perform(get("/api/employee/notifications")
						.header("Authorization", "Bearer " + idleShipperToken)
						.param("read", "false"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].relatedOrderId").value(targetOrder.getId()))
				.andExpect(jsonPath("$.items[0].message").value(containsString("den quay nhan don")));
	}

	@Test
	void userCanReceiveAndManageNotificationsForEventsAndOrders() throws Exception {
		User adminUser = saveUser("System Admin", "notify-admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User buyerUser = saveUser("Notify Buyer", "notify-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);

		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");
		Category category = saveCategory("Latte", store);
		Dish dish = saveDish("Iced Matcha Latte", category, new BigDecimal("65000"));
		saveStoreDish(store, dish, 10, true, new BigDecimal("68000"));
		com.example.registrationotp.model.UserDeliveryAddress deliveryAddress = saveDeliveryAddress(
				buyerUser,
				"Nguyen Quang Truong",
				"0901234567",
				"12 Nguyen Hue, Quan 1, TP HCM"
		);

		MvcResult eventResult = mockMvc.perform(post("/api/admin/events")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "name": "Matcha Launch Week",
								  "description": "Seasonal event for new drinks",
								  "location": "12 Nguyen Hue",
								  "startsAt": "2026-03-19T10:00:00Z",
								  "endsAt": "2026-03-26T10:00:00Z",
								  "active": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andReturn();

		Long eventId = extractId(eventResult);

		mockMvc.perform(get("/api/user/notifications/unread-count")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(1));

		mockMvc.perform(post("/api/user/cart/items")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "dishId": %d,
								  "quantity": 1
								}
								""".formatted(store.getId(), dish.getId())))
				.andExpect(status().isOk());

		MvcResult checkoutResult = mockMvc.perform(post("/api/user/cart/checkout")
						.header("Authorization", "Bearer " + buyerToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "deliveryAddressId": %d,
								  "returnUrl": "http://localhost:5173/payment/success",
								  "cancelUrl": "http://localhost:5173/payment/cancel"
								}
								""".formatted(deliveryAddress.getId())))
				.andExpect(status().isOk())
				.andReturn();

		Long orderId = extractId(checkoutResult);

		mockMvc.perform(get("/api/user/notifications/unread-count")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(2));

		mockMvc.perform(put("/api/admin/orders/{id}/status", orderId)
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "paymentStatus": "PAID"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paymentStatus").value("PAID"))
				.andExpect(jsonPath("$.status").value("PENDING"));

		mockMvc.perform(get("/api/user/notifications")
						.header("Authorization", "Bearer " + buyerToken)
						.param("read", "false"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(3)))
				.andExpect(jsonPath("$.items[*].type", hasItems("BRAND_EVENT", "ORDER_STATUS")))
				.andExpect(jsonPath("$.items[*].relatedEventId", hasItems(eventId.intValue())))
				.andExpect(jsonPath("$.items[*].relatedOrderId", hasItems(orderId.intValue())))
				.andExpect(jsonPath("$.items[*].eventId", hasItems(eventId.intValue())))
				.andExpect(jsonPath("$.items[*].relatedEventSlug", hasItems("matcha-launch-week")))
				.andExpect(jsonPath("$.items[*].eventSlug", hasItems("matcha-launch-week")))
				.andExpect(jsonPath("$.items[*].orderId", hasItems(orderId.intValue())))
				.andExpect(jsonPath("$.items[?(@.relatedEventId==" + eventId + ")].actionUrl").value(hasItems("/events/matcha-launch-week")))
				.andExpect(jsonPath("$.items[?(@.relatedOrderId==" + orderId + ")].actionUrl").value(hasItems("/orders/" + orderId)));

		mockMvc.perform(get("/api/user/notifications/unread-count")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(3));

		Long eventNotificationId = userNotificationRepository.findAll().stream()
				.filter(notification -> notification.getUser().getId().equals(buyerUser.getId()))
				.filter(notification -> notification.getRelatedEventId() != null && notification.getRelatedEventId().equals(eventId))
				.map(com.example.registrationotp.model.UserNotification::getId)
				.findFirst()
				.orElseThrow();

		mockMvc.perform(put("/api/user/notifications/{id}/read", eventNotificationId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(eventNotificationId))
				.andExpect(jsonPath("$.read").value(true))
				.andExpect(jsonPath("$.relatedEventId").value(eventId))
				.andExpect(jsonPath("$.relatedEventSlug").value("matcha-launch-week"))
				.andExpect(jsonPath("$.eventSlug").value("matcha-launch-week"))
				.andExpect(jsonPath("$.actionUrl").value("/events/matcha-launch-week"));

		mockMvc.perform(put("/api/user/notifications/{id}/unread", eventNotificationId)
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(eventNotificationId))
				.andExpect(jsonPath("$.read").value(false))
				.andExpect(jsonPath("$.readAt").value(nullValue()));

		mockMvc.perform(put("/api/user/notifications/read-all")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value(containsString("Marked 3 notification(s) as read")));

		mockMvc.perform(get("/api/user/notifications/unread-count")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(0));
	}

	@Test
	void userReceivesNewsNotificationOnlyWhenArticleBecomesPublic() throws Exception {
		User adminUser = saveUser("System Admin", "notify-news-admin@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);
		User buyerUser = saveUser("Notify News Buyer", "notify-news-buyer@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);
		Store store = saveStore("Downtown Matcha House", "12 Nguyen Hue", "store@example.com", "0900000000");

		MvcResult draftNewsResult = mockMvc.perform(post("/api/admin/news")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Matcha Guide Thang 4",
								  "summary": "Ban nhap se duoc publish sau.",
								  "content": "Noi dung ban dau chua public.",
								  "relatedStoreId": %d,
								  "tags": ["guide", "matcha"],
								  "imagePaths": ["/uploads/news/matcha-guide.jpg"],
								  "featured": false,
								  "published": false
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.published").value(false))
				.andReturn();

		Long newsId = extractId(draftNewsResult);

		mockMvc.perform(get("/api/user/notifications/unread-count")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(0));

		mockMvc.perform(put("/api/admin/news/{id}", newsId)
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Matcha Guide Thang 4",
								  "summary": "Bai viet da san sang cho khach hang doc.",
								  "content": "Huong dan pha matcha va goi y thuc don thang 4.",
								  "relatedStoreId": %d,
								  "tags": ["guide", "matcha", "thang-4"],
								  "imagePaths": ["/uploads/news/matcha-guide.jpg"],
								  "featured": true,
								  "published": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.published").value(true))
				.andExpect(jsonPath("$.slug").value("matcha-guide-thang-4"));

		mockMvc.perform(get("/api/user/notifications")
						.header("Authorization", "Bearer " + buyerToken)
						.param("read", "false"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].type").value("NEWS_ARTICLE"))
				.andExpect(jsonPath("$.items[0].relatedNewsId").value(newsId))
				.andExpect(jsonPath("$.items[0].newsId").value(newsId))
				.andExpect(jsonPath("$.items[0].relatedNewsSlug").value("matcha-guide-thang-4"))
				.andExpect(jsonPath("$.items[0].newsSlug").value("matcha-guide-thang-4"))
				.andExpect(jsonPath("$.items[0].relatedStoreId").value(store.getId()))
				.andExpect(jsonPath("$.items[0].relatedStoreName").value(store.getName()))
				.andExpect(jsonPath("$.items[0].actionUrl").value("/news/matcha-guide-thang-4"));

		mockMvc.perform(put("/api/admin/news/{id}", newsId)
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "title": "Matcha Guide Thang 4",
								  "summary": "Cap nhat noi dung bai viet da public.",
								  "content": "Cap nhat them tips pha che nhung khong tao notification moi.",
								  "relatedStoreId": %d,
								  "tags": ["guide", "matcha", "updated"],
								  "imagePaths": ["/uploads/news/matcha-guide.jpg"],
								  "featured": true,
								  "published": true
								}
								""".formatted(store.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.published").value(true));

		mockMvc.perform(get("/api/user/notifications/unread-count")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.unreadCount").value(1));
	}

	@Test
	void adminCanAssignMonthlyWorkSchedulesAndEmployeesCanViewThem() throws Exception {
		LocalDate today = LocalDate.now();
		YearMonth month = YearMonth.from(today);
		LocalDate anotherWorkDate = today.getDayOfMonth() == month.lengthOfMonth()
				? today.minusDays(1)
				: today.plusDays(1);
		Store store = saveStore("Attendance Store", "45 Nguyen Hue", "attendance@example.com", "0900000001");

		User adminUser = saveUser("Admin User", "admin-schedule@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		User staffUser = saveUser("Store Staff", "staff-attendance@example.com", Role.MANAGER, true);
		staffUser.setWorkingStore(store);
		staffUser = userRepository.save(staffUser);
		String staffToken = createSession(staffUser);

		User shipperUser = saveUser("Store Shipper", "shipper-attendance@example.com", Role.SHIPPER, true);
		shipperUser.setWorkingStore(store);
		shipperUser = userRepository.save(shipperUser);
		String shipperToken = createSession(shipperUser);

		mockMvc.perform(put("/api/admin/work-schedules/monthly")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "month": "%s",
								  "entries": [
								    {
								      "userId": %d,
								      "workDate": "%s",
								      "scheduledStartTime": "08:00:00",
								      "scheduledEndTime": "17:00:00",
								      "note": "Ca sang"
								    },
								    {
								      "userId": %d,
								      "workDate": "%s",
								      "scheduledStartTime": "09:00:00",
								      "scheduledEndTime": "18:00:00",
								      "note": "Ca giao hang"
								    },
								    {
								      "userId": %d,
								      "workDate": "%s",
								      "scheduledStartTime": "13:00:00",
								      "scheduledEndTime": "21:00:00",
								      "note": "Ca toi"
								    }
								  ]
								}
								""".formatted(
								store.getId(),
								month,
								staffUser.getId(),
								today,
								shipperUser.getId(),
								today,
								staffUser.getId(),
								anotherWorkDate
						)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.month").value(month.toString()))
				.andExpect(jsonPath("$.storeId").value(store.getId()))
				.andExpect(jsonPath("$.items", hasSize(3)))
				.andExpect(jsonPath("$.items[0].userId").value(staffUser.getId()))
				.andExpect(jsonPath("$.items[0].workDate").value(today.toString()))
				.andExpect(jsonPath("$.items[0].scheduledStartTime").value("08:00:00"))
				.andExpect(jsonPath("$.items[0].scheduledMinutes").value(540))
				.andExpect(jsonPath("$.items[1].userId").value(shipperUser.getId()))
				.andExpect(jsonPath("$.items[1].workDate").value(today.toString()))
				.andExpect(jsonPath("$.items[2].workDate").value(anotherWorkDate.toString()));

		mockMvc.perform(get("/api/admin/work-schedules/monthly")
						.header("Authorization", "Bearer " + adminToken)
						.param("storeId", store.getId().toString())
						.param("month", month.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(3)))
				.andExpect(jsonPath("$.items[0].fullName").value("Store Staff"))
				.andExpect(jsonPath("$.items[1].fullName").value("Store Shipper"));

		mockMvc.perform(get("/api/employee/work-schedules/today")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value(staffUser.getId()))
				.andExpect(jsonPath("$.role").value("MANAGER"))
				.andExpect(jsonPath("$.workDate").value(today.toString()))
				.andExpect(jsonPath("$.scheduledStartTime").value("08:00:00"))
				.andExpect(jsonPath("$.scheduledEndTime").value("17:00:00"))
				.andExpect(jsonPath("$.checkedIn").value(false));

		mockMvc.perform(get("/api/employee/work-schedules/monthly")
						.header("Authorization", "Bearer " + staffToken)
						.param("month", month.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(2)))
				.andExpect(jsonPath("$.items[0].workDate").value(today.toString()))
				.andExpect(jsonPath("$.items[1].workDate").value(anotherWorkDate.toString()));

		mockMvc.perform(get("/api/employee/work-schedules/monthly")
						.header("Authorization", "Bearer " + shipperToken)
						.param("month", month.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].role").value("SHIPPER"))
				.andExpect(jsonPath("$.items[0].scheduledStartTime").value("09:00:00"));
	}

	@Test
	void staffAndShipperCanCheckInOutAndViewOwnAttendance() throws Exception {
		LocalDate today = LocalDate.now();
		YearMonth month = YearMonth.from(today);
		Store store = saveStore("Attendance Store", "45 Nguyen Hue", "attendance@example.com", "0900000001");

		User adminUser = saveUser("Admin User", "admin-attendance@example.com", Role.ADMIN, true);
		String adminToken = createSession(adminUser);

		User staffUser = saveUser("Store Staff", "staff-attendance@example.com", Role.MANAGER, true);
		staffUser.setWorkingStore(store);
		staffUser = userRepository.save(staffUser);
		String staffToken = createSession(staffUser);

		User shipperUser = saveUser("Store Shipper", "shipper-attendance@example.com", Role.SHIPPER, true);
		shipperUser.setWorkingStore(store);
		shipperUser = userRepository.save(shipperUser);
		String shipperToken = createSession(shipperUser);

		User buyerUser = saveUser("Buyer User", "buyer-attendance@example.com", Role.USER, true);
		String buyerToken = createSession(buyerUser);

		mockMvc.perform(get("/api/employee/attendance/today")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isNotFound());

		mockMvc.perform(get("/api/employee/work-schedules/today")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Work schedule not found for today"));

		mockMvc.perform(post("/api/employee/attendance/check-in")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("You do not have a work schedule for today"));

		mockMvc.perform(put("/api/admin/work-schedules/monthly")
						.header("Authorization", "Bearer " + adminToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "storeId": %d,
								  "month": "%s",
								  "entries": [
								    {
								      "userId": %d,
								      "workDate": "%s",
								      "scheduledStartTime": "08:00:00",
								      "scheduledEndTime": "17:00:00",
								      "note": "Ca staff"
								    },
								    {
								      "userId": %d,
								      "workDate": "%s",
								      "scheduledStartTime": "09:00:00",
								      "scheduledEndTime": "18:00:00",
								      "note": "Ca shipper"
								    }
								  ]
								}
								""".formatted(
								store.getId(),
								month,
								staffUser.getId(),
								today,
								shipperUser.getId(),
								today
						)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(2)));

		mockMvc.perform(get("/api/employee/work-schedules/today")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.scheduledStartTime").value("08:00:00"))
				.andExpect(jsonPath("$.scheduledEndTime").value("17:00:00"))
				.andExpect(jsonPath("$.checkedIn").value(false));

		mockMvc.perform(post("/api/employee/attendance/check-in")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("MANAGER"))
				.andExpect(jsonPath("$.storeId").value(store.getId()))
				.andExpect(jsonPath("$.workDate").value(today.toString()))
				.andExpect(jsonPath("$.scheduledStartTime").value("08:00:00"))
				.andExpect(jsonPath("$.scheduledEndTime").value("17:00:00"))
				.andExpect(jsonPath("$.workScheduleId").isNumber())
				.andExpect(jsonPath("$.role").value("MANAGER"))
				.andExpect(jsonPath("$.checkedIn").value(true))
				.andExpect(jsonPath("$.checkedOut").value(false))
				.andExpect(jsonPath("$.currentlyWorking").value(true));

		mockMvc.perform(post("/api/employee/attendance/check-in")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("You have already checked in and not checked out yet"));

		mockMvc.perform(get("/api/employee/attendance/today")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("MANAGER"))
				.andExpect(jsonPath("$.scheduledStartTime").value("08:00:00"))
				.andExpect(jsonPath("$.currentlyWorking").value(true));

		mockMvc.perform(post("/api/employee/attendance/check-out")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.checkedOut").value(true))
				.andExpect(jsonPath("$.currentlyWorking").value(false))
				.andExpect(jsonPath("$.workDate").value(today.toString()));

		mockMvc.perform(post("/api/employee/attendance/check-out")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("You have not checked in yet"));

		mockMvc.perform(get("/api/employee/attendance/history")
						.header("Authorization", "Bearer " + staffToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(1)))
				.andExpect(jsonPath("$.items[0].role").value("MANAGER"))
				.andExpect(jsonPath("$.items[0].storeId").value(store.getId()))
				.andExpect(jsonPath("$.items[0].scheduledStartTime").value("08:00:00"))
				.andExpect(jsonPath("$.items[0].checkedOut").value(true));

		mockMvc.perform(post("/api/employee/attendance/check-in")
						.header("Authorization", "Bearer " + shipperToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("SHIPPER"))
				.andExpect(jsonPath("$.storeId").value(store.getId()))
				.andExpect(jsonPath("$.scheduledStartTime").value("09:00:00"));

		mockMvc.perform(post("/api/employee/attendance/check-in")
						.header("Authorization", "Bearer " + buyerToken))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Only STAFF and SHIPPER accounts can use attendance"));
	}

	@Test
	void managerCanListStoreAttendanceAndViewSummaryByOwnStoreOnly() throws Exception {
		LocalDate today = LocalDate.now();
		Instant now = Instant.now();

		Store managedStore = saveStore("Managed Store", "10 Le Loi", "managed@example.com", "0900000002");
		Store otherStore = saveStore("Other Store", "99 Hai Ba Trung", "other@example.com", "0900000003");

		User managerUser = saveUser("Store Manager", "manager-attendance@example.com", Role.MANAGER, true);
		managerUser.setWorkingStore(managedStore);
		managerUser = userRepository.save(managerUser);
		String managerToken = createSession(managerUser);

		User staffUser = saveUser("Managed Staff", "managed-staff@example.com", Role.MANAGER, true);
		staffUser.setWorkingStore(managedStore);
		staffUser = userRepository.save(staffUser);

		User shipperUser = saveUser("Managed Shipper", "managed-shipper@example.com", Role.SHIPPER, true);
		shipperUser.setWorkingStore(managedStore);
		shipperUser = userRepository.save(shipperUser);

		User otherStaffUser = saveUser("Other Staff", "other-staff@example.com", Role.MANAGER, true);
		otherStaffUser.setWorkingStore(otherStore);
		otherStaffUser = userRepository.save(otherStaffUser);

		EmployeeWorkSchedule staffSchedule = saveWorkSchedule(
				staffUser,
				managedStore,
				today,
				LocalTime.of(8, 0),
				LocalTime.of(17, 0),
				"Ca staff"
		);
		EmployeeWorkSchedule shipperSchedule = saveWorkSchedule(
				shipperUser,
				managedStore,
				today,
				LocalTime.of(9, 0),
				LocalTime.of(18, 0),
				"Ca shipper"
		);
		EmployeeWorkSchedule otherStaffSchedule = saveWorkSchedule(
				otherStaffUser,
				otherStore,
				today,
				LocalTime.of(10, 0),
				LocalTime.of(19, 0),
				"Ca store khac"
		);

		saveAttendance(staffUser, managedStore, Role.MANAGER, today, now.minusSeconds(3600), now.minusSeconds(1800), staffSchedule);
		saveAttendance(shipperUser, managedStore, Role.SHIPPER, today, now.minusSeconds(2400), null, shipperSchedule);
		saveAttendance(otherStaffUser, otherStore, Role.MANAGER, today, now.minusSeconds(1200), null, otherStaffSchedule);

		mockMvc.perform(get("/api/admin/attendances")
						.header("Authorization", "Bearer " + managerToken)
						.param("workDate", today.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items", hasSize(2)))
				.andExpect(jsonPath("$.items[*].storeId", hasItems(managedStore.getId().intValue())))
				.andExpect(jsonPath("$.items[*].role", hasItems("MANAGER", "SHIPPER")));

		mockMvc.perform(get("/api/admin/attendances/summary")
						.header("Authorization", "Bearer " + managerToken)
						.param("workDate", today.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.storeId").value(managedStore.getId()))
				.andExpect(jsonPath("$.storeName").value(managedStore.getName()))
				.andExpect(jsonPath("$.totalAssignedEmployees").value(2))
				.andExpect(jsonPath("$.totalAssignedStaff").value(1))
				.andExpect(jsonPath("$.totalAssignedShippers").value(1))
				.andExpect(jsonPath("$.presentCount").value(2))
				.andExpect(jsonPath("$.presentStaffCount").value(1))
				.andExpect(jsonPath("$.presentShipperCount").value(1))
				.andExpect(jsonPath("$.checkedOutCount").value(1))
				.andExpect(jsonPath("$.currentlyWorkingCount").value(1));

		mockMvc.perform(get("/api/admin/attendances")
						.header("Authorization", "Bearer " + managerToken)
						.param("storeId", otherStore.getId().toString()))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Attendance data does not belong to your store"));
	}

	private Instant configureStoreClosedNowButOpenAtScheduledTime(Store store) {
		ZoneId zoneId = ZoneId.systemDefault();
		Instant openAt = Instant.now().plusSeconds(60L * 60L);
		Instant scheduledDeliveryAt = openAt.plusSeconds(60L * 60L);
		Instant closeAt = scheduledDeliveryAt.plusSeconds(60L * 60L);
		store.setOpenTime(openAt.atZone(zoneId).toLocalTime());
		store.setCloseTime(closeAt.atZone(zoneId).toLocalTime());
		storeRepository.save(store);
		return scheduledDeliveryAt;
	}

	private User saveUser(String fullName, String email, Role role, boolean enabled) {
		User user = new User();
		user.setFullName(fullName);
		user.setEmail(email);
		user.setPasswordHash("hashed-value");
		user.setRole(role);
		user.setEnabled(enabled);
		user.setVerifiedAt(enabled ? Instant.now() : null);
		return userRepository.save(user);
	}

	private Store saveStore(String name, String address, String contactEmail, String phoneNumber) {
		return saveStore(name, address, contactEmail, phoneNumber, 10.776889, 106.700806);
	}

	private Store saveStore(
			String name,
			String address,
			String contactEmail,
			String phoneNumber,
			Double latitude,
			Double longitude
	) {
		Store store = new Store();
		store.setName(name);
		store.setSlug(StoreSlugNormalizer.normalize(name));
		store.setDescription(name + " description");
		store.setAddress(address);
		store.setContactEmail(contactEmail);
		store.setPhoneNumber(phoneNumber);
		store.setLatitude(latitude);
		store.setLongitude(longitude);
		store.setImagePaths(List.of());
		store.setActive(true);
		return storeRepository.save(store);
	}

	private EventItem saveEvent(String name, Store store, String location) {
		EventItem eventItem = new EventItem();
		eventItem.setStore(store);
		eventItem.setName(name);
		eventItem.setSlug(EventSlugNormalizer.normalize(name));
		eventItem.setDescription(name + " description");
		eventItem.setLocation(location);
		eventItem.setImagePaths(List.of());
		eventItem.setStartsAt(Instant.parse("2026-03-20T01:00:00Z"));
		eventItem.setEndsAt(Instant.parse("2026-03-21T01:00:00Z"));
		eventItem.setActive(true);
		return eventItemRepository.save(eventItem);
	}

	private Category saveCategory(String name, Store store) {
		Category category = new Category();
		category.setStore(store);
		category.setName(name);
		category.setDescription(name + " description");
		category.setImagePaths(List.of());
		category.setActive(true);
		return categoryRepository.save(category);
	}

	private Category saveSignatureCategory() {
		Category category = new Category();
		category.setStore(null);
		category.setName("SIGNATURE");
		category.setDescription("Signature category");
		category.setImagePaths(List.of());
		category.setActive(true);
		return categoryRepository.save(category);
	}

	private Dish saveDish(String name, Category category, BigDecimal price) {
		Dish dish = new Dish();
		dish.setCategory(category);
		dish.setName(name);
		dish.setDescription(name + " description");
		dish.setPrice(price);
		dish.setImagePaths(List.of());
		dish.setAvailable(true);
		return dishRepository.save(dish);
	}

	private Review saveReview(User user, ReviewTargetType targetType, Long targetId, String title, String comment) {
		Review review = new Review();
		review.setUser(user);
		review.setTargetType(targetType);
		review.setTargetId(targetId);
		review.setRating(5);
		review.setTitle(title);
		review.setComment(comment);
		review.setApproved(true);
		return reviewRepository.save(review);
	}

	private String createSession(User user) {
		UserSession session = new UserSession();
		session.setUser(user);
		session.setToken("token-" + user.getId() + "-" + System.nanoTime());
		session.setExpiresAt(Instant.now().plusSeconds(3600));
		return userSessionRepository.save(session).getToken();
	}

	private String saveSession(User user) {
		return createSession(user);
	}

	private Favorite saveFavorite(User user, FavoriteTargetType targetType, Long targetId) {
		Favorite favorite = new Favorite();
		favorite.setUser(user);
		favorite.setTargetType(targetType);
		favorite.setTargetId(targetId);
		return favoriteRepository.save(favorite);
	}

	private CustomerFeedback saveCustomerFeedback(
			User user,
			FeedbackCategory category,
			Store relatedStore,
			String subject,
			String message
	) {
		CustomerFeedback feedback = new CustomerFeedback();
		feedback.setUser(user);
		feedback.setCategory(category);
		feedback.setRelatedStore(relatedStore);
		feedback.setSubject(subject);
		feedback.setMessage(message);
		return customerFeedbackRepository.save(feedback);
	}

	private StoreDish saveStoreDish(Store store, Dish dish, int quantity, boolean available, BigDecimal priceOverride) {
		StoreDish storeDish = new StoreDish();
		storeDish.setStore(store);
		storeDish.setDish(dish);
		storeDish.setQuantity(quantity);
		storeDish.setAvailable(available);
		storeDish.setPriceOverride(priceOverride);
		return storeDishRepository.save(storeDish);
	}

	private com.example.registrationotp.model.UserDeliveryAddress saveDeliveryAddress(
			User user,
			String fullName,
			String phoneNumber,
			String deliveryAddress
	) {
		return saveDeliveryAddress(user, fullName, phoneNumber, deliveryAddress, 10.776889, 106.700806);
	}

	private com.example.registrationotp.model.UserDeliveryAddress saveDeliveryAddress(
			User user,
			String fullName,
			String phoneNumber,
			String deliveryAddress,
			Double latitude,
			Double longitude
	) {
		com.example.registrationotp.model.UserDeliveryAddress address = new com.example.registrationotp.model.UserDeliveryAddress();
		address.setUser(user);
		address.setFullName(fullName);
		address.setPhoneNumber(phoneNumber);
		address.setDeliveryAddress(deliveryAddress);
		address.setLatitude(latitude);
		address.setLongitude(longitude);
		return userDeliveryAddressRepository.save(address);
	}

	private BigDecimal haversineKm(Double startLat, Double startLng, Double endLat, Double endLng) {
		double dLat = Math.toRadians(endLat - startLat);
		double dLng = Math.toRadians(endLng - startLng);
		double startLatRad = Math.toRadians(startLat);
		double endLatRad = Math.toRadians(endLat);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(startLatRad) * Math.cos(endLatRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return BigDecimal.valueOf(6371.0 * c);
	}

	private EmployeeAttendance saveAttendance(
			User user,
			Store store,
			Role employeeRole,
			LocalDate workDate,
			Instant checkInAt,
			Instant checkOutAt
	) {
		return saveAttendance(user, store, employeeRole, workDate, checkInAt, checkOutAt, null);
	}

	private EmployeeAttendance saveAttendance(
			User user,
			Store store,
			Role employeeRole,
			LocalDate workDate,
			Instant checkInAt,
			Instant checkOutAt,
			EmployeeWorkSchedule workSchedule
	) {
		EmployeeAttendance attendance = new EmployeeAttendance();
		attendance.setUser(user);
		attendance.setStore(store);
		attendance.setWorkSchedule(workSchedule);
		attendance.setEmployeeRole(employeeRole);
		attendance.setWorkDate(workDate);
		attendance.setCheckInAt(checkInAt);
		attendance.setCheckOutAt(checkOutAt);
		return employeeAttendanceRepository.save(attendance);
	}

	private EmployeeWorkSchedule saveWorkSchedule(
			User user,
			Store store,
			LocalDate workDate,
			LocalTime scheduledStartTime,
			LocalTime scheduledEndTime,
			String note
	) {
		EmployeeWorkSchedule schedule = new EmployeeWorkSchedule();
		schedule.setUser(user);
		schedule.setStore(store);
		schedule.setEmployeeRole(user.getRole());
		schedule.setWorkDate(workDate);
		schedule.setScheduledStartTime(scheduledStartTime);
		schedule.setScheduledEndTime(scheduledEndTime);
		schedule.setNote(note);
		return employeeWorkScheduleRepository.save(schedule);
	}

	private Promotion savePromotion(String code, PromotionScope scope, PromotionDiscountType type, BigDecimal discountValue) {
		return savePromotion(code, scope, type, discountValue, List.of());
	}

	private Promotion savePromotion(
			String code,
			PromotionScope scope,
			PromotionDiscountType type,
			BigDecimal discountValue,
			List<Long> applicableDishIds
	) {
		Promotion promotion = new Promotion();
		promotion.setCode(code);
		promotion.setDescription(code + " description");
		promotion.setScope(scope);
		promotion.setDiscountType(type);
		promotion.setDiscountValue(discountValue);
		promotion.setApplicableDishIds(applicableDishIds);
		promotion.setActive(true);
		return promotionRepository.save(promotion);
	}

	private UserLevelDefinition saveUserLevelDefinition(Store store, String code, String name, BigDecimal minPaidAmount) {
		UserLevelDefinition definition = new UserLevelDefinition();
		definition.setStore(store);
		definition.setCode(code);
		definition.setName(name);
		definition.setMinPaidAmount(minPaidAmount);
		definition.setActive(true);
		return userLevelDefinitionRepository.save(definition);
	}

	private Order saveOrderWithItem(User user, Store store, Dish dish, int quantity, BigDecimal unitPrice) {
		Order order = new Order();
		order.setUser(user);
		order.setStatus(OrderStatus.COMPLETED);
		order.setTotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)));
		Order savedOrder = orderRepository.save(order);

		OrderItem orderItem = new OrderItem();
		orderItem.setOrder(savedOrder);
		orderItem.setStore(store);
		orderItem.setDish(dish);
		orderItem.setQuantity(quantity);
		orderItem.setUnitPrice(unitPrice);
		orderItemRepository.save(orderItem);
		return savedOrder;
	}

	private Order savePaidOrderWithItem(User user, Store store, Dish dish, int quantity, BigDecimal unitPrice, OrderStatus status) {
		return savePaidOrderWithItemAt(user, store, dish, quantity, unitPrice, status, Instant.now());
	}

	private Order savePaidOrderWithItemAt(
			User user,
			Store store,
			Dish dish,
			int quantity,
			BigDecimal unitPrice,
			OrderStatus status,
			Instant paidAt
	) {
		Order order = new Order();
		order.setUser(user);
		order.setStatus(status);
		order.setPaymentStatus(PaymentStatus.PAID);
		order.setPaymentProvider("PAYOS");
		order.setPaidAt(paidAt);
		order.setSubtotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)));
		order.setDiscountAmount(BigDecimal.ZERO);
		order.setTotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)));
		Order savedOrder = orderRepository.save(order);

		OrderItem orderItem = new OrderItem();
		orderItem.setOrder(savedOrder);
		orderItem.setStore(store);
		orderItem.setDish(dish);
		orderItem.setQuantity(quantity);
		orderItem.setUnitPrice(unitPrice);
		orderItemRepository.save(orderItem);
		return savedOrder;
	}

	private Instant instantInPreviousQuarter() {
		Instant now = Instant.now();
		var nowUtc = now.atZone(ZoneId.of("UTC"));
		int month = nowUtc.getMonthValue();
		int currentQuarter = ((month - 1) / 3) + 1;
		int currentQuarterStartMonth = ((currentQuarter - 1) * 3) + 1;
		var currentQuarterStart = nowUtc.withMonth(currentQuarterStartMonth)
				.withDayOfMonth(1)
				.withHour(0)
				.withMinute(0)
				.withSecond(0)
				.withNano(0);
		return currentQuarterStart.minusMonths(1).plusDays(5).toInstant();
	}

	private Order savePendingOrderWithItem(User user, Store store, Dish dish, int quantity, BigDecimal unitPrice) {
		Order order = new Order();
		order.setUser(user);
		order.setStatus(OrderStatus.PENDING);
		order.setPaymentStatus(PaymentStatus.PENDING);
		order.setPaymentProvider("PAYOS");
		order.setSubtotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)));
		order.setDiscountAmount(BigDecimal.ZERO);
		order.setTotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)));
		Order savedOrder = orderRepository.save(order);

		OrderItem orderItem = new OrderItem();
		orderItem.setOrder(savedOrder);
		orderItem.setStore(store);
		orderItem.setDish(dish);
		orderItem.setQuantity(quantity);
		orderItem.setUnitPrice(unitPrice);
		orderItemRepository.save(orderItem);
		return savedOrder;
	}

	private Long extractId(MvcResult result) throws Exception {
		Map<String, Object> body = objectMapper.readValue(
				result.getResponse().getContentAsByteArray(),
				new TypeReference<>() {
				}
		);
		return ((Number) body.get("id")).longValue();
	}

	private void cleanUploadDirectory() {
		if (Files.notExists(TEST_UPLOAD_DIR)) {
			return;
		}

		try (var paths = Files.walk(TEST_UPLOAD_DIR)) {
			paths.sorted(Comparator.reverseOrder())
					.forEach(path -> {
						try {
							Files.deleteIfExists(path);
						} catch (IOException exception) {
							throw new RuntimeException(exception);
						}
					});
		} catch (IOException exception) {
			throw new RuntimeException(exception);
		}
	}
}

