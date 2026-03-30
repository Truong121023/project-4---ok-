import 'common_models.dart';

class CartItem {
  const CartItem({
    required this.id,
    required this.storeId,
    required this.storeName,
    required this.dishId,
    required this.dishName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.imagePaths,
    required this.available,
    required this.disabled,
    required this.schedulable,
  });

  factory CartItem.fromJson(JsonMap json) {
    return CartItem(
      id: asInt(json['id']),
      storeId: asInt(json['storeId']),
      storeName: asString(json['storeName']),
      dishId: asInt(json['dishId']),
      dishName: asString(json['dishName']),
      quantity: asInt(json['quantity'], 1),
      unitPrice: asDouble(json['unitPrice']),
      totalPrice: asDouble(json['totalPrice']),
      imagePaths: asStringList(json['imagePaths']),
      available: asBool(json['available'], true),
      disabled: asBool(json['disabled']),
      schedulable: asBool(json['schedulable'], true),
    );
  }

  final int id;
  final int storeId;
  final String storeName;
  final int dishId;
  final String dishName;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final List<String> imagePaths;
  final bool available;
  final bool disabled;
  final bool schedulable;

  CartItem copyWith({
    int? id,
    int? storeId,
    String? storeName,
    int? dishId,
    String? dishName,
    int? quantity,
    double? unitPrice,
    double? totalPrice,
    List<String>? imagePaths,
    bool? available,
    bool? disabled,
    bool? schedulable,
  }) {
    final nextQuantity = quantity ?? this.quantity;
    final nextUnitPrice = unitPrice ?? this.unitPrice;
    return CartItem(
      id: id ?? this.id,
      storeId: storeId ?? this.storeId,
      storeName: storeName ?? this.storeName,
      dishId: dishId ?? this.dishId,
      dishName: dishName ?? this.dishName,
      quantity: nextQuantity,
      unitPrice: nextUnitPrice,
      totalPrice: totalPrice ?? nextQuantity * nextUnitPrice,
      imagePaths: imagePaths ?? this.imagePaths,
      available: available ?? this.available,
      disabled: disabled ?? this.disabled,
      schedulable: schedulable ?? this.schedulable,
    );
  }

  JsonMap toJson() {
    return {
      'id': id,
      'storeId': storeId,
      'storeName': storeName,
      'dishId': dishId,
      'dishName': dishName,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'totalPrice': totalPrice,
      'imagePaths': imagePaths,
      'available': available,
      'disabled': disabled,
      'schedulable': schedulable,
    };
  }
}

class Cart {
  const Cart({
    required this.id,
    required this.userId,
    required this.status,
    required this.items,
    required this.totalItems,
    required this.subtotal,
  });

  factory Cart.empty() {
    return const Cart(
      id: 0,
      userId: 0,
      status: 'OPEN',
      items: [],
      totalItems: 0,
      subtotal: 0,
    );
  }

  factory Cart.fromJson(JsonMap json) {
    final items = asObjectList(json['items'], CartItem.fromJson);
    final subtotal = json['subtotal'] == null
        ? items.fold<double>(0, (sum, item) => sum + item.totalPrice)
        : asDouble(json['subtotal']);
    final totalItems = json['totalItems'] == null
        ? items.fold<int>(0, (sum, item) => sum + item.quantity)
        : asInt(json['totalItems']);
    return Cart(
      id: asInt(json['id']),
      userId: asInt(json['userId']),
      status: asString(json['status'], 'OPEN'),
      items: items,
      totalItems: totalItems,
      subtotal: subtotal,
    );
  }

  final int id;
  final int userId;
  final String status;
  final List<CartItem> items;
  final int totalItems;
  final double subtotal;

  Cart copyWith({
    int? id,
    int? userId,
    String? status,
    List<CartItem>? items,
    int? totalItems,
    double? subtotal,
  }) {
    final nextItems = items ?? this.items;
    return Cart(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      status: status ?? this.status,
      items: nextItems,
      totalItems: totalItems ?? nextItems.fold<int>(0, (sum, item) => sum + item.quantity),
      subtotal: subtotal ?? nextItems.fold<double>(0, (sum, item) => sum + item.totalPrice),
    );
  }

  JsonMap toJson() {
    return {
      'id': id,
      'userId': userId,
      'status': status,
      'items': items.map((item) => item.toJson()).toList(),
      'totalItems': totalItems,
      'subtotal': subtotal,
    };
  }
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.storeName,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
    required this.statusSummary,
    required this.createdAt,
  });

  factory OrderSummary.fromJson(JsonMap json) {
    return OrderSummary(
      id: asInt(json['id']),
      storeName: asString(json['storeName']),
      status: asString(json['status']),
      paymentStatus: asString(json['paymentStatus']),
      totalAmount: asDouble(json['totalAmount']),
      statusSummary: asString(json['statusSummary']),
      createdAt: asDateTime(json['createdAt']),
    );
  }

  final int id;
  final String storeName;
  final String status;
  final String paymentStatus;
  final double totalAmount;
  final String statusSummary;
  final DateTime? createdAt;
}

class DeliveryAddress {
  const DeliveryAddress({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.phoneNumber,
    required this.deliveryAddress,
    required this.primary,
    required this.verified,
    this.verifiedAt,
    this.lastUsedAt,
    this.createdAt,
    this.updatedAt,
  });

  factory DeliveryAddress.fromJson(JsonMap json) {
    return DeliveryAddress(
      id: asInt(json['id']),
      userId: asInt(json['userId']),
      fullName: asString(json['fullName']),
      phoneNumber: asString(json['phoneNumber']),
      deliveryAddress: asString(json['deliveryAddress']),
      primary: asBool(json['primary']),
      verified: asBool(json['verified']),
      verifiedAt: asDateTime(json['verifiedAt']),
      lastUsedAt: asDateTime(json['lastUsedAt']),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int id;
  final int userId;
  final String fullName;
  final String phoneNumber;
  final String deliveryAddress;
  final bool primary;
  final bool verified;
  final DateTime? verifiedAt;
  final DateTime? lastUsedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  DeliveryAddress copyWith({
    int? id,
    int? userId,
    String? fullName,
    String? phoneNumber,
    String? deliveryAddress,
    bool? primary,
    bool? verified,
    DateTime? verifiedAt,
    DateTime? lastUsedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return DeliveryAddress(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      fullName: fullName ?? this.fullName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      primary: primary ?? this.primary,
      verified: verified ?? this.verified,
      verifiedAt: verifiedAt ?? this.verifiedAt,
      lastUsedAt: lastUsedAt ?? this.lastUsedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class CheckoutResult {
  const CheckoutResult({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.paymentProvider,
    required this.paymentReference,
    required this.paymentCheckoutUrl,
    required this.paymentQrCode,
    required this.subtotalAmount,
    required this.discountAmount,
    required this.totalAmount,
    required this.promotionCode,
    required this.deliveryType,
    required this.deliveryFullName,
    required this.deliveryPhoneNumber,
    required this.deliveryAddress,
    required this.statusSummary,
    required this.orders,
    this.scheduledDeliveryAt,
    this.paymentExpiresAt,
    this.paidAt,
  });

  factory CheckoutResult.fromJson(JsonMap json) {
    return CheckoutResult(
      id: asInt(json['id']),
      status: asString(json['status']),
      paymentStatus: asString(json['paymentStatus']),
      paymentProvider: asString(json['paymentProvider']),
      paymentReference: asString(json['paymentReference']),
      paymentCheckoutUrl: asString(json['paymentCheckoutUrl']),
      paymentQrCode: asString(json['paymentQrCode']),
      subtotalAmount: asDouble(json['subtotalAmount']),
      discountAmount: asDouble(json['discountAmount']),
      totalAmount: asDouble(json['totalAmount']),
      promotionCode: asString(json['promotionCode']),
      deliveryType: asString(json['deliveryType']),
      deliveryFullName: asString(json['deliveryFullName']),
      deliveryPhoneNumber: asString(json['deliveryPhoneNumber']),
      deliveryAddress: asString(json['deliveryAddress']),
      statusSummary: asString(json['statusSummary']),
      orders: asObjectList(json['orders'], OrderSummary.fromJson),
      scheduledDeliveryAt: asDateTime(json['scheduledDeliveryAt']),
      paymentExpiresAt: asDateTime(json['paymentExpiresAt']),
      paidAt: asDateTime(json['paidAt']),
    );
  }

  final int id;
  final String status;
  final String paymentStatus;
  final String paymentProvider;
  final String paymentReference;
  final String paymentCheckoutUrl;
  final String paymentQrCode;
  final double subtotalAmount;
  final double discountAmount;
  final double totalAmount;
  final String promotionCode;
  final String deliveryType;
  final String deliveryFullName;
  final String deliveryPhoneNumber;
  final String deliveryAddress;
  final String statusSummary;
  final List<OrderSummary> orders;
  final DateTime? scheduledDeliveryAt;
  final DateTime? paymentExpiresAt;
  final DateTime? paidAt;
}
