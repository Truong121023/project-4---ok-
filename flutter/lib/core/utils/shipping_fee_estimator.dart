import 'dart:math' as math;

import '../models/commerce_models.dart';

class CartShippingEstimate {
  const CartShippingEstimate({
    required this.isDeliveryOrder,
    required this.shippingDistanceKm,
    required this.shippingFeeAmount,
    required this.shippingFeeBreakdown,
    this.pendingMessage,
  });

  final bool isDeliveryOrder;
  final double? shippingDistanceKm;
  final double shippingFeeAmount;
  final List<ShippingFeeBreakdownItem> shippingFeeBreakdown;
  final String? pendingMessage;

  bool get hasEstimate => pendingMessage == null;
}

CartShippingEstimate estimateCartShipping({
  required Cart cart,
  required DeliveryAddress? address,
  required String deliveryType,
}) {
  if (!isDeliveryOrderType(deliveryType)) {
    return const CartShippingEstimate(
      isDeliveryOrder: false,
      shippingDistanceKm: 0,
      shippingFeeAmount: 0,
      shippingFeeBreakdown: [],
    );
  }

  if (address == null) {
    return const CartShippingEstimate(
      isDeliveryOrder: true,
      shippingDistanceKm: null,
      shippingFeeAmount: 0,
      shippingFeeBreakdown: [],
      pendingMessage: 'Choose a delivery address to preview the shipping fee.',
    );
  }

  if (!address.hasCoordinates) {
    return const CartShippingEstimate(
      isDeliveryOrder: true,
      shippingDistanceKm: null,
      shippingFeeAmount: 0,
      shippingFeeBreakdown: [],
      pendingMessage: 'Shipping fee will be finalized after address coordinates are available.',
    );
  }

  if (cart.items.isEmpty) {
    return const CartShippingEstimate(
      isDeliveryOrder: true,
      shippingDistanceKm: 0,
      shippingFeeAmount: 0,
      shippingFeeBreakdown: [],
    );
  }

  final stores = <int, CartItem>{};
  for (final item in cart.items) {
    stores[item.storeId] = stores[item.storeId] ?? item;
  }

  final hasMissingStoreCoordinates = stores.values.any(
    (item) => item.storeLatitude == null || item.storeLongitude == null,
  );
  if (hasMissingStoreCoordinates) {
    return const CartShippingEstimate(
      isDeliveryOrder: true,
      shippingDistanceKm: null,
      shippingFeeAmount: 0,
      shippingFeeBreakdown: [],
      pendingMessage: 'Shipping fee will be finalized after store coordinates are available.',
    );
  }

  final breakdown = stores.values.map((item) {
    final distanceKm = _haversineKm(
      item.storeLatitude!,
      item.storeLongitude!,
      address.latitude!,
      address.longitude!,
    );
    final shippingFeeAmount = (distanceKm * 4000).roundToDouble();
    return ShippingFeeBreakdownItem(
      storeId: item.storeId,
      storeName: item.storeName,
      distanceKm: distanceKm,
      shippingFeeAmount: shippingFeeAmount,
    );
  }).toList();

  final shippingDistanceKm = breakdown.fold<double>(
    0,
    (sum, item) => sum + (item.distanceKm ?? 0),
  );
  final shippingFeeAmount = breakdown.fold<double>(
    0,
    (sum, item) => sum + item.shippingFeeAmount,
  );

  return CartShippingEstimate(
    isDeliveryOrder: true,
    shippingDistanceKm: shippingDistanceKm,
    shippingFeeAmount: shippingFeeAmount,
    shippingFeeBreakdown: breakdown,
  );
}

double _haversineKm(
  double startLatitude,
  double startLongitude,
  double endLatitude,
  double endLongitude,
) {
  const earthRadiusKm = 6371.0;
  final latDelta = _degreesToRadians(endLatitude - startLatitude);
  final lngDelta = _degreesToRadians(endLongitude - startLongitude);
  final startLatRadians = _degreesToRadians(startLatitude);
  final endLatRadians = _degreesToRadians(endLatitude);

  final a = math.pow(math.sin(latDelta / 2), 2) +
      math.cos(startLatRadians) *
          math.cos(endLatRadians) *
          math.pow(math.sin(lngDelta / 2), 2);
  final c = 2 * math.atan2(math.sqrt(a.toDouble()), math.sqrt(1 - a.toDouble()));
  return earthRadiusKm * c;
}

double _degreesToRadians(double degrees) {
  return degrees * math.pi / 180;
}
