package com.example.registrationotp.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.EmployeeAttendanceResponse;
import com.example.registrationotp.dto.EmployeeAttendanceSummaryResponse;
import com.example.registrationotp.dto.EmployeeWorkScheduleEntryRequest;
import com.example.registrationotp.dto.EmployeeWorkScheduleMonthResponse;
import com.example.registrationotp.dto.EmployeeWorkScheduleMonthlyUpsertRequest;
import com.example.registrationotp.dto.EmployeeWorkScheduleResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.EmployeeAttendance;
import com.example.registrationotp.model.EmployeeWorkSchedule;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.EmployeeAttendanceRepository;
import com.example.registrationotp.repository.EmployeeWorkScheduleRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.UserRepository;

@Service
public class AttendanceService {

	private static final int DEFAULT_PAGE_SIZE = 10;
	private static final int MAX_PAGE_SIZE = 100;
	private static final Sort DEFAULT_ATTENDANCE_SORT = Sort.by(Sort.Direction.DESC, "workDate")
			.and(Sort.by(Sort.Direction.DESC, "checkInAt"));
	private static final Sort DEFAULT_WORK_SCHEDULE_SORT = Sort.by(Sort.Direction.ASC, "workDate")
			.and(Sort.by(Sort.Direction.ASC, "scheduledStartTime"))
			.and(Sort.by(Sort.Direction.ASC, "id"));
	private static final java.util.Comparator<EmployeeWorkSchedule> DEFAULT_WORK_SCHEDULE_COMPARATOR =
			java.util.Comparator.comparing(EmployeeWorkSchedule::getWorkDate)
					.thenComparing(EmployeeWorkSchedule::getScheduledStartTime)
					.thenComparing(EmployeeWorkSchedule::getId, java.util.Comparator.nullsLast(Long::compareTo));
	private static final Set<Role> EMPLOYEE_ROLES = EnumSet.of(Role.MANAGER, Role.SHIPPER);

	private final SessionAuthService sessionAuthService;
	private final EmployeeAttendanceRepository employeeAttendanceRepository;
	private final EmployeeWorkScheduleRepository employeeWorkScheduleRepository;
	private final UserRepository userRepository;
	private final StoreRepository storeRepository;
	private final ZoneId zoneId = ZoneId.systemDefault();

	public AttendanceService(
			SessionAuthService sessionAuthService,
			EmployeeAttendanceRepository employeeAttendanceRepository,
			EmployeeWorkScheduleRepository employeeWorkScheduleRepository,
			UserRepository userRepository,
			StoreRepository storeRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.employeeAttendanceRepository = employeeAttendanceRepository;
		this.employeeWorkScheduleRepository = employeeWorkScheduleRepository;
		this.userRepository = userRepository;
		this.storeRepository = storeRepository;
	}

	@Transactional(readOnly = true)
	public EmployeeAttendanceResponse getTodayAttendance(String authorizationHeader) {
		User employee = requireEmployee(authorizationHeader);
		LocalDate today = LocalDate.now(zoneId);
		EmployeeAttendance attendance = employeeAttendanceRepository.findByUserIdAndWorkDate(employee.getId(), today)
				.orElseThrow(() -> new NotFoundException("Attendance not found for today"));
		return EmployeeAttendanceResponse.from(attendance);
	}

	@Transactional(readOnly = true)
	public EmployeeWorkScheduleResponse getTodayWorkSchedule(String authorizationHeader) {
		User employee = requireEmployee(authorizationHeader);
		LocalDate today = LocalDate.now(zoneId);
		EmployeeWorkSchedule schedule = employeeWorkScheduleRepository.findByUserIdAndWorkDate(employee.getId(), today)
				.orElseThrow(() -> new NotFoundException("Work schedule not found for today"));
		return EmployeeWorkScheduleResponse.from(schedule, null);
	}

	@Transactional
	public EmployeeAttendanceResponse checkIn(String authorizationHeader) {
		User employee = requireEmployee(authorizationHeader);
		employeeAttendanceRepository.findTopByUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(employee.getId())
				.ifPresent(existingAttendance -> {
					throw new ConflictException("You have already checked in and not checked out yet");
				});

		LocalDate today = LocalDate.now(zoneId);
		employeeAttendanceRepository.findByUserIdAndWorkDate(employee.getId(), today)
				.ifPresent(existingAttendance -> {
					throw new ConflictException("You have already checked in today");
				});

		EmployeeWorkSchedule workSchedule = employeeWorkScheduleRepository.findByUserIdAndWorkDate(employee.getId(), today)
				.orElseThrow(() -> new BadRequestException("You do not have a work schedule for today"));

		EmployeeAttendance attendance = new EmployeeAttendance();
		attendance.setUser(employee);
		attendance.setStore(workSchedule.getStore());
		attendance.setWorkSchedule(workSchedule);
		attendance.setEmployeeRole(employee.getRole());
		attendance.setWorkDate(today);
		attendance.setCheckInAt(Instant.now());
		attendance.setCheckOutAt(null);
		return EmployeeAttendanceResponse.from(employeeAttendanceRepository.save(attendance));
	}

	@Transactional
	public EmployeeAttendanceResponse checkOut(String authorizationHeader) {
		User employee = requireEmployee(authorizationHeader);
		EmployeeAttendance attendance = employeeAttendanceRepository.findTopByUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(employee.getId())
				.orElseThrow(() -> new BadRequestException("You have not checked in yet"));
		attendance.setCheckOutAt(Instant.now());
		return EmployeeAttendanceResponse.from(employeeAttendanceRepository.save(attendance));
	}

	@Transactional(readOnly = true)
	public PageResponse<EmployeeAttendanceResponse> listMyAttendanceHistory(
			String authorizationHeader,
			LocalDate fromDate,
			LocalDate toDate,
			int page,
			int size
	) {
		User employee = requireEmployee(authorizationHeader);
		validateDateRange(fromDate, toDate);
		return PageResponse.from(employeeAttendanceRepository.findAll(
				myAttendanceSpecification(employee.getId(), fromDate, toDate),
				buildAttendancePageable(page, size)
		).map(EmployeeAttendanceResponse::from));
	}

	@Transactional(readOnly = true)
	public EmployeeWorkScheduleMonthResponse listMyMonthlyWorkSchedules(
			String authorizationHeader,
			String month
	) {
		User employee = requireEmployee(authorizationHeader);
		YearMonth resolvedMonth = parseMonth(month);
		LocalDate fromDate = resolvedMonth.atDay(1);
		LocalDate toDate = resolvedMonth.atEndOfMonth();
		List<EmployeeWorkSchedule> schedules = employeeWorkScheduleRepository.findAllByUserIdAndWorkDateBetween(
				employee.getId(),
				fromDate,
				toDate
		);
		schedules.sort(DEFAULT_WORK_SCHEDULE_COMPARATOR);
		Store workingStore = employee.getWorkingStore();
		return new EmployeeWorkScheduleMonthResponse(
				resolvedMonth.toString(),
				workingStore != null ? workingStore.getId() : null,
				workingStore != null ? workingStore.getName() : null,
				schedules.stream()
						.map(schedule -> EmployeeWorkScheduleResponse.from(schedule, null))
						.toList()
		);
	}

	@Transactional(readOnly = true)
	public PageResponse<EmployeeAttendanceResponse> listAttendances(
			String authorizationHeader,
			Long storeId,
			Long userId,
			Role role,
			LocalDate workDate,
			Boolean checkedOut,
			String search,
			int page,
			int size
	) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Long visibleStoreId = resolveVisibleStoreId(operator, storeId);
		validateEmployeeRoleFilter(role);
		return PageResponse.from(employeeAttendanceRepository.findAll(
				attendanceSpecification(visibleStoreId, userId, role, workDate, checkedOut, search),
				buildAttendancePageable(page, size)
		).map(EmployeeAttendanceResponse::from));
	}

	@Transactional(readOnly = true)
	public EmployeeAttendanceSummaryResponse getAttendanceSummary(
			String authorizationHeader,
			Long storeId,
			LocalDate workDate
	) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Long visibleStoreId = resolveVisibleStoreId(operator, storeId);
		LocalDate resolvedWorkDate = workDate == null ? LocalDate.now(zoneId) : workDate;

		List<EmployeeWorkSchedule> schedules = employeeWorkScheduleRepository.findAll(
				scheduleSummarySpecification(visibleStoreId, resolvedWorkDate),
				DEFAULT_WORK_SCHEDULE_SORT
		);
		List<EmployeeAttendance> attendances = employeeAttendanceRepository.findAll(
				attendanceSummarySpecification(visibleStoreId, resolvedWorkDate),
				DEFAULT_ATTENDANCE_SORT
		);

		long totalAssignedStaff = schedules.stream()
				.filter(schedule -> schedule.getEmployeeRole() == Role.MANAGER)
				.count();
		long totalAssignedShippers = schedules.stream()
				.filter(schedule -> schedule.getEmployeeRole() == Role.SHIPPER)
				.count();
		long presentStaffCount = attendances.stream()
				.filter(attendance -> attendance.getEmployeeRole() == Role.MANAGER)
				.count();
		long presentShipperCount = attendances.stream()
				.filter(attendance -> attendance.getEmployeeRole() == Role.SHIPPER)
				.count();
		long checkedOutCount = attendances.stream()
				.filter(attendance -> attendance.getCheckOutAt() != null)
				.count();

		Store store = visibleStoreId == null ? null : findStore(visibleStoreId);
		return new EmployeeAttendanceSummaryResponse(
				resolvedWorkDate,
				store != null ? store.getId() : null,
				store != null ? store.getName() : null,
				schedules.size(),
				totalAssignedStaff,
				totalAssignedShippers,
				attendances.size(),
				presentStaffCount,
				presentShipperCount,
				checkedOutCount,
				Math.max(attendances.size() - checkedOutCount, 0)
		);
	}

	@Transactional
	public EmployeeWorkScheduleMonthResponse upsertMonthlyWorkSchedules(
			String authorizationHeader,
			EmployeeWorkScheduleMonthlyUpsertRequest request
	) {
		sessionAuthService.requireAdmin(authorizationHeader);

		Store store = findStore(request.storeId());
		YearMonth month = parseMonth(request.month());
		LocalDate fromDate = month.atDay(1);
		LocalDate toDate = month.atEndOfMonth();

		List<EmployeeWorkSchedule> existingSchedules = employeeWorkScheduleRepository.findAllByStoreIdAndWorkDateBetween(
				store.getId(),
				fromDate,
				toDate
		);
		Map<String, EmployeeWorkSchedule> existingByKey = new HashMap<>();
		for (EmployeeWorkSchedule schedule : existingSchedules) {
			existingByKey.put(scheduleKey(schedule.getUser().getId(), schedule.getWorkDate()), schedule);
		}

		Map<String, EmployeeAttendance> attendanceByKey = mapAttendancesByKey(
				employeeAttendanceRepository.findAllByStoreIdAndWorkDateBetween(store.getId(), fromDate, toDate)
		);
		Map<Long, User> userCache = new HashMap<>();
		Map<String, Boolean> requestKeys = new HashMap<>();
		List<EmployeeWorkSchedule> schedulesToSave = new ArrayList<>();

		for (EmployeeWorkScheduleEntryRequest entry : request.entries()) {
			validateScheduleEntry(entry, month);
			User employee = userCache.computeIfAbsent(entry.userId(), this::findEmployee);
			validateEmployeeBelongsToStore(employee, store);

			String key = scheduleKey(employee.getId(), entry.workDate());
			if (requestKeys.putIfAbsent(key, Boolean.TRUE) != null) {
				throw new BadRequestException("Duplicate work schedule entry for userId=%d on %s".formatted(
						employee.getId(),
						entry.workDate()
				));
			}

			EmployeeWorkSchedule schedule = existingByKey.remove(key);
			if (schedule == null) {
				schedule = new EmployeeWorkSchedule();
				schedule.setUser(employee);
				schedule.setStore(store);
				schedule.setEmployeeRole(employee.getRole());
				schedule.setWorkDate(entry.workDate());
			}
			schedule.setStore(store);
			schedule.setEmployeeRole(employee.getRole());
			schedule.setScheduledStartTime(entry.scheduledStartTime());
			schedule.setScheduledEndTime(entry.scheduledEndTime());
			schedule.setNote(normalizeText(entry.note()));
			schedulesToSave.add(schedule);
		}

		List<EmployeeWorkSchedule> schedulesToDelete = new ArrayList<>();
		for (EmployeeWorkSchedule schedule : existingByKey.values()) {
			String key = scheduleKey(schedule.getUser().getId(), schedule.getWorkDate());
			if (attendanceByKey.containsKey(key)) {
				throw new ConflictException("Cannot remove work schedule for userId=%d on %s because attendance already exists".formatted(
						schedule.getUser().getId(),
						schedule.getWorkDate()
				));
			}
			schedulesToDelete.add(schedule);
		}
		if (!schedulesToDelete.isEmpty()) {
			employeeWorkScheduleRepository.deleteAll(schedulesToDelete);
		}

		employeeWorkScheduleRepository.saveAll(schedulesToSave);
		return buildMonthlyWorkScheduleResponse(store, month, schedulesToSave);
	}

	@Transactional(readOnly = true)
	public EmployeeWorkScheduleMonthResponse listMonthlyWorkSchedules(
			String authorizationHeader,
			Long storeId,
			String month,
			Long userId,
			Role role,
			String search
	) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Long visibleStoreId = resolveRequiredStoreId(operator, storeId);
		validateEmployeeRoleFilter(role);

		Store store = findStore(visibleStoreId);
		YearMonth resolvedMonth = parseMonth(month);
		LocalDate fromDate = resolvedMonth.atDay(1);
		LocalDate toDate = resolvedMonth.atEndOfMonth();

		List<EmployeeWorkSchedule> schedules = employeeWorkScheduleRepository.findAll(
				workScheduleSpecification(visibleStoreId, userId, role, fromDate, toDate, search),
				DEFAULT_WORK_SCHEDULE_SORT
		);
		return buildMonthlyWorkScheduleResponse(store, resolvedMonth, schedules);
	}

	private User requireEmployee(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (!EMPLOYEE_ROLES.contains(user.getRole())) {
			throw new ForbiddenException("Only MANAGER and SHIPPER accounts can use attendance");
		}
		if (!user.isEnabled()) {
			throw new ForbiddenException("Employee account is disabled");
		}
		if (user.getWorkingStore() == null || user.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Employee account must be assigned to a working store");
		}
		return user;
	}

	private Long resolveVisibleStoreId(User operator, Long requestedStoreId) {
		if (operator.getRole() != Role.MANAGER) {
			if (requestedStoreId != null) {
				findStore(requestedStoreId);
			}
			return requestedStoreId;
		}
		Long workingStoreId = requireWorkingStoreId(operator);
		if (requestedStoreId != null && !workingStoreId.equals(requestedStoreId)) {
			throw new ForbiddenException("Attendance data does not belong to your store");
		}
		return workingStoreId;
	}

	private Long resolveRequiredStoreId(User operator, Long requestedStoreId) {
		Long visibleStoreId = resolveVisibleStoreId(operator, requestedStoreId);
		if (visibleStoreId == null) {
			throw new BadRequestException("storeId is required");
		}
		return visibleStoreId;
	}

	private Long requireWorkingStoreId(User operator) {
		if (operator.getWorkingStore() == null || operator.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Manager account must be assigned to a working store");
		}
		return operator.getWorkingStore().getId();
	}

	private void validateEmployeeRoleFilter(Role role) {
		if (role != null && !EMPLOYEE_ROLES.contains(role)) {
			throw new BadRequestException("role filter only supports MANAGER or SHIPPER");
		}
	}

	private void validateDateRange(LocalDate fromDate, LocalDate toDate) {
		if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
			throw new BadRequestException("toDate must be on or after fromDate");
		}
	}

	private void validateScheduleEntry(EmployeeWorkScheduleEntryRequest entry, YearMonth month) {
		if (!YearMonth.from(entry.workDate()).equals(month)) {
			throw new BadRequestException("workDate %s does not belong to month %s".formatted(
					entry.workDate(),
					month
			));
		}
		if (!entry.scheduledEndTime().isAfter(entry.scheduledStartTime())) {
			throw new BadRequestException("scheduledEndTime must be after scheduledStartTime");
		}
	}

	private void validateEmployeeBelongsToStore(User employee, Store store) {
		if (!employee.isEnabled()) {
			throw new BadRequestException("Employee user %d is disabled".formatted(employee.getId()));
		}
		if (!EMPLOYEE_ROLES.contains(employee.getRole())) {
			throw new BadRequestException("User %d must have MANAGER or SHIPPER role".formatted(employee.getId()));
		}
		if (employee.getWorkingStore() == null || employee.getWorkingStore().getId() == null) {
			throw new BadRequestException("User %d is not assigned to a working store".formatted(employee.getId()));
		}
		if (!store.getId().equals(employee.getWorkingStore().getId())) {
			throw new BadRequestException("User %d does not belong to store %d".formatted(
					employee.getId(),
					store.getId()
			));
		}
	}

	private Specification<EmployeeAttendance> myAttendanceSpecification(Long userId, LocalDate fromDate, LocalDate toDate) {
		return (root, query, criteriaBuilder) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(criteriaBuilder.equal(root.join("user", JoinType.LEFT).get("id"), userId));
			if (fromDate != null) {
				predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("workDate"), fromDate));
			}
			if (toDate != null) {
				predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("workDate"), toDate));
			}
			return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
		};
	}

	private Specification<EmployeeAttendance> attendanceSpecification(
			Long storeId,
			Long userId,
			Role role,
			LocalDate workDate,
			Boolean checkedOut,
			String search
	) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			if (query != null) {
				query.distinct(true);
			}
			List<Predicate> predicates = new ArrayList<>();
			Join<EmployeeAttendance, User> user = root.join("user", JoinType.LEFT);
			Join<EmployeeAttendance, Store> store = root.join("store", JoinType.LEFT);
			if (storeId != null) {
				predicates.add(criteriaBuilder.equal(store.get("id"), storeId));
			}
			if (userId != null) {
				predicates.add(criteriaBuilder.equal(user.get("id"), userId));
			}
			if (role != null) {
				predicates.add(criteriaBuilder.equal(root.get("employeeRole"), role));
			}
			if (workDate != null) {
				predicates.add(criteriaBuilder.equal(root.get("workDate"), workDate));
			}
			if (checkedOut != null) {
				predicates.add(checkedOut
						? criteriaBuilder.isNotNull(root.get("checkOutAt"))
						: criteriaBuilder.isNull(root.get("checkOutAt")));
			}
			if (normalizedSearch != null) {
				String likeValue = toLikeValue(normalizedSearch);
				predicates.add(criteriaBuilder.or(
						criteriaBuilder.like(criteriaBuilder.lower(user.get("fullName")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(user.get("email")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(root.get("employeeRole").as(String.class)), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(store.get("name")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(store.get("slug")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(store.get("address")), likeValue)
				));
			}
			return predicates.isEmpty()
					? criteriaBuilder.conjunction()
					: criteriaBuilder.and(predicates.toArray(Predicate[]::new));
		};
	}

	private Specification<EmployeeWorkSchedule> workScheduleSpecification(
			Long storeId,
			Long userId,
			Role role,
			LocalDate fromDate,
			LocalDate toDate,
			String search
	) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			if (query != null) {
				query.distinct(true);
			}
			List<Predicate> predicates = new ArrayList<>();
			Join<EmployeeWorkSchedule, User> user = root.join("user", JoinType.LEFT);
			Join<EmployeeWorkSchedule, Store> store = root.join("store", JoinType.LEFT);
			predicates.add(criteriaBuilder.equal(store.get("id"), storeId));
			if (fromDate != null) {
				predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("workDate"), fromDate));
			}
			if (toDate != null) {
				predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("workDate"), toDate));
			}
			if (userId != null) {
				predicates.add(criteriaBuilder.equal(user.get("id"), userId));
			}
			if (role != null) {
				predicates.add(criteriaBuilder.equal(root.get("employeeRole"), role));
			}
			if (normalizedSearch != null) {
				String likeValue = toLikeValue(normalizedSearch);
				predicates.add(criteriaBuilder.or(
						criteriaBuilder.like(criteriaBuilder.lower(user.get("fullName")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(user.get("email")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(root.get("employeeRole").as(String.class)), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(store.get("name")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(store.get("slug")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(store.get("address")), likeValue),
						criteriaBuilder.like(criteriaBuilder.lower(root.get("note")), likeValue)
				));
			}
			return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
		};
	}

	private Specification<EmployeeAttendance> attendanceSummarySpecification(Long storeId, LocalDate workDate) {
		return (root, query, criteriaBuilder) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(criteriaBuilder.equal(root.get("workDate"), workDate));
			if (storeId != null) {
				predicates.add(criteriaBuilder.equal(root.join("store", JoinType.LEFT).get("id"), storeId));
			}
			return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
		};
	}

	private Specification<EmployeeWorkSchedule> scheduleSummarySpecification(Long storeId, LocalDate workDate) {
		return (root, query, criteriaBuilder) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(criteriaBuilder.equal(root.get("workDate"), workDate));
			if (storeId != null) {
				predicates.add(criteriaBuilder.equal(root.join("store", JoinType.LEFT).get("id"), storeId));
			}
			return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
		};
	}

	private Pageable buildAttendancePageable(int page, int size) {
		int resolvedPage = Math.max(page, 0);
		int resolvedSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
		return PageRequest.of(resolvedPage, resolvedSize, DEFAULT_ATTENDANCE_SORT);
	}

	private EmployeeWorkScheduleMonthResponse buildMonthlyWorkScheduleResponse(
			Store store,
			YearMonth month,
			List<EmployeeWorkSchedule> schedules
	) {
		List<EmployeeWorkScheduleResponse> items = schedules.stream()
				.sorted(DEFAULT_WORK_SCHEDULE_COMPARATOR)
				.map(schedule -> EmployeeWorkScheduleResponse.from(schedule, null))
				.toList();
		return new EmployeeWorkScheduleMonthResponse(
				month.toString(),
				store.getId(),
				store.getName(),
				items
		);
	}

	private Map<String, EmployeeAttendance> mapAttendancesByKey(List<EmployeeAttendance> attendances) {
		Map<String, EmployeeAttendance> attendanceByKey = new HashMap<>();
		for (EmployeeAttendance attendance : attendances) {
			attendanceByKey.put(scheduleKey(attendance.getUser().getId(), attendance.getWorkDate()), attendance);
		}
		return attendanceByKey;
	}

	private User findEmployee(Long id) {
		return userRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("User not found"));
	}

	private YearMonth parseMonth(String month) {
		if (month == null || month.isBlank()) {
			return YearMonth.now(zoneId);
		}
		try {
			return YearMonth.parse(month.trim());
		} catch (RuntimeException exception) {
			throw new BadRequestException("month must use yyyy-MM format");
		}
	}

	private String normalizeSearch(String search) {
		if (search == null) {
			return null;
		}
		String trimmed = search.trim();
		return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
	}

	private String normalizeText(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private String toLikeValue(String normalizedSearch) {
		return "%" + normalizedSearch + "%";
	}

	private String scheduleKey(Long userId, LocalDate workDate) {
		return userId + "::" + workDate;
	}

	private Store findStore(Long id) {
		return storeRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Store not found"));
	}
}
