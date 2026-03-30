package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.CartItemRequest;
import com.example.registrationotp.dto.CartItemResponse;
import com.example.registrationotp.dto.CartResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.CartStatus;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.CartItemRepository;
import com.example.registrationotp.repository.CartRepository;
import com.example.registrationotp.repository.StoreDishRepository;

@Service
public class CartService {

	private final SessionAuthService sessionAuthService;
	private final CartRepository cartRepository;
	private final CartItemRepository cartItemRepository;
	private final StoreDishRepository storeDishRepository;
	private final CatalogAvailabilityService catalogAvailabilityService;

	public CartService(
			SessionAuthService sessionAuthService,
			CartRepository cartRepository,
			CartItemRepository cartItemRepository,
			StoreDishRepository storeDishRepository,
			CatalogAvailabilityService catalogAvailabilityService
	) {
		this.sessionAuthService = sessionAuthService;
		this.cartRepository = cartRepository;
		this.cartItemRepository = cartItemRepository;
		this.storeDishRepository = storeDishRepository;
		this.catalogAvailabilityService = catalogAvailabilityService;
	}

	@Transactional
	public CartResponse getCart(String authorizationHeader) {
		User user = requireBuyerUser(authorizationHeader);
		Cart cart = getOrCreateOpenCart(user);
		return toResponse(cart);
	}

	@Transactional
	public CartResponse addCartItem(String authorizationHeader, CartItemRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		Cart cart = getOrCreateOpenCart(user);
		StoreDish storeDish = validateStoreDishForCart(request.storeId(), request.dishId(), request.quantity());

		cartItemRepository.findByCartIdAndStoreIdAndDishId(cart.getId(), request.storeId(), request.dishId())
				.ifPresentOrElse(existingItem -> {
					int updatedQuantity = existingItem.getQuantity() + request.quantity();
					validateRequestedQuantity(storeDish, updatedQuantity);
					existingItem.setQuantity(updatedQuantity);
					existingItem.setUnitPrice(catalogAvailabilityService.resolveEffectivePrice(storeDish));
					cartItemRepository.save(existingItem);
				}, () -> {
					CartItem cartItem = new CartItem();
					cartItem.setCart(cart);
					cartItem.setStore(storeDish.getStore());
					cartItem.setDish(storeDish.getDish());
					cartItem.setQuantity(request.quantity());
					cartItem.setUnitPrice(catalogAvailabilityService.resolveEffectivePrice(storeDish));
					cartItemRepository.save(cartItem);
				});

		return toResponse(cart);
	}

	@Transactional
	public CartResponse updateCartItem(String authorizationHeader, Long id, CartItemRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		Cart cart = getOrCreateOpenCart(user);
		CartItem cartItem = cartItemRepository.findByIdAndCartId(id, cart.getId())
				.orElseThrow(() -> new NotFoundException("Cart item not found"));
		StoreDish storeDish = validateStoreDishForCart(request.storeId(), request.dishId(), request.quantity());

		cartItemRepository.findByCartIdAndStoreIdAndDishId(cart.getId(), request.storeId(), request.dishId())
				.filter(existingItem -> !existingItem.getId().equals(id))
				.ifPresent(existingItem -> {
					throw new ConflictException("Cart already contains this store and dish");
				});

		cartItem.setStore(storeDish.getStore());
		cartItem.setDish(storeDish.getDish());
		cartItem.setQuantity(request.quantity());
		cartItem.setUnitPrice(catalogAvailabilityService.resolveEffectivePrice(storeDish));
		cartItemRepository.save(cartItem);

		return toResponse(cart);
	}

	@Transactional
	public CartResponse deleteCartItem(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		Cart cart = getOrCreateOpenCart(user);
		CartItem cartItem = cartItemRepository.findByIdAndCartId(id, cart.getId())
				.orElseThrow(() -> new NotFoundException("Cart item not found"));
		cartItemRepository.delete(cartItem);
		return toResponse(cart);
	}

	@Transactional
	public MessageResponse clearCart(String authorizationHeader) {
		User user = requireBuyerUser(authorizationHeader);
		cartRepository.findByUserIdAndStatus(user.getId(), CartStatus.OPEN)
				.ifPresent(cart -> cartItemRepository.deleteAllByCartId(cart.getId()));
		return new MessageResponse("Cart cleared successfully");
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can manage cart");
		}
		return user;
	}

	private Cart getOrCreateOpenCart(User user) {
		return cartRepository.findByUserIdAndStatus(user.getId(), CartStatus.OPEN)
				.orElseGet(() -> {
					Cart cart = new Cart();
					cart.setUser(user);
					cart.setStatus(CartStatus.OPEN);
					return cartRepository.save(cart);
				});
	}

	private StoreDish validateStoreDishForCart(Long storeId, Long dishId, Integer quantity) {
		StoreDish storeDish = storeDishRepository.findByStoreIdAndDishId(storeId, dishId)
				.orElseThrow(() -> new NotFoundException("Store dish not found"));
		String disabledReason = catalogAvailabilityService.resolveStoreDishStaticDisabledReason(storeDish);
		if (disabledReason != null) {
			throw new BadRequestException("Dish is not available at this store: " + disabledReason);
		}
		validateRequestedQuantity(storeDish, quantity);
		return storeDish;
	}

	private void validateRequestedQuantity(StoreDish storeDish, Integer quantity) {
		if (quantity == null || quantity <= 0) {
			throw new BadRequestException("quantity must be at least 1");
		}
		if (storeDish.getQuantity() < quantity) {
			throw new BadRequestException("quantity exceeds available stock");
		}
	}

	private CartResponse toResponse(Cart cart) {
		List<CartItem> cartItems = cartItemRepository.findAllByCartId(cart.getId());
		List<CartItemResponse> items = cartItems.stream()
				.map(cartItem -> {
					StoreDish storeDish = storeDishRepository.findByStoreIdAndDishId(
							cartItem.getStore().getId(),
							cartItem.getDish().getId()
					).orElse(null);
					Integer stock = storeDish != null ? storeDish.getQuantity() : 0;
					boolean available = storeDish != null && catalogAvailabilityService.resolveStoreDishDisabledReason(storeDish) == null;
					boolean disabled = !available;
					boolean schedulable = storeDish != null
							&& catalogAvailabilityService.resolveStoreDishStaticDisabledReason(storeDish) == null;
					return CartItemResponse.from(cartItem, stock, available, disabled, schedulable);
				})
				.toList();
		int totalItems = items.stream()
				.mapToInt(CartItemResponse::quantity)
				.sum();
		BigDecimal subtotal = items.stream()
				.map(CartItemResponse::totalPrice)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		return new CartResponse(
				cart.getId(),
				cart.getUser().getId(),
				cart.getStatus(),
				items,
				totalItems,
				subtotal,
				cart.getCreatedAt(),
				cart.getUpdatedAt()
		);
	}
}
