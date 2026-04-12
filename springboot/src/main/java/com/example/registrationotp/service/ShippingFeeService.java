package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;

import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.model.DeliveryType;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.UserDeliveryAddress;

@Service
public class ShippingFeeService {

	private static final BigDecimal SHIPPING_RATE_PER_KM = BigDecimal.valueOf(4000);
	private static final BigDecimal ZERO_DISTANCE = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

	public ShippingFeeQuote calculate(Store store, UserDeliveryAddress deliveryAddress, DeliveryType deliveryType) {
		if (!requiresShipping(deliveryType)) {
			return new ShippingFeeQuote(ZERO_DISTANCE, BigDecimal.ZERO);
		}
		if (deliveryAddress == null || deliveryAddress.getLatitude() == null || deliveryAddress.getLongitude() == null) {
			throw new BadRequestException("Delivery address is missing coordinates");
		}
		if (store == null || store.getLatitude() == null || store.getLongitude() == null) {
			throw new BadRequestException("Store coordinates are missing for shipping calculation");
		}

		double rawDistanceKm = haversineKm(
				store.getLatitude(),
				store.getLongitude(),
				deliveryAddress.getLatitude(),
				deliveryAddress.getLongitude()
		);
		BigDecimal distanceKm = BigDecimal.valueOf(rawDistanceKm).setScale(3, RoundingMode.HALF_UP);
		BigDecimal shippingFeeAmount = BigDecimal.valueOf(Math.round(rawDistanceKm * SHIPPING_RATE_PER_KM.doubleValue()));
		return new ShippingFeeQuote(distanceKm, shippingFeeAmount);
	}

	private boolean requiresShipping(DeliveryType deliveryType) {
		if (deliveryType == null) {
			return true;
		}
		return deliveryType == DeliveryType.IMMEDIATE || deliveryType == DeliveryType.SCHEDULED;
	}

	private double haversineKm(double startLat, double startLng, double endLat, double endLng) {
		double dLat = Math.toRadians(endLat - startLat);
		double dLng = Math.toRadians(endLng - startLng);
		double startLatRad = Math.toRadians(startLat);
		double endLatRad = Math.toRadians(endLat);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(startLatRad) * Math.cos(endLatRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return 6371.0 * c;
	}

	public record ShippingFeeQuote(
			BigDecimal distanceKm,
			BigDecimal shippingFeeAmount
	) {
	}
}
