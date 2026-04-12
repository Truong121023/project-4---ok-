package com.example.registrationotp.service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.DeliveryAddressRequest;
import com.example.registrationotp.dto.DeliveryAddressResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserDeliveryAddress;
import com.example.registrationotp.repository.UserDeliveryAddressRepository;

@Service
public class DeliveryAddressService {

	private static final Instant MIN_INSTANT = Instant.EPOCH;

	private final SessionAuthService sessionAuthService;
	private final UserDeliveryAddressRepository userDeliveryAddressRepository;

	public DeliveryAddressService(
			SessionAuthService sessionAuthService,
			UserDeliveryAddressRepository userDeliveryAddressRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.userDeliveryAddressRepository = userDeliveryAddressRepository;
	}

	@Transactional(readOnly = true)
	public List<DeliveryAddressResponse> listMyAddresses(String authorizationHeader) {
		User user = requireBuyerUser(authorizationHeader);
		return userDeliveryAddressRepository.findAllByUserIdOrderByUpdatedAtDesc(user.getId()).stream()
				.sorted(deliveryAddressComparator())
				.map(DeliveryAddressResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public DeliveryAddressResponse getMyPrimaryAddress(String authorizationHeader) {
		User user = requireBuyerUser(authorizationHeader);
		return DeliveryAddressResponse.from(findPrimaryOrBestAddress(user.getId()));
	}

	@Transactional(readOnly = true)
	public DeliveryAddressResponse getMyAddress(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		return DeliveryAddressResponse.from(findMyAddress(user.getId(), id));
	}

	@Transactional
	public DeliveryAddressResponse createMyAddress(String authorizationHeader, DeliveryAddressRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		UserDeliveryAddress deliveryAddress = new UserDeliveryAddress();
		deliveryAddress.setUser(user);
		applyRequest(deliveryAddress, request);
		applyPrimarySelectionOnCreate(user.getId(), deliveryAddress, request.primary());
		UserDeliveryAddress savedAddress = userDeliveryAddressRepository.save(deliveryAddress);
		if (savedAddress.isPrimaryAddress()) {
			clearOtherPrimaryAddresses(user.getId(), savedAddress.getId());
		}
		return DeliveryAddressResponse.from(savedAddress);
	}

	@Transactional
	public DeliveryAddressResponse updateMyAddress(String authorizationHeader, Long id, DeliveryAddressRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		UserDeliveryAddress deliveryAddress = findMyAddress(user.getId(), id);
		applyRequest(deliveryAddress, request);
		applyPrimarySelectionOnUpdate(deliveryAddress, request.primary());
		UserDeliveryAddress savedAddress = userDeliveryAddressRepository.save(deliveryAddress);
		if (savedAddress.isPrimaryAddress()) {
			clearOtherPrimaryAddresses(user.getId(), savedAddress.getId());
		}
		return DeliveryAddressResponse.from(savedAddress);
	}

	@Transactional
	public DeliveryAddressResponse setPrimaryAddress(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		UserDeliveryAddress deliveryAddress = findMyAddress(user.getId(), id);
		deliveryAddress.setPrimaryAddress(true);
		UserDeliveryAddress savedAddress = userDeliveryAddressRepository.save(deliveryAddress);
		clearOtherPrimaryAddresses(user.getId(), savedAddress.getId());
		return DeliveryAddressResponse.from(savedAddress);
	}

	@Transactional
	public MessageResponse deleteMyAddress(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		UserDeliveryAddress deliveryAddress = findMyAddress(user.getId(), id);
		boolean deletedPrimary = deliveryAddress.isPrimaryAddress();
		userDeliveryAddressRepository.delete(deliveryAddress);
		if (deletedPrimary) {
			promoteFallbackPrimaryAddress(user.getId());
		}
		return new MessageResponse("Delivery address deleted successfully");
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can manage delivery addresses");
		}
		return user;
	}

	private UserDeliveryAddress findMyAddress(Long userId, Long id) {
		return userDeliveryAddressRepository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new NotFoundException("Delivery address not found"));
	}

	private UserDeliveryAddress findPrimaryOrBestAddress(Long userId) {
		return userDeliveryAddressRepository.findAllByUserIdOrderByUpdatedAtDesc(userId).stream()
				.sorted(deliveryAddressComparator())
				.findFirst()
				.orElseThrow(() -> new NotFoundException("Delivery address not found"));
	}

	private void applyRequest(UserDeliveryAddress deliveryAddress, DeliveryAddressRequest request) {
		validateCoordinatePair(request.latitude(), request.longitude());
		String normalizedDeliveryAddress = request.deliveryAddress().trim();
		boolean addressChanged = deliveryAddress.getDeliveryAddress() != null
				&& !deliveryAddress.getDeliveryAddress().equals(normalizedDeliveryAddress);
		deliveryAddress.setFullName(request.fullName().trim());
		deliveryAddress.setPhoneNumber(request.phoneNumber().trim());
		deliveryAddress.setDeliveryAddress(normalizedDeliveryAddress);
		if (request.latitude() != null && request.longitude() != null) {
			deliveryAddress.setLatitude(request.latitude());
			deliveryAddress.setLongitude(request.longitude());
			return;
		}
		if (deliveryAddress.getId() == null || addressChanged) {
			deliveryAddress.setLatitude(null);
			deliveryAddress.setLongitude(null);
		}
	}

	private void applyPrimarySelectionOnCreate(Long userId, UserDeliveryAddress deliveryAddress, Boolean requestedPrimary) {
		boolean hasPrimaryAddress = userDeliveryAddressRepository.existsByUserIdAndPrimaryAddressTrue(userId);
		deliveryAddress.setPrimaryAddress(!hasPrimaryAddress || Boolean.TRUE.equals(requestedPrimary));
	}

	private void applyPrimarySelectionOnUpdate(UserDeliveryAddress deliveryAddress, Boolean requestedPrimary) {
		if (requestedPrimary == null) {
			return;
		}
		if (Boolean.TRUE.equals(requestedPrimary)) {
			deliveryAddress.setPrimaryAddress(true);
			return;
		}
		if (!deliveryAddress.isPrimaryAddress()) {
			deliveryAddress.setPrimaryAddress(false);
		}
	}

	private void clearOtherPrimaryAddresses(Long userId, Long retainedAddressId) {
		List<UserDeliveryAddress> addresses = userDeliveryAddressRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
		List<UserDeliveryAddress> addressesToUpdate = addresses.stream()
				.filter(address -> !address.getId().equals(retainedAddressId))
				.filter(UserDeliveryAddress::isPrimaryAddress)
				.peek(address -> address.setPrimaryAddress(false))
				.toList();
		if (!addressesToUpdate.isEmpty()) {
			userDeliveryAddressRepository.saveAll(addressesToUpdate);
		}
	}

	private void promoteFallbackPrimaryAddress(Long userId) {
		userDeliveryAddressRepository.findAllByUserIdOrderByUpdatedAtDesc(userId).stream()
				.sorted(deliveryAddressComparator())
				.findFirst()
				.ifPresent(address -> {
					if (!address.isPrimaryAddress()) {
						address.setPrimaryAddress(true);
						userDeliveryAddressRepository.save(address);
					}
				});
	}

	private Comparator<UserDeliveryAddress> deliveryAddressComparator() {
		return Comparator.comparing(UserDeliveryAddress::isPrimaryAddress, Comparator.reverseOrder())
				.thenComparing(address -> coalesce(address.getVerifiedAt()), Comparator.reverseOrder())
				.thenComparing(address -> coalesce(address.getLastUsedAt()), Comparator.reverseOrder())
				.thenComparing(UserDeliveryAddress::getUpdatedAt, Comparator.reverseOrder());
	}

	private Instant coalesce(Instant value) {
		return value == null ? MIN_INSTANT : value;
	}

	private void validateCoordinatePair(Double latitude, Double longitude) {
		if ((latitude == null) == (longitude == null)) {
			return;
		}
		throw new com.example.registrationotp.exception.BadRequestException("latitude and longitude must either both be provided or both be null");
	}
}
