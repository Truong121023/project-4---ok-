package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.example.registrationotp.config.OpenAiProperties;
import com.example.registrationotp.dto.AiChatActionResponse;
import com.example.registrationotp.dto.AiChatCurrentUserStatusResponse;
import com.example.registrationotp.dto.AiChatHistoryItem;
import com.example.registrationotp.dto.AiChatMessageResponse;
import com.example.registrationotp.dto.AiChatQueryRequest;
import com.example.registrationotp.dto.AiChatReferenceResponse;
import com.example.registrationotp.dto.AiChatResponse;
import com.example.registrationotp.dto.AiChatThreadDetailResponse;
import com.example.registrationotp.dto.AiChatThreadSummaryResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.AiChatMessage;
import com.example.registrationotp.model.AiChatThread;
import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.CartStatus;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.CartItemRepository;
import com.example.registrationotp.repository.CartRepository;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.NewsArticleRepository;
import com.example.registrationotp.repository.AiChatMessageRepository;
import com.example.registrationotp.repository.AiChatThreadRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.OrderRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class AiChatService {

	private static final Pattern SPLIT_PATTERN = Pattern.compile("[^\\p{L}\\p{Nd}]+");
	private static final Pattern DANGEROUS_HTML_BLOCK_PATTERN = Pattern.compile("(?is)<(script|style|iframe|object|embed|form|button|textarea|select)[^>]*>.*?</\\1>");
	private static final Pattern HTML_TAG_PATTERN = Pattern.compile("(?is)<\\s*(/)?\\s*([a-z0-9]+)(?:\\s+[^>]*)?>");
	private static final Pattern HTML_LINE_BREAK_PATTERN = Pattern.compile("(?i)<br\\s*/?>");
	private static final Pattern HTML_SPACE_PATTERN = Pattern.compile("(?is)</?(section|div|p|h2|h3|ul|ol|li|small)>");
	private static final Set<String> ALLOWED_AI_HTML_TAGS = Set.of(
			"section", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "small", "br", "code"
	);
	private static final Set<String> STOP_WORDS = Set.of(
			"va", "la", "cho", "toi", "cua", "ve", "co", "khong", "nhung", "voi", "mot", "nhieu",
			"hay", "gi", "nao", "the", "can", "muon", "xem", "hoi", "status", "trang", "thai"
	);

	private final SessionAuthService sessionAuthService;
	private final AiChatThreadRepository aiChatThreadRepository;
	private final AiChatMessageRepository aiChatMessageRepository;
	private final StoreRepository storeRepository;
	private final DishRepository dishRepository;
	private final EventItemRepository eventItemRepository;
	private final NewsArticleRepository newsArticleRepository;
	private final PromotionRepository promotionRepository;
	private final UserRepository userRepository;
	private final OrderRepository orderRepository;
	private final OrderItemRepository orderItemRepository;
	private final CartRepository cartRepository;
	private final CartItemRepository cartItemRepository;
	private final StoreDishRepository storeDishRepository;
	private final CatalogAvailabilityService catalogAvailabilityService;
	private final OpenAiProperties openAiProperties;
	private final RestClient restClient;
	private final ObjectMapper objectMapper;

	public AiChatService(
			SessionAuthService sessionAuthService,
			AiChatThreadRepository aiChatThreadRepository,
			AiChatMessageRepository aiChatMessageRepository,
			StoreRepository storeRepository,
			DishRepository dishRepository,
			EventItemRepository eventItemRepository,
			NewsArticleRepository newsArticleRepository,
			PromotionRepository promotionRepository,
			UserRepository userRepository,
			OrderRepository orderRepository,
			OrderItemRepository orderItemRepository,
			CartRepository cartRepository,
			CartItemRepository cartItemRepository,
			StoreDishRepository storeDishRepository,
			CatalogAvailabilityService catalogAvailabilityService,
			OpenAiProperties openAiProperties,
			RestClient.Builder restClientBuilder,
			ObjectMapper objectMapper
	) {
		this.sessionAuthService = sessionAuthService;
		this.aiChatThreadRepository = aiChatThreadRepository;
		this.aiChatMessageRepository = aiChatMessageRepository;
		this.storeRepository = storeRepository;
		this.dishRepository = dishRepository;
		this.eventItemRepository = eventItemRepository;
		this.newsArticleRepository = newsArticleRepository;
		this.promotionRepository = promotionRepository;
		this.userRepository = userRepository;
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
		this.cartRepository = cartRepository;
		this.cartItemRepository = cartItemRepository;
		this.storeDishRepository = storeDishRepository;
		this.catalogAvailabilityService = catalogAvailabilityService;
		this.openAiProperties = openAiProperties;
		this.restClient = restClientBuilder.baseUrl(openAiProperties.getBaseUrl()).build();
		this.objectMapper = objectMapper;
	}

	@Transactional
	public AiChatResponse query(String authorizationHeader, AiChatQueryRequest request) {
		User operator = sessionAuthService.requireUser(authorizationHeader);
		validateOpenAiConfiguration();
		AiChatThread thread = resolveThread(operator, request.threadId(), request.message());
		List<AiChatHistoryItem> historyForAi = resolveHistoryForAi(thread, request.history());
		List<ReferenceCandidate> candidates = buildCandidates(operator, request.message());
		ObjectNode aiResult = requestAnswerFromOpenAi(operator, request.message(), historyForAi, candidates);
		List<AiChatReferenceResponse> references = resolveReferenceResponses(aiResult.path("referenceKeys"), candidates);
		references = enrichReferencesForUserAssistant(operator, request.message(), references, candidates);
		List<AiChatActionResponse> actions = buildActions(operator, request.message(), references, candidates);
		String answer = sanitizeAiHtml(aiResult.path("answer").asText());
		answer = StringUtils.hasText(toPlainText(answer)) ? answer : defaultHtmlFallback();
		saveChatMessage(thread, "user", request.message(), List.of(), List.of(), null);
		saveChatMessage(thread, "assistant", answer, references, actions, openAiProperties.getModel());
		return new AiChatResponse(
				thread.getId(),
				thread.getTitle(),
				answer,
				references,
				actions,
				AiChatCurrentUserStatusResponse.from(operator),
				openAiProperties.getModel()
		);
	}

	@Transactional(readOnly = true)
	public PageResponse<AiChatThreadSummaryResponse> listThreads(String authorizationHeader, int page, int size) {
		User operator = sessionAuthService.requireUser(authorizationHeader);
		Page<AiChatThreadSummaryResponse> threadPage = aiChatThreadRepository
				.findAllByUserIdOrderByUpdatedAtDesc(operator.getId(), PageRequest.of(Math.max(page, 0), normalizePageSize(size)))
				.map(this::toThreadSummaryResponse);
		return PageResponse.from(threadPage);
	}

	@Transactional(readOnly = true)
	public AiChatThreadDetailResponse getThread(String authorizationHeader, Long threadId) {
		User operator = sessionAuthService.requireUser(authorizationHeader);
		AiChatThread thread = requireOwnedThread(operator, threadId);
		List<AiChatMessageResponse> messages = aiChatMessageRepository.findAllByThreadIdOrderByCreatedAtAscIdAsc(thread.getId()).stream()
				.map(this::toMessageResponse)
				.toList();
		return new AiChatThreadDetailResponse(
				thread.getId(),
				thread.getTitle(),
				messages,
				thread.getCreatedAt(),
				thread.getUpdatedAt()
		);
	}

	private void validateOpenAiConfiguration() {
		if (!openAiProperties.isEnabled()) {
			throw new BadRequestException("OpenAI chat is disabled");
		}
		if (!StringUtils.hasText(openAiProperties.getApiKey())) {
			throw new BadRequestException("OpenAI API key is not configured");
		}
	}

	private AiChatThread resolveThread(User operator, Long threadId, String message) {
		if (threadId != null) {
			return requireOwnedThread(operator, threadId);
		}
		AiChatThread thread = new AiChatThread();
		thread.setUser(operator);
		thread.setTitle(buildThreadTitle(message));
		thread.setMessageCount(0);
		return aiChatThreadRepository.save(thread);
	}

	private AiChatThread requireOwnedThread(User operator, Long threadId) {
		if (threadId == null) {
			throw new BadRequestException("threadId is required");
		}
		return aiChatThreadRepository.findById(threadId)
				.map(thread -> {
					if (!Objects.equals(thread.getUser().getId(), operator.getId())) {
						throw new ForbiddenException("You do not have access to this AI chat thread");
					}
					return thread;
				})
				.orElseThrow(() -> new NotFoundException("AI chat thread not found"));
	}

	private List<AiChatHistoryItem> resolveHistoryForAi(AiChatThread thread, List<AiChatHistoryItem> fallbackHistory) {
		List<AiChatMessage> persistedMessages = aiChatMessageRepository.findAllByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
		if (!persistedMessages.isEmpty()) {
			int fromIndex = Math.max(0, persistedMessages.size() - 12);
			return persistedMessages.subList(fromIndex, persistedMessages.size()).stream()
					.map(message -> new AiChatHistoryItem(message.getRole(), toPlainText(message.getContent())))
					.toList();
		}
		return normalizeHistory(fallbackHistory);
	}

	private int normalizePageSize(int size) {
		if (size <= 0) {
			return 20;
		}
		return Math.min(size, 100);
	}

	private void saveChatMessage(
			AiChatThread thread,
			String role,
			String content,
			List<AiChatReferenceResponse> references,
			List<AiChatActionResponse> actions,
			String model
	) {
		AiChatMessage message = new AiChatMessage();
		message.setThread(thread);
		message.setRole(role);
		message.setContent(content);
		message.setReferencesJson(serializeReferences(references));
		message.setActionsJson(serializeActions(actions));
		message.setModel(model);
		AiChatMessage savedMessage = aiChatMessageRepository.save(message);
		updateThreadAfterMessage(thread, savedMessage);
	}

	private void updateThreadAfterMessage(AiChatThread thread, AiChatMessage message) {
		thread.setMessageCount(thread.getMessageCount() + 1);
		thread.setLastMessageRole(message.getRole());
		thread.setLastMessagePreview(truncatePreview(toPlainText(message.getContent()), 500));
		thread.setLastMessageAt(message.getCreatedAt());
		if (!StringUtils.hasText(thread.getTitle())) {
			thread.setTitle(buildThreadTitle(toPlainText(message.getContent())));
		}
		aiChatThreadRepository.save(thread);
	}

	private String buildThreadTitle(String message) {
		String base = StringUtils.hasText(message) ? message.trim() : "AI chat";
		return truncatePreview(base, 180);
	}

	private String truncatePreview(String value, int maxLength) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		String trimmed = value.trim().replaceAll("\\s+", " ");
		if (trimmed.length() <= maxLength) {
			return trimmed;
		}
		if (maxLength <= 3) {
			return trimmed.substring(0, maxLength);
		}
		return trimmed.substring(0, maxLength - 3) + "...";
	}

	private AiChatThreadSummaryResponse toThreadSummaryResponse(AiChatThread thread) {
		return new AiChatThreadSummaryResponse(
				thread.getId(),
				thread.getTitle(),
				thread.getMessageCount(),
				thread.getLastMessageRole(),
				thread.getLastMessagePreview(),
				thread.getLastMessageAt(),
				thread.getUpdatedAt()
		);
	}

	private AiChatMessageResponse toMessageResponse(AiChatMessage message) {
		return new AiChatMessageResponse(
				message.getId(),
				message.getRole(),
				message.getContent(),
				deserializeReferences(message.getReferencesJson()),
				deserializeActions(message.getActionsJson()),
				message.getModel(),
				message.getCreatedAt()
		);
	}

	private String serializeReferences(List<AiChatReferenceResponse> references) {
		try {
			return objectMapper.writeValueAsString(references == null ? List.of() : references);
		} catch (JsonProcessingException exception) {
			throw new BadRequestException("Failed to store AI chat references");
		}
	}

	private String serializeActions(List<AiChatActionResponse> actions) {
		try {
			return objectMapper.writeValueAsString(actions == null ? List.of() : actions);
		} catch (JsonProcessingException exception) {
			throw new BadRequestException("Failed to store AI chat actions");
		}
	}

	private List<AiChatReferenceResponse> deserializeReferences(String json) {
		if (!StringUtils.hasText(json)) {
			return List.of();
		}
		try {
			return objectMapper.readValue(json, new TypeReference<List<AiChatReferenceResponse>>() {
			});
		} catch (JsonProcessingException exception) {
			return List.of();
		}
	}

	private List<AiChatActionResponse> deserializeActions(String json) {
		if (!StringUtils.hasText(json)) {
			return List.of();
		}
		try {
			return objectMapper.readValue(json, new TypeReference<List<AiChatActionResponse>>() {
			});
		} catch (JsonProcessingException exception) {
			return List.of();
		}
	}

	private List<ReferenceCandidate> buildCandidates(User operator, String message) {
		List<String> tokens = extractTokens(message);
		String normalizedPrompt = normalizeText(message);
		List<ReferenceCandidate> candidates = new ArrayList<>();
		addStoreCandidates(candidates, operator, tokens, normalizedPrompt);
		addDishCandidates(candidates, operator, tokens, normalizedPrompt);
		addEventCandidates(candidates, operator, tokens, normalizedPrompt);
		addNewsCandidates(candidates, operator, tokens, normalizedPrompt);
		addPromotionCandidates(candidates, operator, tokens, normalizedPrompt);
		addCartCandidates(candidates, operator, tokens, normalizedPrompt);
		addOrderCandidates(candidates, operator, tokens, normalizedPrompt);
		addUserCandidates(candidates, operator, tokens, normalizedPrompt);
		return candidates.stream()
				.sorted(Comparator
						.comparingInt(ReferenceCandidate::score).reversed()
						.thenComparing(ReferenceCandidate::title))
				.limit(30)
				.toList();
	}

	private void addStoreCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		List<Store> stores = operator.getRole() == Role.ADMIN || operator.getRole() == Role.MANAGER
				? storeRepository.findAll()
				: storeRepository.findAll().stream().filter(Store::isActive).toList();
		for (Store store : stores) {
			String publicKey = StringUtils.hasText(store.getSlug()) ? store.getSlug() : String.valueOf(store.getId());
			String metricsSummary = buildStoreMetricsSummary(store);
			String searchText = buildSearchText(
					store.getName(),
					store.getSlug(),
					store.getArea(),
					store.getAddress(),
					store.getSpecialty(),
					store.getHighlightSummary(),
					metricsSummary
			);
			candidates.add(new ReferenceCandidate(
					"store:" + store.getId(),
					"STORE",
					"stores",
					store.getId(),
					store.getSlug(),
					store.getName(),
					joinNonBlank(store.getArea(), store.getAddress()),
					firstImage(store.getImagePaths()),
					"/api/public/stores/" + publicKey,
					"/api/admin/stores/" + store.getId(),
					null,
					metricsSummary,
					searchText,
					scoreEntity(tokens, normalizedPrompt, searchText, List.of("store", "branch", "best seller", "revenue", "order", "top"))
			));
		}
	}

	private void addDishCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		List<Dish> dishes = operator.getRole() == Role.ADMIN || operator.getRole() == Role.MANAGER
				? dishRepository.findAll()
				: dishRepository.findAll().stream().filter(dish -> dish.isActive() && dish.isAvailable()).toList();
		for (Dish dish : dishes.stream().limit(16).toList()) {
			String storeName = dish.getCategory() != null && dish.getCategory().getStore() != null
					? dish.getCategory().getStore().getName()
					: null;
			candidates.add(new ReferenceCandidate(
					"dish:" + dish.getId(),
					"DISH",
					"dishes",
					dish.getId(),
					null,
					dish.getName(),
					joinNonBlank(storeName, dish.getStatus()),
					firstImage(dish.getImagePaths()),
					"/api/public/dishes/" + dish.getId(),
					"/api/admin/dishes/" + dish.getId(),
					null,
					null,
					buildSearchText(dish.getName(), dish.getDescription(), dish.getNote(), dish.getHighlightSummary(), storeName),
					scoreEntity(tokens, normalizedPrompt, buildSearchText(dish.getName(), dish.getDescription(), dish.getNote(), dish.getHighlightSummary(), storeName), List.of("item", "drink", "dish", "menu"))
			));
		}
	}

	private void addEventCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		List<EventItem> events = operator.getRole() == Role.ADMIN || operator.getRole() == Role.MANAGER
				? eventItemRepository.findAll()
				: eventItemRepository.findAll().stream().filter(EventItem::isActive).toList();
		for (EventItem event : events.stream().limit(12).toList()) {
			String publicKey = StringUtils.hasText(event.getSlug()) ? event.getSlug() : String.valueOf(event.getId());
			candidates.add(new ReferenceCandidate(
					"event:" + event.getId(),
					"EVENT",
					"events",
					event.getId(),
					event.getSlug(),
					event.getName(),
					joinNonBlank(event.getStore() == null ? null : event.getStore().getName(), event.getLocation()),
					firstImage(event.getImagePaths()),
					"/api/public/events/" + publicKey,
					"/api/admin/events/" + event.getId(),
					null,
					null,
					buildSearchText(event.getName(), event.getDescription(), event.getLocation(), event.getScheduleText(), event.getHighlightSummary()),
					scoreEntity(tokens, normalizedPrompt, buildSearchText(event.getName(), event.getDescription(), event.getLocation(), event.getScheduleText(), event.getHighlightSummary()), List.of("event", "activity"))
			));
		}
	}

	private void addNewsCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		List<NewsArticle> news = operator.getRole() == Role.ADMIN || operator.getRole() == Role.MANAGER
				? newsArticleRepository.findAll()
				: newsArticleRepository.findAll().stream()
						.filter(article -> article.isPublished() && article.getPublishedAt() != null && !article.getPublishedAt().isAfter(Instant.now()))
						.toList();
		for (NewsArticle article : news.stream().limit(12).toList()) {
			String publicKey = StringUtils.hasText(article.getSlug()) ? article.getSlug() : String.valueOf(article.getId());
			String storeName = article.getRelatedStore() == null ? null : article.getRelatedStore().getName();
			candidates.add(new ReferenceCandidate(
					"news:" + article.getId(),
					"NEWS",
					"news_articles",
					article.getId(),
					article.getSlug(),
					article.getTitle(),
					joinNonBlank(storeName, article.getSummary()),
					firstImage(article.getImagePaths()),
					"/api/public/news/" + publicKey,
					"/api/admin/news/" + article.getId(),
					null,
					null,
					buildSearchText(article.getTitle(), article.getSummary(), article.getContent(), storeName, String.join(" ", article.getTags())),
					scoreEntity(tokens, normalizedPrompt, buildSearchText(article.getTitle(), article.getSummary(), article.getContent(), storeName, String.join(" ", article.getTags())), List.of("news", "article", "story"))
			));
		}
	}

	private void addPromotionCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		boolean adminLike = operator.getRole() == Role.ADMIN || operator.getRole() == Role.MANAGER;
		List<Promotion> promotions = promotionRepository.findAll().stream()
				.filter(promotion -> adminLike || isVisiblePromotion(promotion))
				.limit(12)
				.toList();
		for (Promotion promotion : promotions) {
			candidates.add(new ReferenceCandidate(
					"promotion:" + promotion.getId(),
					"PROMOTION",
					"promotions",
					promotion.getId(),
					null,
					promotion.getCode(),
					joinNonBlank(promotion.getName(), promotion.getDescription()),
					null,
					null,
					adminLike ? "/api/admin/promotions/" + promotion.getId() : null,
					null,
					null,
					buildSearchText(promotion.getCode(), promotion.getName(), promotion.getDescription(), promotion.getScope().name(), promotion.getDiscountType().name()),
					scoreEntity(tokens, normalizedPrompt, buildSearchText(promotion.getCode(), promotion.getName(), promotion.getDescription(), promotion.getScope().name(), promotion.getDiscountType().name()), List.of("voucher", "discount", "promotion", "promo"))
			));
		}
	}

	private void addCartCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		if (operator.getRole() != Role.USER) {
			return;
		}
		cartRepository.findByUserIdAndStatus(operator.getId(), CartStatus.OPEN)
				.ifPresent(cart -> {
					List<CartItem> items = cartItemRepository.findAllByCartId(cart.getId());
					int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();
					BigDecimal subtotal = items.stream()
							.map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
							.reduce(BigDecimal.ZERO, BigDecimal::add);
					String subtitle = itemCount > 0
							? itemCount + " item(s) - subtotal " + subtotal.toPlainString()
							: "Empty cart";
					String searchText = buildSearchText("cart", "checkout", subtitle);
					candidates.add(new ReferenceCandidate(
							"cart:" + cart.getId(),
							"CART",
							"carts",
							cart.getId(),
							null,
							"Current cart",
							subtitle,
							null,
							null,
							null,
							"/api/user/cart",
							null,
							searchText,
							scoreEntity(tokens, normalizedPrompt, searchText, List.of("cart", "shopping", "checkout"))
					));
				});
	}

	private void addOrderCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		if (operator.getRole() != Role.USER) {
			return;
		}
		orderRepository.findAllByUserId(operator.getId()).stream()
				.sorted(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
				.limit(6)
				.forEach(order -> {
					String storeName = orderItemRepository.findAllByOrderId(order.getId()).stream()
							.findFirst()
							.map(item -> item.getStore().getName())
							.orElse("Order");
					String subtitle = joinNonBlank(storeName, order.getStatus().name() + " / " + order.getPaymentStatus().name());
					String searchText = buildSearchText(
							"order",
							String.valueOf(order.getId()),
							storeName,
							order.getStatus().name(),
							order.getPaymentStatus().name()
					);
					candidates.add(new ReferenceCandidate(
							"order:" + order.getId(),
							"ORDER",
							"orders",
							order.getId(),
							null,
							"Order #" + order.getId(),
							subtitle,
							null,
							null,
							null,
							"/api/user/orders/" + order.getId(),
							null,
							searchText,
							scoreEntity(tokens, normalizedPrompt, searchText, List.of("order", "payment", "delivery", "status"))
					));
				});
	}

	private void addUserCandidates(List<ReferenceCandidate> candidates, User operator, List<String> tokens, String normalizedPrompt) {
		for (User user : visibleUsers(operator).stream().limit(8).toList()) {
			boolean self = Objects.equals(user.getId(), operator.getId());
			candidates.add(new ReferenceCandidate(
					self ? "user:self" : "user:" + user.getId(),
					"USER",
					"users",
					user.getId(),
					null,
					user.getFullName(),
					joinNonBlank(user.getEmail(), user.getRole().name()),
					null,
					null,
					canOpenAdminUser(operator, user) ? "/api/admin/users/" + user.getId() : null,
					self ? "/api/auth/me" : null,
					null,
					buildSearchText(user.getFullName(), user.getEmail(), user.getRole().name(), user.getWorkingStore() == null ? null : user.getWorkingStore().getName(), self ? "self current me account profile status" : "user account status"),
					scoreEntity(tokens, normalizedPrompt, buildSearchText(user.getFullName(), user.getEmail(), user.getRole().name(), user.getWorkingStore() == null ? null : user.getWorkingStore().getName(), self ? "self current me account profile status" : "user account status"), List.of("user", "account", "profile", "status"))
			));
		}
	}

	private List<User> visibleUsers(User operator) {
		if (operator.getRole() == Role.ADMIN) {
			return userRepository.findAll();
		}
		if (operator.getRole() == Role.MANAGER) {
			List<User> users = new ArrayList<>();
			users.add(operator);
			if (operator.getWorkingStore() != null && operator.getWorkingStore().getId() != null) {
				users.addAll(userRepository.findAllByWorkingStoreIdAndRoleInAndEnabledTrue(
						operator.getWorkingStore().getId(),
						List.of(Role.STAFF, Role.SHIPPER)
				));
			}
			return users.stream().distinct().toList();
		}
		return List.of(operator);
	}

	private boolean canOpenAdminUser(User operator, User target) {
		if (operator.getRole() == Role.ADMIN) {
			return true;
		}
		if (operator.getRole() != Role.MANAGER) {
			return false;
		}
		return target.getWorkingStore() != null
				&& operator.getWorkingStore() != null
				&& Objects.equals(target.getWorkingStore().getId(), operator.getWorkingStore().getId())
				&& (target.getRole() == Role.STAFF || target.getRole() == Role.SHIPPER);
	}

	private boolean isVisiblePromotion(Promotion promotion) {
		if (!promotion.isActive()) {
			return false;
		}
		Instant now = Instant.now();
		if (promotion.getStartsAt() != null && promotion.getStartsAt().isAfter(now)) {
			return false;
		}
		if (promotion.getEndsAt() != null && promotion.getEndsAt().isBefore(now)) {
			return false;
		}
		return true;
	}

	private int scoreEntity(List<String> tokens, String normalizedPrompt, String searchText, List<String> entityHints) {
		String normalizedSearch = normalizeText(searchText);
		int score = 0;
		for (String hint : entityHints) {
			if (normalizedPrompt.contains(normalizeText(hint))) {
				score += 3;
			}
		}
		if (StringUtils.hasText(normalizedSearch) && normalizedPrompt.contains(normalizedSearch) && normalizedSearch.length() > 2) {
			score += 12;
		}
		for (String token : tokens) {
			if (normalizedSearch.contains(token)) {
				score += 1;
			}
		}
		return score;
	}

	private List<String> extractTokens(String input) {
		String normalized = normalizeText(input);
		if (!StringUtils.hasText(normalized)) {
			return List.of();
		}
		return SPLIT_PATTERN.splitAsStream(normalized)
				.map(String::trim)
				.filter(token -> token.length() >= 2)
				.filter(token -> !STOP_WORDS.contains(token))
				.distinct()
				.toList();
	}

	private String normalize(String value) {
		if (value == null) {
			return "";
		}
		String lower = value.toLowerCase(Locale.ROOT).trim()
				.replace('\u0111', 'd')
				.replace('\u0110', 'd');
		String decomposed = Normalizer.normalize(lower, Normalizer.Form.NFD);
		return decomposed.replaceAll("\\p{M}+", "");
	}

	private String normalizeText(String value) {
		if (value == null) {
			return "";
		}
		String lower = value.toLowerCase(Locale.ROOT).trim()
				.replace('\u0111', 'd')
				.replace('\u0110', 'd');
		String decomposed = Normalizer.normalize(lower, Normalizer.Form.NFD);
		return decomposed.replaceAll("\\p{M}+", "");
	}

	private ObjectNode requestAnswerFromOpenAi(
			User operator,
			String question,
			List<AiChatHistoryItem> history,
			List<ReferenceCandidate> candidates
	) {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "object");
		ObjectNode properties = schema.putObject("properties");
		ObjectNode answerProperty = properties.putObject("answer");
		answerProperty.put("type", "string");
		ObjectNode referenceKeysProperty = properties.putObject("referenceKeys");
		referenceKeysProperty.put("type", "array");
		ObjectNode itemSchema = referenceKeysProperty.putObject("items");
		itemSchema.put("type", "string");
		ArrayNode required = schema.putArray("required");
		required.add("answer");
		required.add("referenceKeys");
		schema.put("additionalProperties", false);

		Map<String, Object> requestBody = new LinkedHashMap<>();
		requestBody.put("model", openAiProperties.getModel());
		requestBody.put("max_output_tokens", openAiProperties.getMaxOutputTokens());
		requestBody.put("input", List.of(
				message("system", buildSystemPrompt(operator)),
				message("user", buildUserPrompt(operator, question, history, candidates))
		));
		requestBody.put("text", Map.of(
				"format", Map.of(
						"type", "json_schema",
						"name", "ai_chat_answer",
						"schema", objectMapper.convertValue(schema, Map.class),
						"strict", true
				)
		));

		Map<String, Object> response = postResponsesRequest(requestBody);
		String outputText = extractOutputText(response);
		try {
			JsonNode parsed = objectMapper.readTree(outputText);
			if (parsed instanceof ObjectNode objectNode) {
				return objectNode;
			}
		} catch (JsonProcessingException ignored) {
		}
		throw new BadRequestException("OpenAI returned invalid AI chat response");
	}

	private String buildSystemPrompt(User operator) {
		return """
				You are an assistant for the Kamatcha system.
				Answer in English.
				Return the answer as a clean HTML fragment, not Markdown and not a full HTML document.
				Use only these HTML tags: section, h2, h3, p, ul, ol, li, strong, em, small, br, code.
				Do not use inline styles, classes, ids, tables, images, forms, buttons, anchors, or raw URLs.
				Start with a <section> root and keep the structure compact, readable, and mobile-friendly.
				Prefer a short opening paragraph, then optional subheadings and bullet lists when helpful.
				Do not duplicate the reference list or quick actions inside the HTML because the client renders those separately.
				Use only the provided candidate records and current user status.
				Candidate records can include metricsSummary for ranking questions such as best-selling stores or revenue comparisons.
				When the user asks which store is selling best, prioritize STORE candidates and compare their metricsSummary before saying data is insufficient.
				If you mention a ranking, briefly mention the basis, for example paid revenue or top dish quantity.
				For USER role, act like a shopping assistant: suggest drinks, mention similar dishes, and guide the user to quick actions such as add to cart, view cart, or open a recent order.
				Never claim an order has been placed or paid unless the candidate data explicitly shows that order already exists.
				Never invent IDs, links, stores, dishes, events, news, promotions, or user details.
				If data is insufficient, say so briefly and suggest a more specific question.
				For referenceKeys, choose only keys that exist in the candidate list and keep the list short.
				Respect role scope. The current authenticated role is %s.
				""".formatted(operator.getRole().name());
	}

	private String buildUserPrompt(
			User operator,
			String question,
			List<AiChatHistoryItem> history,
			List<ReferenceCandidate> candidates
	) {
		ObjectNode payload = objectMapper.createObjectNode();
		payload.put("currentRole", operator.getRole().name());
		payload.set("currentUserStatus", objectMapper.valueToTree(AiChatCurrentUserStatusResponse.from(operator)));
		payload.put("question", question);
		ArrayNode historyArray = payload.putArray("history");
		for (AiChatHistoryItem item : history) {
			ObjectNode node = historyArray.addObject();
			node.put("role", item.role());
			node.put("content", item.content());
		}
		ArrayNode candidateArray = payload.putArray("candidates");
		for (ReferenceCandidate candidate : candidates) {
			ObjectNode node = candidateArray.addObject();
			node.put("referenceKey", candidate.referenceKey());
			node.put("entityType", candidate.entityType());
			node.put("tableName", candidate.tableName());
			node.put("id", candidate.id());
			if (candidate.slug() != null) {
				node.put("slug", candidate.slug());
			}
			node.put("title", candidate.title());
			if (candidate.subtitle() != null) {
				node.put("subtitle", candidate.subtitle());
			}
			if (candidate.publicApiPath() != null) {
				node.put("publicApiPath", candidate.publicApiPath());
			}
			if (candidate.adminApiPath() != null) {
				node.put("adminApiPath", candidate.adminApiPath());
			}
			if (candidate.userApiPath() != null) {
				node.put("userApiPath", candidate.userApiPath());
			}
			if (candidate.metricsSummary() != null) {
				node.put("metricsSummary", candidate.metricsSummary());
			}
		}
		try {
			return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload);
		} catch (JsonProcessingException exception) {
			throw new BadRequestException("Failed to build AI chat payload");
		}
	}

	private String sanitizeAiHtml(String rawHtml) {
		if (!StringUtils.hasText(rawHtml)) {
			return defaultHtmlFallback();
		}
		String withoutDangerousBlocks = DANGEROUS_HTML_BLOCK_PATTERN.matcher(rawHtml).replaceAll("");
		String sanitized = HTML_TAG_PATTERN.matcher(withoutDangerousBlocks).replaceAll(result -> {
			String tagName = result.group(2) == null ? "" : result.group(2).toLowerCase(Locale.ROOT);
			if (!ALLOWED_AI_HTML_TAGS.contains(tagName)) {
				return "";
			}
			boolean closingTag = "/".equals(result.group(1));
			if ("br".equals(tagName)) {
				return "<br>";
			}
			return closingTag ? "</" + tagName + ">" : "<" + tagName + ">";
		});
		sanitized = sanitized
				.replace("&nbsp;", " ")
				.replaceAll("(?i)<section>\\s*</section>", "")
				.trim();
		if (!StringUtils.hasText(sanitized)) {
			return defaultHtmlFallback();
		}
		if (!sanitized.startsWith("<section")) {
			sanitized = "<section>" + sanitized + "</section>";
		}
		return sanitized;
	}

	private String toPlainText(String value) {
		if (!StringUtils.hasText(value)) {
			return "";
		}
		String normalized = HTML_LINE_BREAK_PATTERN.matcher(value).replaceAll("\n");
		normalized = HTML_SPACE_PATTERN.matcher(normalized).replaceAll(" ");
		normalized = normalized.replaceAll("(?is)<[^>]+>", " ");
		normalized = normalized.replace("&amp;", "&")
				.replace("&lt;", "<")
				.replace("&gt;", ">")
				.replace("&quot;", "\"")
				.replace("&#39;", "'");
		return normalized.replaceAll("[\\t\\x0B\\f\\r ]+", " ")
				.replaceAll("\\s*\\n\\s*", "\n")
				.trim();
	}

	private String defaultHtmlFallback() {
		return """
				<section>
				  <p>I do not have enough data yet to answer more accurately.</p>
				  <p>Please ask a more specific question about a store, dish, event, news article, voucher, or account status.</p>
				</section>
				""";
	}

	private List<AiChatHistoryItem> normalizeHistory(List<AiChatHistoryItem> history) {
		if (history == null || history.isEmpty()) {
			return List.of();
		}
		return history.stream()
				.filter(Objects::nonNull)
				.filter(item -> StringUtils.hasText(item.role()) && StringUtils.hasText(item.content()))
				.limit(8)
				.toList();
	}

	private String buildStoreMetricsSummary(Store store) {
		StorePerformance performance = buildStorePerformance(store);
		if (performance == null) {
			return null;
		}
		if (performance.topDishName() == null) {
			return "paid revenue " + performance.paidRevenue().toPlainString() + ", no paid orders yet";
		}
		return "paid revenue " + performance.paidRevenue().toPlainString()
				+ ", top dish " + performance.topDishName()
				+ " qty " + performance.topDishQuantity();
	}

	private StorePerformance buildStorePerformance(Store store) {
		if (store == null || store.getId() == null) {
			return null;
		}
		BigDecimal paidRevenue = orderRepository.sumPaidTotalAmountByStoreIdBetween(
				store.getId(),
				Instant.EPOCH,
				Instant.now().plusSeconds(1)
		);
		List<OrderItemRepository.TopSellingDishProjection> topDishes =
				orderItemRepository.findTopSellingDishStatsByStoreId(store.getId(), PageRequest.of(0, 1));
		if (topDishes.isEmpty()) {
			return new StorePerformance(paidRevenue == null ? BigDecimal.ZERO : paidRevenue, null, 0L);
		}
		OrderItemRepository.TopSellingDishProjection topDish = topDishes.get(0);
		return new StorePerformance(
				paidRevenue == null ? BigDecimal.ZERO : paidRevenue,
				topDish.getDishName(),
				topDish.getQuantitySold() == null ? 0L : topDish.getQuantitySold()
		);
	}

	private Map<String, Object> message(String role, String text) {
		return Map.of(
				"role", role,
				"content", List.of(Map.of(
						"type", "input_text",
						"text", text
				))
		);
	}

	private Map<String, Object> postResponsesRequest(Map<String, Object> requestBody) {
		try {
			return restClient.post()
					.uri("/responses")
					.header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiProperties.getApiKey())
					.contentType(MediaType.APPLICATION_JSON)
					.body(requestBody)
					.retrieve()
					.body(Map.class);
		} catch (RestClientResponseException exception) {
			String suffix = StringUtils.hasText(exception.getResponseBodyAsString())
					? ": " + exception.getResponseBodyAsString()
					: "";
			throw new BadRequestException("OpenAI request failed: HTTP " + exception.getStatusCode().value() + suffix);
		} catch (RestClientException exception) {
			throw new BadRequestException("OpenAI request failed");
		}
	}

	@SuppressWarnings("unchecked")
	private String extractOutputText(Map<String, Object> response) {
		Object outputText = response == null ? null : response.get("output_text");
		if (outputText instanceof String text && StringUtils.hasText(text)) {
			return text;
		}
		Object output = response == null ? null : response.get("output");
		if (output instanceof List<?> items) {
			for (Object item : items) {
				if (!(item instanceof Map<?, ?> itemMap)) {
					continue;
				}
				Object content = itemMap.get("content");
				if (!(content instanceof List<?> contents)) {
					continue;
				}
				for (Object contentItem : contents) {
					if (!(contentItem instanceof Map<?, ?> contentMap)) {
						continue;
					}
					Object text = contentMap.get("text");
					if (text instanceof String stringValue && StringUtils.hasText(stringValue)) {
						return stringValue;
					}
				}
			}
		}
		throw new BadRequestException("OpenAI returned empty response");
	}

	private List<AiChatReferenceResponse> enrichReferencesForUserAssistant(
			User operator,
			String message,
			List<AiChatReferenceResponse> references,
			List<ReferenceCandidate> candidates
	) {
		if (operator.getRole() != Role.USER) {
			return references;
		}

		String normalizedPrompt = normalizeText(message);
		Map<String, AiChatReferenceResponse> ordered = new LinkedHashMap<>();
		references.forEach(reference -> ordered.put(reference.referenceKey(), reference));

		if (isShoppingIntent(normalizedPrompt) || isDrinkAdviceIntent(normalizedPrompt)) {
			candidates.stream()
					.filter(candidate -> "DISH".equals(candidate.entityType()))
					.limit(2)
					.map(this::toReferenceResponse)
					.forEach(reference -> ordered.putIfAbsent(reference.referenceKey(), reference));

			List<AiChatReferenceResponse> mainDishReferences = ordered.values().stream()
					.filter(reference -> "DISH".equals(reference.entityType()))
					.limit(2)
					.toList();

			addSimilarDishReferences(ordered, mainDishReferences);
			addStoreReferenceForDish(ordered, mainDishReferences);
		}

		if (isOrderIntent(normalizedPrompt)) {
			latestUserOrder(operator).map(this::toOrderReference).ifPresent(reference -> ordered.putIfAbsent(reference.referenceKey(), reference));
		}

		if (isShoppingIntent(normalizedPrompt) || normalizedPrompt.contains("cart")) {
			currentCartReference(operator).ifPresent(reference -> ordered.putIfAbsent(reference.referenceKey(), reference));
		}

		return ordered.values().stream().limit(8).toList();
	}

	private List<AiChatActionResponse> buildActions(
			User operator,
			String message,
			List<AiChatReferenceResponse> references,
			List<ReferenceCandidate> candidates
	) {
		Map<String, AiChatActionResponse> actions = new LinkedHashMap<>();
		String normalizedPrompt = normalizeText(message);

		if (operator.getRole() == Role.USER) {
			references.stream()
					.filter(reference -> "DISH".equals(reference.entityType()))
					.limit(3)
					.forEach(reference -> {
						StoreDish storeDish = resolveBestStoreDishForAi(reference.id());
						if (storeDish != null) {
							ObjectNode payload = objectMapper.createObjectNode();
							payload.put("storeId", storeDish.getStore().getId());
							payload.put("dishId", storeDish.getDish().getId());
							payload.put("quantity", 1);
							AiChatActionResponse action = new AiChatActionResponse(
									"add-to-cart:" + storeDish.getStore().getId() + ":" + storeDish.getDish().getId(),
									"ADD_TO_CART",
									"Add to cart",
									"Add " + reference.title() + " to the cart at " + storeDish.getStore().getName(),
									"POST",
									"/api/user/cart/items",
									reference.referenceKey(),
									payload
							);
							actions.putIfAbsent(action.actionKey(), action);
						}
					});

			if (isShoppingIntent(normalizedPrompt) || isDrinkAdviceIntent(normalizedPrompt)
					|| references.stream().anyMatch(reference -> "DISH".equals(reference.entityType()))) {
				actions.putIfAbsent(
						"open-cart",
						new AiChatActionResponse(
								"open-cart",
								"OPEN_CART",
								"Open cart",
								"View the current cart and continue ordering",
								"GET",
								"/api/user/cart",
								null,
								null
						)
				);
			}

			if (isOrderIntent(normalizedPrompt) || references.stream().anyMatch(reference -> "ORDER".equals(reference.entityType()))) {
				latestUserOrder(operator).ifPresent(order -> actions.putIfAbsent(
						"open-order:" + order.getId(),
						new AiChatActionResponse(
								"open-order:" + order.getId(),
								"OPEN_ORDER",
								"View latest order",
								"Track order #" + order.getId(),
								"GET",
								"/api/user/orders/" + order.getId(),
								"order:" + order.getId(),
								null
						)
				));
				actions.putIfAbsent(
						"open-orders",
						new AiChatActionResponse(
								"open-orders",
								"OPEN_ORDERS",
								"View all orders",
								"Open your order list",
								"GET",
								"/api/user/orders",
								null,
								null
						)
				);
			}
		}

		references.stream().limit(4).forEach(reference -> {
			String openPath = bestOpenPath(reference, operator);
			if (!StringUtils.hasText(openPath)) {
				return;
			}
			String actionType = switch (reference.entityType()) {
				case "STORE" -> "OPEN_STORE";
				case "DISH" -> "OPEN_DISH";
				case "EVENT" -> "OPEN_EVENT";
				case "NEWS" -> "OPEN_NEWS";
				case "PROMOTION" -> "OPEN_PROMOTION";
				case "ORDER" -> "OPEN_ORDER";
				case "CART" -> "OPEN_CART";
				case "USER" -> "OPEN_ACCOUNT";
				default -> "OPEN_REFERENCE";
			};
			String label = switch (reference.entityType()) {
				case "STORE" -> "View store";
				case "DISH" -> "View item";
				case "EVENT" -> "View event";
				case "NEWS" -> "Read article";
				case "PROMOTION" -> "View promotion";
				case "ORDER" -> "View order";
				case "CART" -> "View cart";
				case "USER" -> "View account";
				default -> "Open";
			};
			String actionKey = "open:" + reference.referenceKey();
			actions.putIfAbsent(
					actionKey,
					new AiChatActionResponse(
							actionKey,
							actionType,
							label,
							reference.title(),
							"GET",
							openPath,
							reference.referenceKey(),
							null
					)
			);
		});

		return actions.values().stream().limit(8).toList();
	}

	private void addSimilarDishReferences(Map<String, AiChatReferenceResponse> ordered, List<AiChatReferenceResponse> mainDishReferences) {
		int added = 0;
		Set<Long> existingDishIds = ordered.values().stream()
				.filter(reference -> "DISH".equals(reference.entityType()) && reference.id() != null)
				.map(AiChatReferenceResponse::id)
				.collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

		for (AiChatReferenceResponse reference : mainDishReferences) {
			if (added >= 3 || reference.id() == null) {
				break;
			}
			Dish dish = dishRepository.findById(reference.id()).orElse(null);
			if (dish == null || dish.getCategory() == null || dish.getCategory().getId() == null) {
				continue;
			}
			for (Dish relatedDish : dishRepository.findAllByCategoryId(dish.getCategory().getId())) {
				if (added >= 3) {
					break;
				}
				if (relatedDish.getId().equals(dish.getId()) || existingDishIds.contains(relatedDish.getId())) {
					continue;
				}
				if (!relatedDish.isActive() || !relatedDish.isAvailable()) {
					continue;
				}
				AiChatReferenceResponse relatedReference = toDishReference(relatedDish);
				ordered.putIfAbsent(relatedReference.referenceKey(), relatedReference);
				existingDishIds.add(relatedDish.getId());
				added++;
			}
		}
	}

	private void addStoreReferenceForDish(Map<String, AiChatReferenceResponse> ordered, List<AiChatReferenceResponse> mainDishReferences) {
		boolean hasStore = ordered.values().stream().anyMatch(reference -> "STORE".equals(reference.entityType()));
		if (hasStore) {
			return;
		}
		for (AiChatReferenceResponse reference : mainDishReferences) {
			if (reference.id() == null) {
				continue;
			}
			Dish dish = dishRepository.findById(reference.id()).orElse(null);
			if (dish == null || dish.getCategory() == null || dish.getCategory().getStore() == null) {
				continue;
			}
			Store store = dish.getCategory().getStore();
			AiChatReferenceResponse storeReference = toStoreReference(store);
			ordered.putIfAbsent(storeReference.referenceKey(), storeReference);
			return;
		}
	}

	private Optional<AiChatReferenceResponse> currentCartReference(User operator) {
		return cartRepository.findByUserIdAndStatus(operator.getId(), CartStatus.OPEN)
				.map(this::toCartReference);
	}

	private Optional<Order> latestUserOrder(User operator) {
		return orderRepository.findAllByUserId(operator.getId()).stream()
				.sorted(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
				.findFirst();
	}

	private boolean isShoppingIntent(String normalizedPrompt) {
		return containsAny(normalizedPrompt, "buy", "order", "add to cart", "checkout", "payment", "cart");
	}

	private boolean isDrinkAdviceIntent(String normalizedPrompt) {
		return containsAny(normalizedPrompt, "recommend", "suggest", "what to drink", "drink", "matcha", "latte", "similar item", "best item");
	}

	private boolean isOrderIntent(String normalizedPrompt) {
		return containsAny(normalizedPrompt, "order", "order status", "delivery", "payment");
	}

	private boolean containsAny(String normalizedPrompt, String... keywords) {
		for (String keyword : keywords) {
			if (normalizedPrompt.contains(normalizeText(keyword))) {
				return true;
			}
		}
		return false;
	}

	private String bestOpenPath(AiChatReferenceResponse reference, User operator) {
		if (operator.getRole() == Role.ADMIN || operator.getRole() == Role.MANAGER) {
			if (StringUtils.hasText(reference.adminApiPath())) {
				return reference.adminApiPath();
			}
		}
		if (StringUtils.hasText(reference.userApiPath())) {
			return reference.userApiPath();
		}
		if (StringUtils.hasText(reference.publicApiPath())) {
			return reference.publicApiPath();
		}
		return reference.adminApiPath();
	}

	private AiChatReferenceResponse toReferenceResponse(ReferenceCandidate candidate) {
		return new AiChatReferenceResponse(
				candidate.referenceKey(),
				candidate.entityType(),
				candidate.tableName(),
				candidate.id(),
				candidate.slug(),
				candidate.title(),
				candidate.subtitle(),
				candidate.imagePath(),
				candidate.publicApiPath(),
				candidate.adminApiPath(),
				candidate.userApiPath()
		);
	}

	private AiChatReferenceResponse toDishReference(Dish dish) {
		String storeName = dish.getCategory() != null && dish.getCategory().getStore() != null
				? dish.getCategory().getStore().getName()
				: null;
		return new AiChatReferenceResponse(
				"dish:" + dish.getId(),
				"DISH",
				"dishes",
				dish.getId(),
				null,
				dish.getName(),
				joinNonBlank(storeName, dish.getStatus()),
				firstImage(dish.getImagePaths()),
				"/api/public/dishes/" + dish.getId(),
				"/api/admin/dishes/" + dish.getId(),
				null
		);
	}

	private AiChatReferenceResponse toStoreReference(Store store) {
		String publicKey = StringUtils.hasText(store.getSlug()) ? store.getSlug() : String.valueOf(store.getId());
		return new AiChatReferenceResponse(
				"store:" + store.getId(),
				"STORE",
				"stores",
				store.getId(),
				store.getSlug(),
				store.getName(),
				joinNonBlank(store.getArea(), store.getAddress()),
				firstImage(store.getImagePaths()),
				"/api/public/stores/" + publicKey,
				"/api/admin/stores/" + store.getId(),
				null
		);
	}

	private AiChatReferenceResponse toCartReference(Cart cart) {
		List<CartItem> items = cartItemRepository.findAllByCartId(cart.getId());
		int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();
		BigDecimal subtotal = items.stream()
				.map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		return new AiChatReferenceResponse(
				"cart:" + cart.getId(),
				"CART",
				"carts",
				cart.getId(),
				null,
				"Current cart",
				itemCount > 0 ? itemCount + " item(s) - subtotal " + subtotal.toPlainString() : "Empty cart",
				null,
				null,
				null,
				"/api/user/cart"
		);
	}

	private AiChatReferenceResponse toOrderReference(Order order) {
		String storeName = orderItemRepository.findAllByOrderId(order.getId()).stream()
				.findFirst()
				.map(item -> item.getStore().getName())
				.orElse("Order");
		return new AiChatReferenceResponse(
				"order:" + order.getId(),
				"ORDER",
				"orders",
				order.getId(),
				null,
				"Order #" + order.getId(),
				joinNonBlank(storeName, order.getStatus().name() + " / " + order.getPaymentStatus().name()),
				null,
				null,
				null,
				"/api/user/orders/" + order.getId()
		);
	}

	private StoreDish resolveBestStoreDishForAi(Long dishId) {
		if (dishId == null) {
			return null;
		}
		return storeDishRepository.findAllByDishId(dishId).stream()
				.filter(storeDish -> catalogAvailabilityService.resolveStoreDishStaticDisabledReason(storeDish) == null)
				.sorted(Comparator
						.comparing((StoreDish storeDish) -> catalogAvailabilityService.isStoreOpen(storeDish.getStore())).reversed()
						.thenComparing(storeDish -> catalogAvailabilityService.resolveEffectivePrice(storeDish))
						.thenComparing(storeDish -> storeDish.getStore().getName(), String.CASE_INSENSITIVE_ORDER))
				.findFirst()
				.orElse(null);
	}

	private List<AiChatReferenceResponse> resolveReferenceResponses(JsonNode referenceKeysNode, List<ReferenceCandidate> candidates) {
		Map<String, ReferenceCandidate> byKey = new LinkedHashMap<>();
		for (ReferenceCandidate candidate : candidates) {
			byKey.put(candidate.referenceKey(), candidate);
		}
		Set<String> orderedKeys = new LinkedHashSet<>();
		if (referenceKeysNode instanceof ArrayNode arrayNode) {
			for (JsonNode item : arrayNode) {
				if (item.isTextual() && byKey.containsKey(item.asText())) {
					orderedKeys.add(item.asText());
				}
			}
		}
		if (orderedKeys.isEmpty()) {
			candidates.stream().limit(4).map(ReferenceCandidate::referenceKey).forEach(orderedKeys::add);
		}
		return orderedKeys.stream()
				.map(byKey::get)
				.filter(Objects::nonNull)
				.limit(6)
				.map(candidate -> new AiChatReferenceResponse(
						candidate.referenceKey(),
						candidate.entityType(),
						candidate.tableName(),
						candidate.id(),
						candidate.slug(),
						candidate.title(),
						candidate.subtitle(),
						candidate.imagePath(),
						candidate.publicApiPath(),
						candidate.adminApiPath(),
						candidate.userApiPath()
				))
				.toList();
	}

	private String buildSearchText(String... values) {
		return Arrays.stream(values)
				.filter(StringUtils::hasText)
				.reduce((left, right) -> left + " " + right)
				.orElse("");
	}

	private String firstImage(Collection<String> imagePaths) {
		if (imagePaths == null) {
			return null;
		}
		return imagePaths.stream().filter(StringUtils::hasText).findFirst().orElse(null);
	}

	private String joinNonBlank(String left, String right) {
		if (!StringUtils.hasText(left)) {
			return StringUtils.hasText(right) ? right : null;
		}
		if (!StringUtils.hasText(right)) {
			return left;
		}
		return left + " - " + right;
	}

	private record ReferenceCandidate(
			String referenceKey,
			String entityType,
			String tableName,
			Long id,
			String slug,
			String title,
			String subtitle,
			String imagePath,
			String publicApiPath,
			String adminApiPath,
			String userApiPath,
			String metricsSummary,
			String searchText,
			int score
	) {
	}

	private record StorePerformance(
			BigDecimal paidRevenue,
			String topDishName,
			long topDishQuantity
	) {
	}

}

