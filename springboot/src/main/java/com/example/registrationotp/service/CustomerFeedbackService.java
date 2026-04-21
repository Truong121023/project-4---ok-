package com.example.registrationotp.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.AdminFeedbackReplyRequest;
import com.example.registrationotp.dto.AdminFeedbackReplyResponse;
import com.example.registrationotp.dto.CustomerFeedbackOrderHistoryItemResponse;
import com.example.registrationotp.dto.CustomerFeedbackRequest;
import com.example.registrationotp.dto.CustomerFeedbackResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.CustomerFeedback;
import com.example.registrationotp.model.FeedbackCategory;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.CustomerFeedbackRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.OrderRepository;

@Service
public class CustomerFeedbackService {

	private static final int DEFAULT_PAGE_SIZE = 10;
	private static final int MAX_PAGE_SIZE = 100;
	private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");

	private final SessionAuthService sessionAuthService;
	private final CustomerFeedbackRepository customerFeedbackRepository;
	private final OrderRepository orderRepository;
	private final OrderItemRepository orderItemRepository;

	public CustomerFeedbackService(
			SessionAuthService sessionAuthService,
			CustomerFeedbackRepository customerFeedbackRepository,
			OrderRepository orderRepository,
			OrderItemRepository orderItemRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.customerFeedbackRepository = customerFeedbackRepository;
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
	}

	@Transactional(readOnly = true)
	public PageResponse<CustomerFeedbackResponse> listMyFeedbacks(String authorizationHeader, int page, int size) {
		User user = requireBuyerUser(authorizationHeader);
		return PageResponse.from(customerFeedbackRepository.findAllByUserId(user.getId(), buildPageable(page, size))
				.map(CustomerFeedbackResponse::from));
	}

	@Transactional(readOnly = true)
	public CustomerFeedbackResponse getMyFeedback(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		return CustomerFeedbackResponse.from(findMyFeedback(user.getId(), id));
	}

	@Transactional
	public CustomerFeedbackResponse createMyFeedback(String authorizationHeader, CustomerFeedbackRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		Order relatedOrder = findEligibleCompletedOrder(user.getId(), request.relatedOrderId());
		if (customerFeedbackRepository.findByRelatedOrderIdAndUserId(relatedOrder.getId(), user.getId()).isPresent()) {
			throw new BadRequestException("Feedback for this order already exists");
		}

		CustomerFeedback feedback = new CustomerFeedback();
		feedback.setUser(user);
		applyRequest(feedback, request, relatedOrder);
		return CustomerFeedbackResponse.from(customerFeedbackRepository.save(feedback));
	}

	@Transactional
	public MessageResponse deleteMyFeedback(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		CustomerFeedback feedback = findMyFeedback(user.getId(), id);
		customerFeedbackRepository.delete(feedback);
		return new MessageResponse("Feedback deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<CustomerFeedbackResponse> listFeedbacks(String authorizationHeader, int page, int size, String search) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Specification<CustomerFeedback> specification = feedbackSpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireWorkingStoreId(operator);
			specification = specification.and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.join("relatedStore", JoinType.LEFT).get("id"), workingStoreId));
		}
		return PageResponse.from(customerFeedbackRepository.findAll(specification, buildPageable(page, size))
				.map(CustomerFeedbackResponse::from));
	}

	@Transactional(readOnly = true)
	public CustomerFeedbackResponse getFeedback(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		CustomerFeedback feedback = findFeedback(id);
		validateFeedbackAccess(operator, feedback);
		return CustomerFeedbackResponse.from(feedback, buildCustomerStoreOrderHistory(feedback));
	}

	@Transactional(readOnly = true)
	public AdminFeedbackReplyResponse getFeedbackReply(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		CustomerFeedback feedback = findFeedback(id);
		validateFeedbackAccess(operator, feedback);
		requireReply(feedback);
		return AdminFeedbackReplyResponse.from(feedback);
	}

	@Transactional
	public AdminFeedbackReplyResponse replyFeedback(String authorizationHeader, Long id, AdminFeedbackReplyRequest request) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		CustomerFeedback feedback = findFeedback(id);
		validateFeedbackAccess(operator, feedback);
		feedback.setReplyMessage(request.replyMessage().trim());
		feedback.setRepliedAt(java.time.Instant.now());
		feedback.setRepliedByUserId(operator.getId());
		feedback.setRepliedByUserName(operator.getFullName());
		feedback.setRepliedByUserRole(operator.getRole());
		return AdminFeedbackReplyResponse.from(customerFeedbackRepository.save(feedback));
	}

	@Transactional
	public MessageResponse deleteFeedbackReply(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		CustomerFeedback feedback = findFeedback(id);
		validateFeedbackAccess(operator, feedback);
		requireReply(feedback);
		feedback.setReplyMessage(null);
		feedback.setRepliedAt(null);
		feedback.setRepliedByUserId(null);
		feedback.setRepliedByUserName(null);
		feedback.setRepliedByUserRole(null);
		customerFeedbackRepository.save(feedback);
		return new MessageResponse("Feedback reply deleted successfully");
	}

	@Transactional
	public MessageResponse deleteFeedback(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		CustomerFeedback feedback = findFeedback(id);
		validateFeedbackAccess(operator, feedback);
		customerFeedbackRepository.delete(feedback);
		return new MessageResponse("Feedback deleted successfully");
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can manage feedback");
		}
		return user;
	}

	private void applyRequest(CustomerFeedback feedback, CustomerFeedbackRequest request, Order relatedOrder) {
		Store relatedStore = resolveOrderStore(relatedOrder);
		feedback.setCategory(FeedbackCategory.ORDER_EXPERIENCE);
		feedback.setSubject("Order #" + relatedOrder.getId() + " feedback");
		feedback.setMessage(request.message().trim());
		feedback.setRelatedOrder(relatedOrder);
		feedback.setRelatedStore(relatedStore);
	}

	private CustomerFeedback findMyFeedback(Long userId, Long id) {
		return customerFeedbackRepository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new NotFoundException("Feedback not found"));
	}

	private CustomerFeedback findFeedback(Long id) {
		return customerFeedbackRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Feedback not found"));
	}

	private Order findMyOrder(Long userId, Long orderId) {
		return orderRepository.findByIdAndUserId(orderId, userId)
				.orElseThrow(() -> new NotFoundException("Order not found"));
	}

	private Order findEligibleCompletedOrder(Long userId, Long orderId) {
		Order order = findMyOrder(userId, orderId);

		if (order.getStatus() != OrderStatus.COMPLETED) {
			throw new BadRequestException("Only completed orders can receive feedback");
		}

		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Only paid orders can receive feedback");
		}

		return order;
	}

	private void requireReply(CustomerFeedback feedback) {
		if (trimToNull(feedback.getReplyMessage()) == null) {
			throw new NotFoundException("Feedback reply not found");
		}
	}

	private Store resolveOrderStore(Order order) {
		return orderItemRepository.findAllByOrderId(order.getId()).stream()
				.findFirst()
				.map(item -> item.getStore())
				.orElseThrow(() -> new BadRequestException("Order has no store items"));
	}

	private List<CustomerFeedbackOrderHistoryItemResponse> buildCustomerStoreOrderHistory(CustomerFeedback feedback) {
		if (feedback.getUser() == null || feedback.getUser().getId() == null) {
			return List.of();
		}
		if (feedback.getRelatedStore() == null || feedback.getRelatedStore().getId() == null) {
			return List.of();
		}

		Long userId = feedback.getUser().getId();
		Long storeId = feedback.getRelatedStore().getId();

		return orderRepository.findAllByUserId(userId).stream()
				.filter(order -> order.getPaymentStatus() == PaymentStatus.PAID)
				.filter(order -> order.getStatus() == OrderStatus.COMPLETED)
				.filter(order -> orderItemRepository.existsByOrderIdAndStoreId(order.getId(), storeId))
				.sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
				.map(CustomerFeedbackOrderHistoryItemResponse::from)
				.toList();
	}

	private void validateFeedbackAccess(User operator, CustomerFeedback feedback) {
		if (operator.getRole() != Role.MANAGER) {
			return;
		}
		Long workingStoreId = requireWorkingStoreId(operator);
		if (feedback.getRelatedStore() == null || feedback.getRelatedStore().getId() == null) {
			throw new ForbiddenException("Feedback does not belong to your store");
		}
		if (!workingStoreId.equals(feedback.getRelatedStore().getId())) {
			throw new ForbiddenException("Feedback does not belong to your store");
		}
	}

	private Long requireWorkingStoreId(User operator) {
		if (operator.getWorkingStore() == null || operator.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Manager account must be assigned to a working store");
		}
		return operator.getWorkingStore().getId();
	}

	private Pageable buildPageable(int page, int size) {
		int resolvedPage = Math.max(page, 0);
		int resolvedSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
		return PageRequest.of(resolvedPage, resolvedSize, DEFAULT_SORT);
	}

	private Specification<CustomerFeedback> feedbackSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<CustomerFeedback, User> user = root.join("user", JoinType.LEFT);
			Join<CustomerFeedback, Store> relatedStore = root.join("relatedStore", JoinType.LEFT);
			Join<CustomerFeedback, Order> relatedOrder = root.join("relatedOrder", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("category"),
					root.get("subject"),
					root.get("message"),
					root.get("replyMessage"),
					root.get("repliedAt"),
					root.get("repliedByUserId"),
					root.get("repliedByUserName"),
					root.get("repliedByUserRole"),
					root.get("createdAt"),
					root.get("updatedAt"),
					user.get("id"),
					user.get("fullName"),
					user.get("email"),
					relatedOrder.get("id"),
					relatedOrder.get("status"),
					relatedOrder.get("paymentStatus"),
					relatedOrder.get("paymentReference"),
					relatedStore.get("id"),
					relatedStore.get("slug"),
					relatedStore.get("name"),
					relatedStore.get("address"),
					relatedStore.get("area")
			);
		};
	}

	private Predicate likeAnyOf(
			jakarta.persistence.criteria.CriteriaBuilder criteriaBuilder,
			String likeValue,
			Expression<?>... expressions
	) {
		List<Predicate> predicates = new ArrayList<>();
		for (Expression<?> expression : expressions) {
			predicates.add(criteriaBuilder.like(criteriaBuilder.lower(expression.as(String.class)), likeValue));
		}
		return criteriaBuilder.or(predicates.toArray(Predicate[]::new));
	}

	private String normalizeSearch(String search) {
		String normalized = trimToNull(search);
		return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
	}

	private String toLikeValue(String normalizedSearch) {
		return "%" + normalizedSearch + "%";
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}
