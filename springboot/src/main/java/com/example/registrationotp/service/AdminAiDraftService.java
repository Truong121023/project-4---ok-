package com.example.registrationotp.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.example.registrationotp.config.OpenAiProperties;
import com.example.registrationotp.dto.AdminAiFormDraftRequest;
import com.example.registrationotp.dto.AdminAiFormDraftResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.model.AdminAiFormType;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.CategoryRepository;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class AdminAiDraftService {

	private static final Sort NAME_SORT = Sort.by(Sort.Direction.ASC, "name");
	private static final int MAX_REFERENCE_ITEMS = 40;

	private final SessionAuthService sessionAuthService;
	private final StoreRepository storeRepository;
	private final CategoryRepository categoryRepository;
	private final DishRepository dishRepository;
	private final OpenAiProperties openAiProperties;
	private final RestClient restClient;
	private final ObjectMapper objectMapper;

	public AdminAiDraftService(
			SessionAuthService sessionAuthService,
			StoreRepository storeRepository,
			CategoryRepository categoryRepository,
			DishRepository dishRepository,
			OpenAiProperties openAiProperties,
			RestClient.Builder restClientBuilder,
			ObjectMapper objectMapper
	) {
		this.sessionAuthService = sessionAuthService;
		this.storeRepository = storeRepository;
		this.categoryRepository = categoryRepository;
		this.dishRepository = dishRepository;
		this.openAiProperties = openAiProperties;
		this.restClient = restClientBuilder.baseUrl(openAiProperties.getBaseUrl()).build();
		this.objectMapper = objectMapper;
	}

	@Transactional(readOnly = true)
	public AdminAiFormDraftResponse generateDraft(
			String authorizationHeader,
			AdminAiFormType formType,
			AdminAiFormDraftRequest request
	) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		validateOpenAiConfiguration();
		FormScope scope = resolveScope(operator, request.storeId());
		ObjectNode schema = buildWrappedSchema(formType);
		ObjectNode referenceData = buildReferenceData(formType, scope);
		ObjectNode currentForm = normalizeCurrentForm(request.currentForm());
		ObjectNode rawResult = requestDraftFromOpenAi(formType, request.prompt(), currentForm, scope, referenceData, schema);
		SanitizedDraft sanitizedDraft = sanitizeDraft(formType, rawResult.path("draft"), scope, referenceData);
		AutoFillResult autoFillResult = completeDraft(formType, sanitizedDraft.draft(), scope, referenceData);
		List<String> warnings = mergeOrderedStrings(readStringArray(rawResult.path("warnings")), sanitizedDraft.warnings());
		if (!autoFillResult.filledFields().isEmpty()) {
			warnings = mergeOrderedStrings(
					warnings,
					List.of("Auto-filled sample values for " + autoFillResult.filledFields().size() + " field(s). Review before saving.")
			);
		}
		List<String> missingFields = mergeOrderedStrings(readStringArray(rawResult.path("missingFields")), sanitizedDraft.missingFields()).stream()
				.filter(field -> !autoFillResult.filledFields().contains(field))
				.toList();
		return new AdminAiFormDraftResponse(
				formType.name(),
				sanitizedDraft.draft(),
				warnings,
				missingFields,
				scope.storeId(),
				scope.storeName(),
				openAiProperties.getModel()
		);
	}

	private void validateOpenAiConfiguration() {
		if (!openAiProperties.isEnabled()) {
			throw new BadRequestException("OpenAI draft generation is disabled");
		}
		if (!StringUtils.hasText(openAiProperties.getApiKey())) {
			throw new BadRequestException("OpenAI API key is not configured");
		}
	}

	private FormScope resolveScope(User operator, Long requestedStoreId) {
		if (operator.getRole() == Role.MANAGER) {
			Long managerStoreId = requireManagerWorkingStoreId(operator);
			if (requestedStoreId != null && !Objects.equals(requestedStoreId, managerStoreId)) {
				throw new ForbiddenException("Manager AI draft access is limited to the assigned working store");
			}
			Store store = findStore(managerStoreId);
			return new FormScope(store.getId(), store.getName());
		}
		if (requestedStoreId == null) {
			return new FormScope(null, null);
		}
		Store store = findStore(requestedStoreId);
		return new FormScope(store.getId(), store.getName());
	}

	private ObjectNode normalizeCurrentForm(JsonNode currentForm) {
		if (currentForm instanceof ObjectNode objectNode) {
			return objectNode.deepCopy();
		}
		return objectMapper.createObjectNode();
	}

	private ObjectNode requestDraftFromOpenAi(
			AdminAiFormType formType,
			String prompt,
			ObjectNode currentForm,
			FormScope scope,
			ObjectNode referenceData,
			ObjectNode schema
	) {
		Map<String, Object> requestBody = new LinkedHashMap<>();
		requestBody.put("model", openAiProperties.getModel());
		requestBody.put("max_output_tokens", openAiProperties.getMaxOutputTokens());
		requestBody.put("input", List.of(
				message("system", buildSystemPrompt()),
				message("user", buildUserPrompt(formType, prompt, currentForm, scope, referenceData))
		));
		requestBody.put("text", Map.of(
				"format", Map.of(
						"type", "json_schema",
						"name", "admin_form_draft",
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
			throw new BadRequestException("OpenAI returned invalid draft response");
		} catch (JsonProcessingException exception) {
			throw new BadRequestException("OpenAI returned invalid JSON draft");
		}
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
			throw mapOpenAiError(exception);
		} catch (RestClientException exception) {
			throw new BadRequestException("OpenAI request failed");
		}
	}

	private RuntimeException mapOpenAiError(RestClientResponseException exception) {
		String suffix = "";
		if (StringUtils.hasText(exception.getResponseBodyAsString())) {
			suffix = ": " + exception.getResponseBodyAsString();
		}
		return new BadRequestException("OpenAI request failed: HTTP " + exception.getStatusCode().value() + suffix);
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
		throw new BadRequestException("OpenAI returned empty draft response");
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

	private String buildSystemPrompt() {
		return """
				You generate admin form drafts for a Spring Boot backend.
				Always return valid JSON that exactly matches the provided schema.
				Always fill every field in the draft with a realistic sample value.
				Use only IDs that exist in the provided reference data.
				Do not invent image upload paths. Leave imagePaths empty unless they are explicitly given.
				Prefer concise, realistic content for Tea Matcha.
				For optional text fields, prefer realistic sample text instead of null.
				Use empty arrays for imagePaths when no uploaded image path is provided.
				If a field is still unclear, choose a safe sample value and add a short warning instead of leaving the field blank.
				Warnings should be short plain strings.
				""";
	}

	private String buildUserPrompt(
			AdminAiFormType formType,
			String prompt,
			ObjectNode currentForm,
			FormScope scope,
			ObjectNode referenceData
	) {
		StringBuilder builder = new StringBuilder();
		builder.append("Form type: ").append(formType.name()).append('\n');
		builder.append("User prompt: ").append(prompt).append('\n');
		if (scope.storeId() != null) {
			builder.append("Scoped store: ").append(scope.storeName())
					.append(" (id=").append(scope.storeId()).append(")\n");
		}
		builder.append("Current form JSON:\n").append(writeJson(currentForm)).append('\n');
		builder.append("Reference data JSON:\n").append(writeJson(referenceData)).append('\n');
		builder.append("Use only the IDs shown in reference data.\n");
		return builder.toString();
	}

	private String writeJson(JsonNode node) {
		try {
			return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
		} catch (JsonProcessingException exception) {
			return "{}";
		}
	}

	private ObjectNode buildReferenceData(AdminAiFormType formType, FormScope scope) {
		ObjectNode root = objectMapper.createObjectNode();
		if (scope.storeId() != null) {
			root.put("scopeStoreId", scope.storeId());
			root.put("scopeStoreName", scope.storeName());
		}

		switch (formType) {
			case STORE -> root.set("existingStores", toStoreArray(scope));
			case CATEGORY -> root.set("stores", toStoreArray(scope));
			case DISH -> root.set("categories", toCategoryArray(scope));
			case EVENT -> {
				root.set("stores", toStoreArray(scope));
				root.set("featuredDishOptions", toDishArray(scope));
			}
			case NEWS -> root.set("stores", toStoreArray(scope));
			case STORE_DISH -> {
				root.set("stores", toStoreArray(scope));
				root.set("dishes", toDishArray(scope));
			}
		}
		return root;
	}

	private ArrayNode toStoreArray(FormScope scope) {
		ArrayNode array = objectMapper.createArrayNode();
		List<Store> stores = scope.storeId() != null
				? List.of(findStore(scope.storeId()))
				: storeRepository.findAll(PageRequest.of(0, MAX_REFERENCE_ITEMS, NAME_SORT)).getContent();
		for (Store store : stores) {
			ObjectNode node = array.addObject();
			node.put("id", store.getId());
			node.put("name", store.getName());
			node.put("slug", store.getSlug());
			node.put("address", store.getAddress());
		}
		return array;
	}

	private ArrayNode toCategoryArray(FormScope scope) {
		ArrayNode array = objectMapper.createArrayNode();
		List<Category> categories = scope.storeId() != null
				? categoryRepository.findAllByStoreId(scope.storeId())
				: categoryRepository.findAll(PageRequest.of(0, MAX_REFERENCE_ITEMS, NAME_SORT)).getContent();
		for (Category category : categories) {
			ObjectNode node = array.addObject();
			node.put("id", category.getId());
			node.put("name", category.getName());
			if (category.getStore() != null) {
				node.put("storeId", category.getStore().getId());
				node.put("storeName", category.getStore().getName());
			}
		}
		return array;
	}

	private ArrayNode toDishArray(FormScope scope) {
		ArrayNode array = objectMapper.createArrayNode();
		List<Dish> dishes = loadScopedDishes(scope);
		for (Dish dish : dishes) {
			ObjectNode node = array.addObject();
			node.put("id", dish.getId());
			node.put("name", dish.getName());
			node.put("price", dish.getPrice() == null ? 0 : dish.getPrice().doubleValue());
			if (dish.getCategory() != null) {
				node.put("categoryId", dish.getCategory().getId());
				node.put("categoryName", dish.getCategory().getName());
				if (dish.getCategory().getStore() != null) {
					node.put("storeId", dish.getCategory().getStore().getId());
					node.put("storeName", dish.getCategory().getStore().getName());
				}
			}
		}
		return array;
	}

	private List<Dish> loadScopedDishes(FormScope scope) {
		if (scope.storeId() == null) {
			return dishRepository.findAll(PageRequest.of(0, MAX_REFERENCE_ITEMS, NAME_SORT)).getContent();
		}
		List<Category> categories = categoryRepository.findAllByStoreId(scope.storeId());
		List<Dish> dishes = new ArrayList<>();
		for (Category category : categories) {
			dishes.addAll(dishRepository.findAllByCategoryId(category.getId()));
			if (dishes.size() >= MAX_REFERENCE_ITEMS) {
				break;
			}
		}
		return dishes.stream().limit(MAX_REFERENCE_ITEMS).toList();
	}

	private SanitizedDraft sanitizeDraft(AdminAiFormType formType, JsonNode rawDraft, FormScope scope, ObjectNode referenceData) {
		ObjectNode draft = rawDraft instanceof ObjectNode objectNode ? objectNode.deepCopy() : objectMapper.createObjectNode();
		List<String> warnings = new ArrayList<>();
		List<String> missingFields = new ArrayList<>();

		switch (formType) {
			case STORE -> sanitizeStoreDraft(draft, warnings, missingFields);
			case CATEGORY -> sanitizeCategoryDraft(draft, scope, referenceData, warnings, missingFields);
			case DISH -> sanitizeDishDraft(draft, referenceData, warnings, missingFields);
			case EVENT -> sanitizeEventDraft(draft, scope, referenceData, warnings, missingFields);
			case NEWS -> sanitizeNewsDraft(draft, scope, referenceData, warnings, missingFields);
			case STORE_DISH -> sanitizeStoreDishDraft(draft, scope, referenceData, warnings, missingFields);
		}

		return new SanitizedDraft(draft, warnings, missingFields);
	}

	private AutoFillResult completeDraft(AdminAiFormType formType, ObjectNode draft, FormScope scope, ObjectNode referenceData) {
		Set<String> filledFields = new LinkedHashSet<>();
		switch (formType) {
			case STORE -> completeStoreDraft(draft, filledFields);
			case CATEGORY -> completeCategoryDraft(draft, scope, referenceData, filledFields);
			case DISH -> completeDishDraft(draft, referenceData, filledFields);
			case EVENT -> completeEventDraft(draft, scope, referenceData, filledFields);
			case NEWS -> completeNewsDraft(draft, scope, referenceData, filledFields);
			case STORE_DISH -> completeStoreDishDraft(draft, scope, referenceData, filledFields);
		}
		return new AutoFillResult(Set.copyOf(filledFields));
	}

	private void completeStoreDraft(ObjectNode draft, Set<String> filledFields) {
		fillTextIfBlank(draft, "name", "Tea Matcha Signature Atelier", filledFields);
		fillTextIfBlank(draft, "description", "Khong gian matcha hien dai voi menu signature, workshop cuoi tuan va goc ngoi am ap.", filledFields);
		fillTextIfBlank(draft, "address", "25 Nguyen Hue, District 1, Ho Chi Minh City", filledFields);
		fillTextIfBlank(draft, "area", "District 1", filledFields);
		fillTextIfBlank(draft, "positionLabel", "Ground floor corner", filledFields);
		fillTextIfBlank(draft, "hoursText", "08:00 - 22:00", filledFields);
		fillTextIfBlank(draft, "openTime", "08:00:00", filledFields);
		fillTextIfBlank(draft, "closeTime", "22:00:00", filledFields);
		fillTextIfBlank(draft, "personality", "Tinh te va than thien", filledFields);
		fillTextIfBlank(draft, "designSignature", "Warm wood interior with matcha workshop bar", filledFields);
		fillTextIfBlank(draft, "franchiseMood", "Premium, youthful, experience-led", filledFields);
		fillTextIfBlank(draft, "specialty", "Signature matcha latte and hojicha float", filledFields);
		fillTextIfBlank(draft, "highlightSummary", "Chi nhanh noi bat voi menu signature, workshop va khong gian chill ca ngay.", filledFields);
		fillTextIfBlank(draft, "slug", slugify(draft.path("name").asText("tea-matcha-signature-atelier")), filledFields);
		fillTextIfBlank(draft, "contactEmail", "hello@" + slugify(draft.path("name").asText("tea-matcha-signature-atelier")) + ".teamatcha.local", filledFields);
		fillTextIfBlank(draft, "phoneNumber", "0901000014", filledFields);
		fillNumberIfMissing(draft, "latitude", 10.7768, filledFields);
		fillNumberIfMissing(draft, "longitude", 106.7009, filledFields);
		fillStringArrayIfMissing(draft, "highlightTags", List.of("Matcha", "Workshop", "Signature"), filledFields);
		fillStringArrayIfMissing(draft, "serviceTags", List.of("Dine-in", "Takeaway", "Delivery"), filledFields);
		fillStringArrayIfMissing(draft, "imagePaths", List.of(), filledFields);
		fillSectionsIfMissing(draft, "sections", "Store Story", "Khong gian duoc thiet ke cho trai nghiem matcha thu cong, workshop cuoi tuan va ngoi lai lau.", filledFields);
		fillBooleanIfMissing(draft, "active", true, filledFields);
	}

	private void completeCategoryDraft(ObjectNode draft, FormScope scope, ObjectNode referenceData, Set<String> filledFields) {
		fillLongIfMissing(draft, "storeId", firstLongReference(referenceData.path("stores")), scope.storeId(), filledFields);
		fillTextIfBlank(draft, "name", "Signature Matcha", filledFields);
		fillTextIfBlank(draft, "description", "Nhom mon matcha signature danh cho khach muon trai nghiem vi dam va can bang.", filledFields);
		fillStringArrayIfMissing(draft, "imagePaths", List.of(), filledFields);
		fillIntegerIfMissing(draft, "sortOrder", 1, filledFields);
		fillBooleanIfMissing(draft, "active", true, filledFields);
	}

	private void completeDishDraft(ObjectNode draft, ObjectNode referenceData, Set<String> filledFields) {
		fillLongIfMissing(draft, "categoryId", firstLongReference(referenceData.path("categories")), null, filledFields);
		fillTextIfBlank(draft, "name", "Ceremonial Matcha Latte", filledFields);
		fillTextIfBlank(draft, "description", "Latte matcha dam vi, beo nhe va can bang giua huong tra va sua.", filledFields);
		fillTextIfBlank(draft, "note", "Goi y it duong de giu vi matcha tron ven.", filledFields);
		fillNumberIfMissing(draft, "price", 89000, filledFields);
		fillTextIfBlank(draft, "status", "ACTIVE", filledFields);
		fillBooleanIfMissing(draft, "available", true, filledFields);
		fillBooleanIfMissing(draft, "franchiseRequired", false, filledFields);
		fillTextIfBlank(draft, "franchiseNote", "Khong co yeu cau franchise dac biet cho mon nay.", filledFields);
		fillTextIfBlank(draft, "highlightSummary", "Mon signature phu hop cho khach moi va khach quay lai.", filledFields);
		fillStringArrayIfMissing(draft, "highlightTags", List.of("Best seller", "Matcha", "Creamy"), filledFields);
		fillStringArrayIfMissing(draft, "imagePaths", List.of(), filledFields);
		fillSectionsIfMissing(draft, "sections", "Flavor Notes", "Vi matcha ro, hau sua nhe, phu hop khi dung nong hoac da.", filledFields);
		fillBooleanIfMissing(draft, "active", true, filledFields);
	}

	private void completeEventDraft(ObjectNode draft, FormScope scope, ObjectNode referenceData, Set<String> filledFields) {
		fillLongIfMissing(draft, "storeId", firstLongReference(referenceData.path("stores")), scope.storeId(), filledFields);
		fillTextIfBlank(draft, "name", "Weekend Matcha Tasting Session", filledFields);
		fillTextIfBlank(draft, "slug", slugify(draft.path("name").asText("weekend-matcha-tasting-session")), filledFields);
		fillTextIfBlank(draft, "description", "Buoi tasting cuoi tuan cho khach trai nghiem menu moi va giao luu cung barista.", filledFields);
		fillTextIfBlank(draft, "location", scope.storeName() != null ? scope.storeName() : "Tea Matcha flagship store", filledFields);
		fillTextIfBlank(draft, "scheduleText", "10:00 - 14:00 every Saturday", filledFields);
		fillTextIfBlank(draft, "highlightSummary", "Su kien thu hut khach moi, co sampling va combo uu dai tai cho.", filledFields);
		fillStringArrayIfMissing(draft, "highlightTags", List.of("Weekend", "Tasting", "Community"), filledFields);
		fillIntegerIfMissing(draft, "capacity", 80, filledFields);
		fillIntegerIfMissing(draft, "bookedCount", 0, filledFields);
		fillLongArrayIfMissing(draft, "featuredDishIds", firstLongReference(referenceData.path("featuredDishOptions")), filledFields);
		fillStringArrayIfMissing(draft, "imagePaths", List.of(), filledFields);
		fillSectionsIfMissing(draft, "sections", "Event Details", "Khach tham gia duoc thu menu moi, nhan voucher va giao luu voi doi ngu barista.", filledFields);
		fillTextIfBlank(draft, "startsAt", Instant.now().plusSeconds(7 * 24 * 3600).toString(), filledFields);
		fillTextIfBlank(draft, "endsAt", Instant.now().plusSeconds(7 * 24 * 3600 + 4 * 3600).toString(), filledFields);
		fillBooleanIfMissing(draft, "active", true, filledFields);
	}

	private void completeNewsDraft(ObjectNode draft, FormScope scope, ObjectNode referenceData, Set<String> filledFields) {
		fillTextIfBlank(draft, "title", "Tea Matcha launches new seasonal signature lineup", filledFields);
		fillTextIfBlank(draft, "slug", slugify(draft.path("title").asText("tea-matcha-launches-new-seasonal-signature-lineup")), filledFields);
		fillTextIfBlank(draft, "summary", "Bo suu tap theo mua tap trung vao mon matcha signature va trai nghiem tai cua hang.", filledFields);
		fillTextIfBlank(draft, "content", "Tea Matcha gioi thieu lineup theo mua voi diem nhan la mon signature, chuong trinh sampling va uu dai khai vi trong tuan dau.", filledFields);
		fillLongIfMissing(draft, "relatedStoreId", firstLongReference(referenceData.path("stores")), scope.storeId(), filledFields);
		fillStringArrayIfMissing(draft, "tags", List.of("seasonal", "matcha", "launch"), filledFields);
		fillStringArrayIfMissing(draft, "imagePaths", List.of(), filledFields);
		fillSectionsIfMissing(draft, "sections", "Editorial Section", "Noi dung chi tiet ve bo suu tap moi, thong diep thuong hieu va diem nhan tai cua hang.", filledFields);
		fillBooleanIfMissing(draft, "featured", false, filledFields);
		fillBooleanIfMissing(draft, "published", false, filledFields);
		fillTextIfBlank(draft, "publishedAt", Instant.now().toString(), filledFields);
	}

	private void completeStoreDishDraft(ObjectNode draft, FormScope scope, ObjectNode referenceData, Set<String> filledFields) {
		fillLongIfMissing(draft, "storeId", firstLongReference(referenceData.path("stores")), scope.storeId(), filledFields);
		fillLongIfMissing(draft, "dishId", firstLongReference(referenceData.path("dishes")), null, filledFields);
		fillIntegerIfMissing(draft, "quantity", 20, filledFields);
		fillBooleanIfMissing(draft, "available", true, filledFields);
		fillNumberIfMissing(draft, "priceOverride", firstDishPrice(referenceData.path("dishes"), draft.path("dishId").canConvertToLong() ? draft.path("dishId").asLong() : null), filledFields);
	}

	private void sanitizeStoreDraft(ObjectNode draft, List<String> warnings, List<String> missingFields) {
		defaultBoolean(draft, "active", true);
		ensureTextField(draft, "name", missingFields);
		if (draft.hasNonNull("openTime")) {
			validateLocalTimeString(draft, "openTime", warnings, missingFields);
		}
		if (draft.hasNonNull("closeTime")) {
			validateLocalTimeString(draft, "closeTime", warnings, missingFields);
		}
	}

	private void sanitizeCategoryDraft(
			ObjectNode draft,
			FormScope scope,
			ObjectNode referenceData,
			List<String> warnings,
			List<String> missingFields
	) {
		defaultBoolean(draft, "active", true);
		ensureTextField(draft, "name", missingFields);
		forceStoreIdIfScoped(draft, "storeId", scope);
		validateLongAgainstReference(draft, "storeId", collectIds(referenceData.path("stores")), warnings, missingFields, true);
	}

	private void sanitizeDishDraft(
			ObjectNode draft,
			ObjectNode referenceData,
			List<String> warnings,
			List<String> missingFields
	) {
		defaultBoolean(draft, "available", true);
		defaultBoolean(draft, "active", true);
		ensureTextField(draft, "name", missingFields);
		ensureNumericField(draft, "price", missingFields);
		validateLongAgainstReference(draft, "categoryId", collectIds(referenceData.path("categories")), warnings, missingFields, true);
	}

	private void sanitizeEventDraft(
			ObjectNode draft,
			FormScope scope,
			ObjectNode referenceData,
			List<String> warnings,
			List<String> missingFields
	) {
		defaultBoolean(draft, "active", true);
		ensureTextField(draft, "name", missingFields);
		forceStoreIdIfScoped(draft, "storeId", scope);
		validateLongAgainstReference(draft, "storeId", collectIds(referenceData.path("stores")), warnings, missingFields, true);
		validateInstantField(draft, "startsAt", warnings, missingFields, true);
		validateInstantField(draft, "endsAt", warnings, missingFields, true);
		filterLongArrayAgainstReference(draft, "featuredDishIds", collectIds(referenceData.path("featuredDishOptions")), warnings);
	}

	private void sanitizeNewsDraft(
			ObjectNode draft,
			FormScope scope,
			ObjectNode referenceData,
			List<String> warnings,
			List<String> missingFields
	) {
		defaultBoolean(draft, "featured", false);
		defaultBoolean(draft, "published", false);
		ensureTextField(draft, "title", missingFields);
		ensureTextField(draft, "summary", missingFields);
		ensureTextField(draft, "content", missingFields);
		if (scope.storeId() != null && !draft.has("relatedStoreId")) {
			draft.put("relatedStoreId", scope.storeId());
		}
		validateLongAgainstReference(draft, "relatedStoreId", collectIds(referenceData.path("stores")), warnings, missingFields, false);
		if (draft.hasNonNull("publishedAt")) {
			validateInstantField(draft, "publishedAt", warnings, missingFields, false);
		}
	}

	private void sanitizeStoreDishDraft(
			ObjectNode draft,
			FormScope scope,
			ObjectNode referenceData,
			List<String> warnings,
			List<String> missingFields
	) {
		defaultBoolean(draft, "available", true);
		forceStoreIdIfScoped(draft, "storeId", scope);
		validateLongAgainstReference(draft, "storeId", collectIds(referenceData.path("stores")), warnings, missingFields, true);
		validateLongAgainstReference(draft, "dishId", collectIds(referenceData.path("dishes")), warnings, missingFields, true);
		ensureNumericField(draft, "quantity", missingFields);
		if (draft.hasNonNull("priceOverride") && !draft.path("priceOverride").isNumber()) {
			draft.remove("priceOverride");
			warnings.add("Removed invalid priceOverride because it was not numeric");
		}
	}

	private void fillTextIfBlank(ObjectNode draft, String fieldName, String value, Set<String> filledFields) {
		if (!StringUtils.hasText(value)) {
			return;
		}
		if (!draft.hasNonNull(fieldName) || !StringUtils.hasText(draft.path(fieldName).asText())) {
			draft.put(fieldName, value);
			filledFields.add(fieldName);
		}
	}

	private void fillBooleanIfMissing(ObjectNode draft, String fieldName, boolean value, Set<String> filledFields) {
		if (!draft.has(fieldName) || draft.path(fieldName).isNull()) {
			draft.put(fieldName, value);
			filledFields.add(fieldName);
		}
	}

	private void fillIntegerIfMissing(ObjectNode draft, String fieldName, int value, Set<String> filledFields) {
		if (!draft.hasNonNull(fieldName) || !draft.path(fieldName).canConvertToInt()) {
			draft.put(fieldName, value);
			filledFields.add(fieldName);
		}
	}

	private void fillLongIfMissing(ObjectNode draft, String fieldName, Long referenceValue, Long preferredValue, Set<String> filledFields) {
		if (draft.hasNonNull(fieldName) && draft.path(fieldName).canConvertToLong()) {
			return;
		}
		Long value = preferredValue != null ? preferredValue : referenceValue;
		if (value != null) {
			draft.put(fieldName, value);
			filledFields.add(fieldName);
		}
	}

	private void fillNumberIfMissing(ObjectNode draft, String fieldName, double value, Set<String> filledFields) {
		if (!draft.hasNonNull(fieldName) || !draft.path(fieldName).isNumber()) {
			draft.put(fieldName, value);
			filledFields.add(fieldName);
		}
	}

	private void fillNumberIfMissing(ObjectNode draft, String fieldName, Double value, Set<String> filledFields) {
		if (value == null) {
			return;
		}
		fillNumberIfMissing(draft, fieldName, value.doubleValue(), filledFields);
	}

	private void fillStringArrayIfMissing(ObjectNode draft, String fieldName, List<String> values, Set<String> filledFields) {
		if (draft.path(fieldName) instanceof ArrayNode arrayNode && !arrayNode.isEmpty()) {
			return;
		}
		ArrayNode array = objectMapper.createArrayNode();
		for (String value : values) {
			if (StringUtils.hasText(value)) {
				array.add(value);
			}
		}
		draft.set(fieldName, array);
		filledFields.add(fieldName);
	}

	private void fillLongArrayIfMissing(ObjectNode draft, String fieldName, Long value, Set<String> filledFields) {
		if (draft.path(fieldName) instanceof ArrayNode arrayNode && !arrayNode.isEmpty()) {
			return;
		}
		ArrayNode array = objectMapper.createArrayNode();
		if (value != null) {
			array.add(value);
		}
		draft.set(fieldName, array);
		filledFields.add(fieldName);
	}

	private void fillSectionsIfMissing(ObjectNode draft, String fieldName, String title, String content, Set<String> filledFields) {
		if (draft.path(fieldName) instanceof ArrayNode arrayNode && !arrayNode.isEmpty()) {
			return;
		}
		ArrayNode sections = objectMapper.createArrayNode();
		ObjectNode section = sections.addObject();
		section.put("title", title);
		section.put("content", content);
		section.set("imagePaths", objectMapper.createArrayNode());
		draft.set(fieldName, sections);
		filledFields.add(fieldName);
	}

	private Long firstLongReference(JsonNode node) {
		if (node instanceof ArrayNode arrayNode) {
			for (JsonNode item : arrayNode) {
				if (item.path("id").canConvertToLong()) {
					return item.path("id").asLong();
				}
			}
		}
		return null;
	}

	private Double firstDishPrice(JsonNode node, Long preferredDishId) {
		if (!(node instanceof ArrayNode arrayNode)) {
			return 89000d;
		}
		for (JsonNode item : arrayNode) {
			if (preferredDishId != null && item.path("id").canConvertToLong() && preferredDishId.equals(item.path("id").asLong())) {
				return item.path("price").isNumber() ? item.path("price").asDouble() : 89000d;
			}
		}
		for (JsonNode item : arrayNode) {
			if (item.path("price").isNumber()) {
				return item.path("price").asDouble();
			}
		}
		return 89000d;
	}

	private String slugify(String value) {
		if (!StringUtils.hasText(value)) {
			return "tea-matcha-sample";
		}
		String slug = value.toLowerCase()
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("(^-|-$)", "");
		return StringUtils.hasText(slug) ? slug : "tea-matcha-sample";
	}

	private void ensureTextField(ObjectNode draft, String fieldName, List<String> missingFields) {
		if (!draft.hasNonNull(fieldName) || !StringUtils.hasText(draft.path(fieldName).asText())) {
			draft.remove(fieldName);
			missingFields.add(fieldName);
		}
	}

	private void ensureNumericField(ObjectNode draft, String fieldName, List<String> missingFields) {
		if (!draft.hasNonNull(fieldName) || !draft.path(fieldName).isNumber()) {
			draft.remove(fieldName);
			missingFields.add(fieldName);
		}
	}

	private void defaultBoolean(ObjectNode draft, String fieldName, boolean value) {
		if (!draft.has(fieldName) || draft.path(fieldName).isNull()) {
			draft.put(fieldName, value);
		}
	}

	private void forceStoreIdIfScoped(ObjectNode draft, String fieldName, FormScope scope) {
		if (scope.storeId() != null) {
			draft.put(fieldName, scope.storeId());
		}
	}

	private void validateLongAgainstReference(
			ObjectNode draft,
			String fieldName,
			Set<Long> allowedIds,
			List<String> warnings,
			List<String> missingFields,
			boolean required
	) {
		if (!draft.hasNonNull(fieldName)) {
			if (required) {
				missingFields.add(fieldName);
			}
			return;
		}
		if (!draft.path(fieldName).canConvertToLong()) {
			draft.remove(fieldName);
			warnings.add("Removed invalid " + fieldName + " because it was not numeric");
			if (required) {
				missingFields.add(fieldName);
			}
			return;
		}
		long value = draft.path(fieldName).asLong();
		if (!allowedIds.isEmpty() && !allowedIds.contains(value)) {
			draft.remove(fieldName);
			warnings.add("Removed " + fieldName + " because it is outside the current database scope");
			if (required) {
				missingFields.add(fieldName);
			}
		}
	}

	private void filterLongArrayAgainstReference(
			ObjectNode draft,
			String fieldName,
			Set<Long> allowedIds,
			List<String> warnings
	) {
		if (!(draft.path(fieldName) instanceof ArrayNode arrayNode)) {
			return;
		}
		ArrayNode filtered = objectMapper.createArrayNode();
		int removedCount = 0;
		for (JsonNode item : arrayNode) {
			if (item.canConvertToLong() && allowedIds.contains(item.asLong())) {
				filtered.add(item.asLong());
			} else {
				removedCount++;
			}
		}
		draft.set(fieldName, filtered);
		if (removedCount > 0) {
			warnings.add("Removed " + removedCount + " invalid item(s) from " + fieldName);
		}
	}

	private void validateLocalTimeString(ObjectNode draft, String fieldName, List<String> warnings, List<String> missingFields) {
		String value = draft.path(fieldName).asText(null);
		if (!StringUtils.hasText(value)) {
			draft.remove(fieldName);
			missingFields.add(fieldName);
			return;
		}
		try {
			LocalTime.parse(value);
		} catch (DateTimeParseException exception) {
			draft.remove(fieldName);
			warnings.add("Removed invalid " + fieldName + " because it was not HH:mm[:ss]");
			missingFields.add(fieldName);
		}
	}

	private void validateInstantField(
			ObjectNode draft,
			String fieldName,
			List<String> warnings,
			List<String> missingFields,
			boolean required
	) {
		String value = draft.path(fieldName).asText(null);
		if (!StringUtils.hasText(value)) {
			draft.remove(fieldName);
			if (required) {
				missingFields.add(fieldName);
			}
			return;
		}
		if (!canParseInstant(value)) {
			draft.remove(fieldName);
			warnings.add("Removed invalid " + fieldName + " because it was not ISO-8601");
			if (required) {
				missingFields.add(fieldName);
			}
		}
	}

	private boolean canParseInstant(String value) {
		try {
			Instant.parse(value);
			return true;
		} catch (DateTimeParseException ignored) {
		}
		try {
			LocalDateTime.parse(value).toInstant(ZoneOffset.UTC);
			return true;
		} catch (DateTimeParseException ignored) {
		}
		try {
			LocalDate.parse(value);
			return true;
		} catch (DateTimeParseException ignored) {
			return false;
		}
	}

	private Set<Long> collectIds(JsonNode arrayNode) {
		Set<Long> ids = new LinkedHashSet<>();
		if (arrayNode instanceof ArrayNode items) {
			for (JsonNode item : items) {
				if (item.path("id").canConvertToLong()) {
					ids.add(item.path("id").asLong());
				}
			}
		}
		return ids;
	}

	private List<String> readStringArray(JsonNode node) {
		List<String> values = new ArrayList<>();
		if (node instanceof ArrayNode arrayNode) {
			for (JsonNode item : arrayNode) {
				if (item.isTextual() && StringUtils.hasText(item.asText())) {
					values.add(item.asText());
				}
			}
		}
		return values;
	}

	private List<String> mergeOrderedStrings(List<String> first, List<String> second) {
		Set<String> ordered = new LinkedHashSet<>();
		ordered.addAll(first);
		ordered.addAll(second);
		return List.copyOf(ordered);
	}

	private ObjectNode buildWrappedSchema(AdminAiFormType formType) {
		ObjectNode schema = baseObjectSchema();
		ObjectNode properties = objectProperties(schema);
		properties.set("draft", buildDraftSchema(formType));
		properties.set("warnings", stringArraySchema());
		properties.set("missingFields", stringArraySchema());
		addRequired(schema, "draft", "warnings", "missingFields");
		return schema;
	}

	private ObjectNode buildDraftSchema(AdminAiFormType formType) {
		return switch (formType) {
			case STORE -> storeDraftSchema();
			case CATEGORY -> categoryDraftSchema();
			case DISH -> dishDraftSchema();
			case EVENT -> eventDraftSchema();
			case NEWS -> newsDraftSchema();
			case STORE_DISH -> storeDishDraftSchema();
		};
	}

	private ObjectNode storeDraftSchema() {
		ObjectNode schema = baseObjectSchema();
		ObjectNode properties = objectProperties(schema);
		properties.set("name", stringSchema());
		properties.set("description", nullableStringSchema());
		properties.set("address", nullableStringSchema());
		properties.set("contactEmail", nullableStringSchema());
		properties.set("phoneNumber", nullableStringSchema());
		properties.set("slug", nullableStringSchema());
		properties.set("latitude", nullableNumberSchema());
		properties.set("longitude", nullableNumberSchema());
		properties.set("area", nullableStringSchema());
		properties.set("positionLabel", nullableStringSchema());
		properties.set("hoursText", nullableStringSchema());
		properties.set("openTime", nullableStringSchema());
		properties.set("closeTime", nullableStringSchema());
		properties.set("personality", nullableStringSchema());
		properties.set("designSignature", nullableStringSchema());
		properties.set("franchiseMood", nullableStringSchema());
		properties.set("specialty", nullableStringSchema());
		properties.set("highlightSummary", nullableStringSchema());
		properties.set("highlightTags", nullableStringArraySchema());
		properties.set("serviceTags", nullableStringArraySchema());
		properties.set("imagePaths", nullableStringArraySchema());
		properties.set("sections", nullableSectionArraySchema());
		properties.set("active", booleanSchema());
		requireAllProperties(schema);
		return schema;
	}

	private ObjectNode categoryDraftSchema() {
		ObjectNode schema = baseObjectSchema();
		ObjectNode properties = objectProperties(schema);
		properties.set("storeId", nullableIntegerSchema());
		properties.set("name", stringSchema());
		properties.set("description", nullableStringSchema());
		properties.set("imagePaths", nullableStringArraySchema());
		properties.set("sortOrder", nullableIntegerSchema());
		properties.set("active", booleanSchema());
		requireAllProperties(schema);
		return schema;
	}

	private ObjectNode dishDraftSchema() {
		ObjectNode schema = baseObjectSchema();
		ObjectNode properties = objectProperties(schema);
		properties.set("categoryId", integerSchema());
		properties.set("name", stringSchema());
		properties.set("description", nullableStringSchema());
		properties.set("note", nullableStringSchema());
		properties.set("price", numberSchema());
		properties.set("status", nullableStringSchema());
		properties.set("available", nullableBooleanSchema());
		properties.set("franchiseRequired", nullableBooleanSchema());
		properties.set("franchiseNote", nullableStringSchema());
		properties.set("highlightSummary", nullableStringSchema());
		properties.set("highlightTags", nullableStringArraySchema());
		properties.set("imagePaths", nullableStringArraySchema());
		properties.set("sections", nullableSectionArraySchema());
		properties.set("active", nullableBooleanSchema());
		requireAllProperties(schema);
		return schema;
	}

	private ObjectNode eventDraftSchema() {
		ObjectNode schema = baseObjectSchema();
		ObjectNode properties = objectProperties(schema);
		properties.set("storeId", integerSchema());
		properties.set("name", stringSchema());
		properties.set("slug", nullableStringSchema());
		properties.set("description", nullableStringSchema());
		properties.set("location", nullableStringSchema());
		properties.set("scheduleText", nullableStringSchema());
		properties.set("highlightSummary", nullableStringSchema());
		properties.set("highlightTags", nullableStringArraySchema());
		properties.set("capacity", nullableIntegerSchema());
		properties.set("bookedCount", nullableIntegerSchema());
		properties.set("featuredDishIds", nullableIntegerArraySchema());
		properties.set("imagePaths", nullableStringArraySchema());
		properties.set("sections", nullableSectionArraySchema());
		properties.set("startsAt", stringSchema());
		properties.set("endsAt", stringSchema());
		properties.set("active", booleanSchema());
		requireAllProperties(schema);
		return schema;
	}

	private ObjectNode newsDraftSchema() {
		ObjectNode schema = baseObjectSchema();
		ObjectNode properties = objectProperties(schema);
		properties.set("title", stringSchema());
		properties.set("slug", nullableStringSchema());
		properties.set("summary", stringSchema());
		properties.set("content", stringSchema());
		properties.set("relatedStoreId", nullableIntegerSchema());
		properties.set("tags", nullableStringArraySchema());
		properties.set("imagePaths", nullableStringArraySchema());
		properties.set("sections", nullableSectionArraySchema());
		properties.set("featured", booleanSchema());
		properties.set("published", booleanSchema());
		properties.set("publishedAt", nullableStringSchema());
		requireAllProperties(schema);
		return schema;
	}

	private ObjectNode storeDishDraftSchema() {
		ObjectNode schema = baseObjectSchema();
		ObjectNode properties = objectProperties(schema);
		properties.set("storeId", integerSchema());
		properties.set("dishId", integerSchema());
		properties.set("quantity", integerSchema());
		properties.set("available", booleanSchema());
		properties.set("priceOverride", nullableNumberSchema());
		requireAllProperties(schema);
		return schema;
	}

	private ObjectNode sectionArraySchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "array");
		ObjectNode item = baseObjectSchema();
		ObjectNode properties = objectProperties(item);
		properties.set("title", stringSchema());
		properties.set("content", stringSchema());
		properties.set("imagePaths", nullableStringArraySchema());
		requireAllProperties(item);
		schema.set("items", item);
		return schema;
	}

	private ObjectNode stringSchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "string");
		return schema;
	}

	private ObjectNode numberSchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "number");
		return schema;
	}

	private ObjectNode nullableNumberSchema() {
		return nullableTypeSchema("number");
	}

	private ObjectNode integerSchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "integer");
		return schema;
	}

	private ObjectNode nullableIntegerSchema() {
		return nullableTypeSchema("integer");
	}

	private ObjectNode booleanSchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "boolean");
		return schema;
	}

	private ObjectNode nullableBooleanSchema() {
		return nullableTypeSchema("boolean");
	}

	private ObjectNode stringArraySchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "array");
		schema.set("items", stringSchema());
		return schema;
	}

	private ObjectNode nullableStringArraySchema() {
		ObjectNode schema = stringArraySchema();
		ArrayNode types = objectMapper.createArrayNode();
		types.add("array");
		types.add("null");
		schema.set("type", types);
		return schema;
	}

	private ObjectNode integerArraySchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "array");
		schema.set("items", integerSchema());
		return schema;
	}

	private ObjectNode nullableIntegerArraySchema() {
		ObjectNode schema = integerArraySchema();
		ArrayNode types = objectMapper.createArrayNode();
		types.add("array");
		types.add("null");
		schema.set("type", types);
		return schema;
	}

	private ObjectNode nullableSectionArraySchema() {
		ObjectNode schema = sectionArraySchema();
		ArrayNode types = objectMapper.createArrayNode();
		types.add("array");
		types.add("null");
		schema.set("type", types);
		return schema;
	}

	private ObjectNode baseObjectSchema() {
		ObjectNode schema = objectMapper.createObjectNode();
		schema.put("type", "object");
		schema.putObject("properties");
		schema.put("additionalProperties", false);
		return schema;
	}

	private ObjectNode objectProperties(ObjectNode schema) {
		return (ObjectNode) schema.get("properties");
	}

	private void addRequired(ObjectNode schema, String... fields) {
		ArrayNode required = schema.putArray("required");
		for (String field : fields) {
			required.add(field);
		}
	}

	private void requireAllProperties(ObjectNode schema) {
		ArrayNode required = schema.putArray("required");
		objectProperties(schema).fieldNames().forEachRemaining(required::add);
	}

	private ObjectNode nullableStringSchema() {
		return nullableTypeSchema("string");
	}

	private ObjectNode nullableTypeSchema(String type) {
		ObjectNode schema = objectMapper.createObjectNode();
		ArrayNode types = schema.putArray("type");
		types.add(type);
		types.add("null");
		return schema;
	}

	private Store findStore(Long id) {
		return storeRepository.findById(id)
				.orElseThrow(() -> new BadRequestException("Store not found"));
	}

	private Long requireManagerWorkingStoreId(User operator) {
		if (operator.getWorkingStore() == null || operator.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Manager account must be assigned to a working store");
		}
		return operator.getWorkingStore().getId();
	}

	private record FormScope(Long storeId, String storeName) {
	}

	private record SanitizedDraft(ObjectNode draft, List<String> warnings, List<String> missingFields) {
	}

	private record AutoFillResult(Set<String> filledFields) {
	}
}
