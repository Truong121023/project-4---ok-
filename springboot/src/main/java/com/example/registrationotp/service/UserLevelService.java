package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.UserCurrentLevelResponse;
import com.example.registrationotp.dto.UserLevelDefinitionRequest;
import com.example.registrationotp.dto.UserLevelDefinitionResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserLevelDefinition;
import com.example.registrationotp.repository.OrderRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.UserLevelDefinitionRepository;

@Service
public class UserLevelService {

	private final SessionAuthService sessionAuthService;
	private final UserLevelDefinitionRepository userLevelDefinitionRepository;
	private final StoreRepository storeRepository;
	private final OrderRepository orderRepository;

	public UserLevelService(
			SessionAuthService sessionAuthService,
			UserLevelDefinitionRepository userLevelDefinitionRepository,
			StoreRepository storeRepository,
			OrderRepository orderRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.userLevelDefinitionRepository = userLevelDefinitionRepository;
		this.storeRepository = storeRepository;
		this.orderRepository = orderRepository;
	}

	@Transactional(readOnly = true)
	public List<UserLevelDefinitionResponse> listDefinitions(String authorizationHeader) {
		sessionAuthService.requireAdmin(authorizationHeader);
		return userLevelDefinitionRepository.findAll().stream()
				.sorted((left, right) -> {
					int storeCompare = left.getStore().getId().compareTo(right.getStore().getId());
					if (storeCompare != 0) {
						return storeCompare;
					}
					return left.getMinPaidAmount().compareTo(right.getMinPaidAmount());
				})
				.map(UserLevelDefinitionResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public UserLevelDefinitionResponse getDefinition(String authorizationHeader, Long id) {
		sessionAuthService.requireAdmin(authorizationHeader);
		return UserLevelDefinitionResponse.from(findDefinition(id));
	}

	@Transactional
	public UserLevelDefinitionResponse createDefinition(String authorizationHeader, UserLevelDefinitionRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		Store store = findStore(request.storeId());
		String normalizedCode = normalizeCode(request.code());
		if (userLevelDefinitionRepository.existsByStoreIdAndCodeIgnoreCase(store.getId(), normalizedCode)) {
			throw new ConflictException("User level code already exists for this store");
		}
		UserLevelDefinition definition = new UserLevelDefinition();
		applyRequest(definition, store, request, normalizedCode);
		return UserLevelDefinitionResponse.from(userLevelDefinitionRepository.save(definition));
	}

	@Transactional
	public UserLevelDefinitionResponse updateDefinition(String authorizationHeader, Long id, UserLevelDefinitionRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		UserLevelDefinition definition = findDefinition(id);
		Store store = findStore(request.storeId());
		String normalizedCode = normalizeCode(request.code());
		if (userLevelDefinitionRepository.existsByStoreIdAndCodeIgnoreCaseAndIdNot(store.getId(), normalizedCode, id)) {
			throw new ConflictException("User level code already exists for this store");
		}
		applyRequest(definition, store, request, normalizedCode);
		return UserLevelDefinitionResponse.from(userLevelDefinitionRepository.save(definition));
	}

	@Transactional
	public MessageResponse deleteDefinition(String authorizationHeader, Long id) {
		sessionAuthService.requireAdmin(authorizationHeader);
		userLevelDefinitionRepository.delete(findDefinition(id));
		return new MessageResponse("User level deleted successfully");
	}

	@Transactional(readOnly = true)
	public List<UserCurrentLevelResponse> listCurrentLevels(String authorizationHeader, Long storeId) {
		User user = requireBuyerUser(authorizationHeader);
		Instant now = Instant.now();
		if (storeId != null) {
			return List.of(toResponse(resolveCurrentLevelSnapshot(user, findStore(storeId), now)));
		}

		Map<Long, Store> stores = new LinkedHashMap<>();
		for (UserLevelDefinition definition : userLevelDefinitionRepository.findAllByActiveTrueOrderByStoreIdAscMinPaidAmountAsc()) {
			stores.putIfAbsent(definition.getStore().getId(), definition.getStore());
		}
		return stores.values().stream()
				.map(store -> toResponse(resolveCurrentLevelSnapshot(user, store, now)))
				.toList();
	}

	@Transactional(readOnly = true)
	public CurrentLevelSnapshot resolveCurrentLevelSnapshot(User user, Long storeId, Instant asOf) {
		return resolveCurrentLevelSnapshot(user, findStore(storeId), asOf);
	}

	private CurrentLevelSnapshot resolveCurrentLevelSnapshot(User user, Store store, Instant asOf) {
		QuarterWindow currentQuarter = quarterWindow(asOf);
		QuarterWindow evaluatedQuarter = previousQuarter(currentQuarter);
		BigDecimal paidAmount = orderRepository.sumPaidTotalAmountByUserIdAndStoreIdBetween(
				user.getId(),
				store.getId(),
				evaluatedQuarter.startsAt(),
				evaluatedQuarter.endsAt()
		);
		List<UserLevelDefinition> definitions = userLevelDefinitionRepository.findAllByStoreIdAndActiveTrueOrderByMinPaidAmountAsc(store.getId());
		UserLevelDefinition matchedLevel = null;
		for (UserLevelDefinition definition : definitions) {
			if (definition.getMinPaidAmount().compareTo(paidAmount) <= 0) {
				matchedLevel = definition;
			}
		}
		return new CurrentLevelSnapshot(store, currentQuarter, evaluatedQuarter, paidAmount, matchedLevel);
	}

	private UserCurrentLevelResponse toResponse(CurrentLevelSnapshot snapshot) {
		UserLevelDefinition level = snapshot.level();
		return new UserCurrentLevelResponse(
				snapshot.store().getId(),
				snapshot.store().getSlug(),
				snapshot.store().getName(),
				snapshot.currentQuarter().year(),
				snapshot.currentQuarter().quarter(),
				snapshot.evaluatedQuarter().year(),
				snapshot.evaluatedQuarter().quarter(),
				snapshot.qualifyingPaidAmount(),
				level != null ? level.getId() : null,
				level != null ? level.getCode() : null,
				level != null ? level.getName() : null,
				level != null ? level.getMinPaidAmount() : null
		);
	}

	private void applyRequest(
			UserLevelDefinition definition,
			Store store,
			UserLevelDefinitionRequest request,
			String normalizedCode
	) {
		if (!StringUtils.hasText(request.name())) {
			throw new BadRequestException("name is required");
		}
		definition.setStore(store);
		definition.setCode(normalizedCode);
		definition.setName(request.name().trim());
		definition.setMinPaidAmount(request.minPaidAmount());
		definition.setActive(request.active());
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can view loyalty levels");
		}
		return user;
	}

	private UserLevelDefinition findDefinition(Long id) {
		return userLevelDefinitionRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("User level not found"));
	}

	private Store findStore(Long id) {
		return storeRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Store not found"));
	}

	private String normalizeCode(String code) {
		String trimmed = code == null ? null : code.trim();
		if (!StringUtils.hasText(trimmed)) {
			throw new BadRequestException("code is required");
		}
		return trimmed.toUpperCase(Locale.ROOT);
	}

	private QuarterWindow quarterWindow(Instant instant) {
		ZonedDateTime dateTime = instant.atZone(ZoneOffset.UTC);
		int month = dateTime.getMonthValue();
		int quarter = ((month - 1) / 3) + 1;
		int startMonth = ((quarter - 1) * 3) + 1;
		ZonedDateTime start = ZonedDateTime.of(dateTime.getYear(), startMonth, 1, 0, 0, 0, 0, ZoneOffset.UTC);
		return new QuarterWindow(dateTime.getYear(), quarter, start.toInstant(), start.plusMonths(3).toInstant());
	}

	private QuarterWindow previousQuarter(QuarterWindow current) {
		if (current.quarter() == 1) {
			ZonedDateTime start = ZonedDateTime.of(current.year() - 1, 10, 1, 0, 0, 0, 0, ZoneOffset.UTC);
			return new QuarterWindow(current.year() - 1, 4, start.toInstant(), start.plusMonths(3).toInstant());
		}
		int previousQuarter = current.quarter() - 1;
		int startMonth = ((previousQuarter - 1) * 3) + 1;
		ZonedDateTime start = ZonedDateTime.of(current.year(), startMonth, 1, 0, 0, 0, 0, ZoneOffset.UTC);
		return new QuarterWindow(current.year(), previousQuarter, start.toInstant(), start.plusMonths(3).toInstant());
	}

	public record CurrentLevelSnapshot(
			Store store,
			QuarterWindow currentQuarter,
			QuarterWindow evaluatedQuarter,
			BigDecimal qualifyingPaidAmount,
			UserLevelDefinition level
	) {
	}

	public record QuarterWindow(
			int year,
			int quarter,
			Instant startsAt,
			Instant endsAt
	) {
	}
}
