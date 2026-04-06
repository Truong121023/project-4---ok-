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
import java.util.Set;
import java.util.regex.Pattern;

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
import com.example.registrationotp.dto.AiChatCurrentUserStatusResponse;
import com.example.registrationotp.dto.AiChatHistoryItem;
import com.example.registrationotp.dto.AiChatQueryRequest;
import com.example.registrationotp.dto.AiChatReferenceResponse;
import com.example.registrationotp.dto.AiChatResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.NewsArticleRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.OrderRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class AiChatService {

	private static final Pattern SPLIT_PATTERN = Pattern.compile("[^\\p{L}\\p{Nd}]+");
	private static final Set<String> STOP_WORDS = Set.of(
			"va", "la", "cho", "toi", "cua", "ve", "co", "khong", "nhung", "voi", "mot", "nhieu",
			"hay", "gi", "nao", "the", "can", "muon", "xem", "hoi", "status", "trang", "thai"
	);

	private final SessionAuthService sessionAuthService;
	private final StoreRepository storeRepository;
	private final DishRepository dishRepository;
	private final EventItemRepository eventItemRepository;
	private final NewsArticleRepository newsArticleRepository;
	private final PromotionRepository promotionRepository;
	private final UserRepository userRepository;
	private final OrderRepository orderRepository;
	private final OrderItemRepository orderItemRepository;
	private final OpenAiProperties openAiProperties;
	private final RestClient restClient;
	private final ObjectMapper objectMapper;

	public AiChatService(
			SessionAuthService sessionAuthService,
			StoreRepository storeRepository,
			DishRepository dishRepository,
			EventItemRepository eventItemRepository,
			NewsArticleRepository newsArticleRepository,
			PromotionRepository promotionRepository,
			UserRepository userRepository,
			OrderRepository orderRepository,
			OrderItemRepository orderItemRepository,
			OpenAiProperties openAiProperties,
			RestClient.Builder restClientBuilder,
			ObjectMapper objectMapper
	) {
		this.sessionAuthService = sessionAuthService;
		this.storeRepository = storeRepository;
		this.dishRepository = dishRepository;
		this.eventItemRepository = eventItemRepository;
		this.newsArticleRepository = newsArticleRepository;
		this.promotionRepository = promotionRepository;
		this.userRepository = userRepository;
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
		this.openAiProperties = openAiProperties;
		this.restClient = restClientBuilder.baseUrl(openAiProperties.getBaseUrl()).build();
		this.objectMapper = objectMapper;
	}

	@Transactional(readOnly = true)
	public AiChatResponse query(String authorizationHeader, AiChatQueryRequest request) {
		User operator = sessionAuthService.requireUser(authorizationHeader);
		validateOpenAiConfiguration();
		List<ReferenceCandidate> candidates = buildCandidates(operator, request.message());
		ObjectNode aiResult = requestAnswerFromOpenAi(operator, request, candidates);
		List<AiChatReferenceResponse> references = resolveReferenceResponses(aiResult.path("referenceKeys"), candidates);
		String answer = aiResult.path("answer").asText();
		if (!StringUtils.hasText(answer)) {
			answer = "Mình chưa có đủ dữ liệu để trả lời chính xác hơn. Bạn thử hỏi cụ thể hơn về cửa hàng, món, sự kiện, tin tức, voucher hoặc trạng thái tài khoản.";
		}
		return new AiChatResponse(
				answer,
				references,
				AiChatCurrentUserStatusResponse.from(operator),
				openAiProperties.getModel()
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

	private List<ReferenceCandidate> buildCandidates(User operator, String message) {
		List<String> tokens = extractTokens(message);
		String normalizedPrompt = normalizeText(message);
		List<ReferenceCandidate> candidates = new ArrayList<>();
		addStoreCandidates(candidates, operator, tokens, normalizedPrompt);
		addDishCandidates(candidates, operator, tokens, normalizedPrompt);
		addEventCandidates(candidates, operator, tokens, normalizedPrompt);
		addNewsCandidates(candidates, operator, tokens, normalizedPrompt);
		addPromotionCandidates(candidates, operator, tokens, normalizedPrompt);
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
					scoreEntity(tokens, normalizedPrompt, searchText, List.of("cua hang", "chi nhanh", "store", "ban chay", "doanh thu", "don hang", "top"))
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
					scoreEntity(tokens, normalizedPrompt, buildSearchText(dish.getName(), dish.getDescription(), dish.getNote(), dish.getHighlightSummary(), storeName), List.of("mon", "do uong", "dish", "menu"))
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
					scoreEntity(tokens, normalizedPrompt, buildSearchText(event.getName(), event.getDescription(), event.getLocation(), event.getScheduleText(), event.getHighlightSummary()), List.of("su kien", "event"))
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
					scoreEntity(tokens, normalizedPrompt, buildSearchText(article.getTitle(), article.getSummary(), article.getContent(), storeName, String.join(" ", article.getTags())), List.of("tin tuc", "news", "bai viet"))
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
					scoreEntity(tokens, normalizedPrompt, buildSearchText(promotion.getCode(), promotion.getName(), promotion.getDescription(), promotion.getScope().name(), promotion.getDiscountType().name()), List.of("voucher", "giam gia", "khuyen mai", "promotion", "promo"))
			));
		}
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
					scoreEntity(tokens, normalizedPrompt, buildSearchText(user.getFullName(), user.getEmail(), user.getRole().name(), user.getWorkingStore() == null ? null : user.getWorkingStore().getName(), self ? "self current me account profile status" : "user account status"), List.of("tai khoan", "user", "account", "profile", "trang thai"))
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
				.replace('đ', 'd')
				.replace('Đ', 'd');
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

	private ObjectNode requestAnswerFromOpenAi(User operator, AiChatQueryRequest request, List<ReferenceCandidate> candidates) {
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
				message("user", buildUserPrompt(operator, request, candidates))
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
				You are an assistant for the Tea Matcha system.
				Answer in Vietnamese.
				Use only the provided candidate records and current user status.
				Candidate records can include metricsSummary for ranking questions such as best-selling stores or revenue comparisons.
				When the user asks which store is selling best, prioritize STORE candidates and compare their metricsSummary before saying data is insufficient.
				If you mention a ranking, briefly mention the basis, for example paid revenue or top dish quantity.
				Never invent IDs, links, stores, dishes, events, news, promotions, or user details.
				If data is insufficient, say so briefly and suggest a more specific question.
				For referenceKeys, choose only keys that exist in the candidate list and keep the list short.
				Respect role scope. The current authenticated role is %s.
				""".formatted(operator.getRole().name());
	}

	private String buildUserPrompt(User operator, AiChatQueryRequest request, List<ReferenceCandidate> candidates) {
		ObjectNode payload = objectMapper.createObjectNode();
		payload.put("currentRole", operator.getRole().name());
		payload.set("currentUserStatus", objectMapper.valueToTree(AiChatCurrentUserStatusResponse.from(operator)));
		payload.put("question", request.message());
		ArrayNode historyArray = payload.putArray("history");
		for (AiChatHistoryItem item : normalizeHistory(request.history())) {
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
