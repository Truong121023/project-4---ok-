package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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
		return userLevelDefinitionRepository.findAllByOrderByMinPaidAmountAscCodeAsc().stream()
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
		String normalizedCode = normalizeCode(request.code());
		if (userLevelDefinitionRepository.existsByCodeIgnoreCase(normalizedCode)) {
			throw new ConflictException("User level code already exists");
		}
		UserLevelDefinition definition = new UserLevelDefinition();
		applyRequest(definition, request, normalizedCode);
		return UserLevelDefinitionResponse.from(userLevelDefinitionRepository.save(definition));
	}

	@Transactional
	public UserLevelDefinitionResponse updateDefinition(String authorizationHeader, Long id, UserLevelDefinitionRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		UserLevelDefinition definition = findDefinition(id);
		String normalizedCode = normalizeCode(request.code());
		if (userLevelDefinitionRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
			throw new ConflictException("User level code already exists");
		}
		applyRequest(definition, request, normalizedCode);
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
		return List.of(toResponse(resolveCurrentLevelSnapshot(user, Instant.now())));
	}

	@Transactional(readOnly = true)
	public List<UserLevelDefinitionResponse> listActiveDefinitionsForUser(String authorizationHeader) {
		requireBuyerUser(authorizationHeader);
		return activeDefinitionsForMatching().stream()
				.map(UserLevelDefinitionResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public CurrentLevelSnapshot resolveCurrentLevelSnapshot(User user, Instant asOf) {
		List<UserLevelDefinition> activeDefinitions = activeDefinitionsForMatching();
		int creditPoints = Math.max(user.getCreditPoints(), 0);
		BigDecimal lifetimePaidAmount = resolveMembershipPaidAmount(user);
		int membershipPoints = lifetimePaidAmount
				.max(BigDecimal.ZERO)
				.divideToIntegralValue(BigDecimal.valueOf(1000))
				.intValue();
		UserLevelDefinition currentLevel = null;
		UserLevelDefinition nextLevel = null;
		for (UserLevelDefinition definition : activeDefinitions) {
			if (definition.getMinPaidAmount().compareTo(BigDecimal.valueOf(membershipPoints)) <= 0) {
				currentLevel = definition;
				continue;
			}
			nextLevel = definition;
			break;
		}

		BigDecimal matchedThreshold = currentLevel != null ? currentLevel.getMinPaidAmount() : null;
		List<Long> matchedDefinitionIds = matchedThreshold == null
				? List.of()
				: activeDefinitions.stream()
						.filter(definition -> definition.getMinPaidAmount().compareTo(matchedThreshold) == 0)
						.map(UserLevelDefinition::getId)
						.distinct()
						.toList();

		return new CurrentLevelSnapshot(
				quarterWindow(asOf),
				lifetimePaidAmount,
				membershipPoints,
				creditPoints,
				currentLevel,
				matchedDefinitionIds,
				nextLevel
		);
	}

	@Transactional(readOnly = true)
	public BigDecimal resolveMembershipPaidAmount(User user) {
		if (user == null || user.getId() == null) {
			return BigDecimal.ZERO;
		}
		return orderRepository.sumPaidTotalAmountByUserId(user.getId()).max(BigDecimal.ZERO);
	}

	@Transactional(readOnly = true)
	public int resolveMembershipPoints(User user) {
		return resolveMembershipPaidAmount(user)
				.divideToIntegralValue(BigDecimal.valueOf(1000))
				.intValue();
	}

	@Transactional(readOnly = true)
	public List<Long> resolveCurrentLevelDefinitionIds(User user, Instant asOf) {
		return resolveCurrentLevelSnapshot(user, asOf).matchedDefinitionIds();
	}

	private UserCurrentLevelResponse toResponse(CurrentLevelSnapshot snapshot) {
		UserLevelDefinition level = snapshot.level();
		UserLevelDefinition nextLevel = snapshot.nextLevel();
		return new UserCurrentLevelResponse(
				null,
				"global",
				"Toan he thong",
				snapshot.currentQuarter().year(),
				snapshot.currentQuarter().quarter(),
				snapshot.currentQuarter().year(),
				snapshot.currentQuarter().quarter(),
				snapshot.qualifyingPaidAmount(),
				level != null ? level.getId() : null,
				level != null ? level.getCode() : null,
				level != null ? level.getName() : null,
				level != null ? level.getMinPaidAmount() : null,
				snapshot.creditPoints(),
				null,
				nextLevel != null ? nextLevel.getId() : null,
				nextLevel != null ? nextLevel.getCode() : null,
				nextLevel != null ? nextLevel.getName() : null,
				null,
				snapshot.membershipPoints(),
				level != null ? level.getMinPaidAmount() : null,
				nextLevel != null ? nextLevel.getMinPaidAmount() : null
		);
	}

	private void applyRequest(
			UserLevelDefinition definition,
			UserLevelDefinitionRequest request,
			String normalizedCode
	) {
		if (!StringUtils.hasText(request.name())) {
			throw new BadRequestException("name is required");
		}
		BigDecimal minMembershipPoints = resolveMinMembershipPoints(request);
		Store store = request.storeId() == null ? null : findStore(request.storeId());
		definition.setStore(store);
		definition.setCode(normalizedCode);
		definition.setName(request.name().trim());
		definition.setMinPaidAmount(minMembershipPoints);
		definition.setActive(request.active());
	}

	private BigDecimal resolveMinMembershipPoints(UserLevelDefinitionRequest request) {
		BigDecimal minMembershipPoints = request.minMembershipPoints() != null
				? request.minMembershipPoints()
				: request.minCreditPoints() != null
						? request.minCreditPoints()
				: request.minPaidAmount();
		if (minMembershipPoints == null) {
			throw new BadRequestException("minMembershipPoints is required");
		}
		if (minMembershipPoints.compareTo(BigDecimal.ZERO) < 0) {
			throw new BadRequestException("minMembershipPoints must be at least 0");
		}
		return minMembershipPoints;
	}

	private List<UserLevelDefinition> activeDefinitionsForMatching() {
		List<UserLevelDefinition> globalDefinitions = userLevelDefinitionRepository.findAllByStoreIsNullAndActiveTrueOrderByMinPaidAmountAscCodeAsc();
		if (!globalDefinitions.isEmpty()) {
			return globalDefinitions;
		}
		return userLevelDefinitionRepository.findAllByActiveTrueOrderByMinPaidAmountAscCodeAsc().stream()
				.sorted(Comparator
						.comparing(UserLevelDefinition::getMinPaidAmount)
						.thenComparing(UserLevelDefinition::getCode, String.CASE_INSENSITIVE_ORDER))
				.toList();
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

	public record CurrentLevelSnapshot(
			QuarterWindow currentQuarter,
			BigDecimal qualifyingPaidAmount,
			int membershipPoints,
			int creditPoints,
			UserLevelDefinition level,
			List<Long> matchedDefinitionIds,
			UserLevelDefinition nextLevel
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
