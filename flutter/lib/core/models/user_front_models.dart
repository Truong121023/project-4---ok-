import 'catalog_models.dart';
import 'common_models.dart';

class FeaturedDishPreview {
  const FeaturedDishPreview({
    required this.id,
    required this.name,
    required this.price,
    required this.imagePaths,
  });

  factory FeaturedDishPreview.fromJson(JsonMap json) {
    return FeaturedDishPreview(
      id: asInt(json['id']),
      name: asString(json['name']),
      price: asDouble(json['price']),
      imagePaths: asStringList(json['imagePaths']),
    );
  }

  final int id;
  final String name;
  final double price;
  final List<String> imagePaths;
}

class EventDetail extends EventCard {
  const EventDetail({
    required super.id,
    required super.slug,
    required super.name,
    required super.storeName,
    required super.location,
    required super.scheduleText,
    required super.imagePaths,
    required super.highlightSummary,
    required super.highlightTags,
    required super.startsAt,
    required super.endsAt,
    required super.averageRating,
    required super.reviewCount,
    required super.remainingSlots,
    required super.sections,
    required this.storeId,
    required this.storeSlug,
    required this.storeAddress,
    required this.storeArea,
    required this.description,
    required this.favoriteCount,
    required this.capacity,
    required this.bookedCount,
    required this.disabled,
    required this.disabledReason,
    required this.distanceKm,
    required this.store,
    required this.reviews,
    required this.featuredDishes,
  });

  factory EventDetail.fromJson(JsonMap json) {
    final card = EventCard.fromJson(json);
    final storeMap = json['store'] is Map ? Map<String, dynamic>.from(json['store'] as Map) : null;
    return EventDetail(
      id: card.id,
      slug: card.slug,
      name: card.name,
      storeName: card.storeName,
      location: card.location,
      scheduleText: card.scheduleText,
      imagePaths: card.imagePaths,
      highlightSummary: card.highlightSummary,
      highlightTags: card.highlightTags,
      startsAt: card.startsAt,
      endsAt: card.endsAt,
      averageRating: card.averageRating,
      reviewCount: card.reviewCount,
      remainingSlots: card.remainingSlots,
      sections: card.sections,
      storeId: asInt(json['storeId'], storeMap == null ? 0 : asInt(storeMap['id'])),
      storeSlug: asString(json['storeSlug']).isEmpty
          ? (storeMap == null ? '' : asString(storeMap['storeSlug']).isEmpty ? asString(storeMap['slug']) : asString(storeMap['storeSlug']))
          : asString(json['storeSlug']),
      storeAddress: asString(json['storeAddress']).isEmpty
          ? (storeMap == null ? '' : asString(storeMap['address']))
          : asString(json['storeAddress']),
      storeArea: asString(json['storeArea']).isEmpty
          ? (storeMap == null ? '' : asString(storeMap['area']))
          : asString(json['storeArea']),
      description: asString(json['description']),
      favoriteCount: asInt(json['favoriteCount']),
      capacity: asInt(json['capacity']),
      bookedCount: asInt(json['bookedCount']),
      disabled: asBool(json['disabled']),
      disabledReason: asNullableString(json['disabledReason']),
      distanceKm: json['distanceKm'] == null ? null : asDouble(json['distanceKm']),
      store: storeMap == null ? null : StoreCard.fromJson(storeMap),
      reviews: asObjectList(json['reviews'], ReviewItem.fromJson),
      featuredDishes: asObjectList(json['featuredDishes'], FeaturedDishPreview.fromJson),
    );
  }

  final int storeId;
  final String storeSlug;
  final String storeAddress;
  final String storeArea;
  final String description;
  final int favoriteCount;
  final int capacity;
  final int bookedCount;
  final bool disabled;
  final String? disabledReason;
  final double? distanceKm;
  final StoreCard? store;
  final List<ReviewItem> reviews;
  final List<FeaturedDishPreview> featuredDishes;
}

class FavoriteItem {
  const FavoriteItem({
    required this.id,
    required this.targetType,
    required this.targetId,
    required this.targetSlug,
    required this.targetLabel,
    required this.targetImagePaths,
    required this.purchased,
    required this.createdAt,
  });

  factory FavoriteItem.fromJson(JsonMap json) {
    return FavoriteItem(
      id: asInt(json['id']),
      targetType: asString(json['targetType']),
      targetId: asInt(json['targetId']),
      targetSlug: asNullableString(json['targetSlug']),
      targetLabel: asString(json['targetLabel']),
      targetImagePaths: asStringList(json['targetImagePaths']),
      purchased: asBool(json['purchased']),
      createdAt: asDateTime(json['createdAt']),
    );
  }

  final int id;
  final String targetType;
  final int targetId;
  final String? targetSlug;
  final String targetLabel;
  final List<String> targetImagePaths;
  final bool purchased;
  final DateTime? createdAt;
}

class OrderLineItem {
  const OrderLineItem({
    required this.id,
    required this.storeId,
    required this.storeSlug,
    required this.storeName,
    required this.dishId,
    required this.dishName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.imagePaths,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderLineItem.fromJson(JsonMap json) {
    return OrderLineItem(
      id: asInt(json['id']),
      storeId: asInt(json['storeId']),
      storeSlug: asString(json['storeSlug']),
      storeName: asString(json['storeName']),
      dishId: asInt(json['dishId']),
      dishName: asString(json['dishName']),
      quantity: asInt(json['quantity'], 1),
      unitPrice: asDouble(json['unitPrice']),
      totalPrice: asDouble(json['totalPrice']),
      imagePaths: asStringList(json['imagePaths']),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int id;
  final int storeId;
  final String storeSlug;
  final String storeName;
  final int dishId;
  final String dishName;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final List<String> imagePaths;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

class OrderDetail {
  const OrderDetail({
    required this.id,
    required this.userId,
    required this.storeId,
    required this.storeSlug,
    required this.storeName,
    required this.status,
    required this.paymentStatus,
    required this.paymentProvider,
    required this.paymentReference,
    required this.paymentCheckoutUrl,
    required this.paymentQrCode,
    required this.paymentExpiresAt,
    required this.paidAt,
    required this.subtotalAmount,
    required this.discountAmount,
    required this.totalAmount,
    required this.promotionCode,
    required this.promotionScope,
    required this.promotionEligibleAmount,
    required this.promotionDishIds,
    required this.deliveryType,
    required this.scheduledDeliveryAt,
    required this.deliveryFullName,
    required this.deliveryPhoneNumber,
    required this.deliveryAddress,
    required this.confirmedByUserId,
    required this.confirmedByUserName,
    required this.confirmedByUserRole,
    required this.confirmedAt,
    required this.preparingStaffId,
    required this.preparingStaffName,
    required this.deliveringShipperId,
    required this.deliveringShipperName,
    required this.deliveryProofImagePath,
    required this.deliveryProofCapturedAt,
    required this.deliveryProofUploadedAt,
    required this.deliveryProofNote,
    required this.statusSummary,
    required this.items,
    required this.createdAt,
    required this.updatedAt,
    required this.invoiceAvailable,
    required this.invoiceNumber,
    required this.invoicePreviewUrl,
    required this.invoiceDownloadUrl,
    required this.allowedActions,
  });

  factory OrderDetail.fromJson(JsonMap json) {
    return OrderDetail(
      id: asInt(json['id']),
      userId: asInt(json['userId']),
      storeId: asInt(json['storeId']),
      storeSlug: asString(json['storeSlug']),
      storeName: asString(json['storeName']),
      status: asString(json['status']),
      paymentStatus: asString(json['paymentStatus']),
      paymentProvider: asString(json['paymentProvider']),
      paymentReference: asString(json['paymentReference']),
      paymentCheckoutUrl: asString(json['paymentCheckoutUrl']),
      paymentQrCode: asString(json['paymentQrCode']),
      paymentExpiresAt: asDateTime(json['paymentExpiresAt']),
      paidAt: asDateTime(json['paidAt']),
      subtotalAmount: asDouble(json['subtotalAmount']),
      discountAmount: asDouble(json['discountAmount']),
      totalAmount: asDouble(json['totalAmount']),
      promotionCode: asString(json['promotionCode']),
      promotionScope: asString(json['promotionScope']),
      promotionEligibleAmount: asDouble(json['promotionEligibleAmount']),
      promotionDishIds: asStringList(json['promotionDishIds']),
      deliveryType: asString(json['deliveryType']),
      scheduledDeliveryAt: asDateTime(json['scheduledDeliveryAt']),
      deliveryFullName: asString(json['deliveryFullName']),
      deliveryPhoneNumber: asString(json['deliveryPhoneNumber']),
      deliveryAddress: asString(json['deliveryAddress']),
      confirmedByUserId: asNullableInt(json['confirmedByUserId']),
      confirmedByUserName: asNullableString(json['confirmedByUserName']),
      confirmedByUserRole: asNullableString(json['confirmedByUserRole']),
      confirmedAt: asDateTime(json['confirmedAt']),
      preparingStaffId: asNullableInt(json['preparingStaffId']),
      preparingStaffName: asNullableString(json['preparingStaffName']),
      deliveringShipperId: asNullableInt(json['deliveringShipperId']),
      deliveringShipperName: asNullableString(json['deliveringShipperName']),
      deliveryProofImagePath: asNullableString(json['deliveryProofImagePath']),
      deliveryProofCapturedAt: asDateTime(json['deliveryProofCapturedAt']),
      deliveryProofUploadedAt: asDateTime(json['deliveryProofUploadedAt']),
      deliveryProofNote: asNullableString(json['deliveryProofNote']),
      statusSummary: asString(json['statusSummary']),
      items: asObjectList(json['items'], OrderLineItem.fromJson),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
      invoiceAvailable: asBool(json['invoiceAvailable']),
      invoiceNumber: asNullableString(json['invoiceNumber']),
      invoicePreviewUrl: asNullableString(json['invoicePreviewUrl']),
      invoiceDownloadUrl: asNullableString(json['invoiceDownloadUrl']),
      allowedActions: asStringList(json['allowedActions']),
    );
  }

  final int id;
  final int userId;
  final int storeId;
  final String storeSlug;
  final String storeName;
  final String status;
  final String paymentStatus;
  final String paymentProvider;
  final String paymentReference;
  final String paymentCheckoutUrl;
  final String paymentQrCode;
  final DateTime? paymentExpiresAt;
  final DateTime? paidAt;
  final double subtotalAmount;
  final double discountAmount;
  final double totalAmount;
  final String promotionCode;
  final String promotionScope;
  final double promotionEligibleAmount;
  final List<String> promotionDishIds;
  final String deliveryType;
  final DateTime? scheduledDeliveryAt;
  final String deliveryFullName;
  final String deliveryPhoneNumber;
  final String deliveryAddress;
  final int? confirmedByUserId;
  final String? confirmedByUserName;
  final String? confirmedByUserRole;
  final DateTime? confirmedAt;
  final int? preparingStaffId;
  final String? preparingStaffName;
  final int? deliveringShipperId;
  final String? deliveringShipperName;
  final String? deliveryProofImagePath;
  final DateTime? deliveryProofCapturedAt;
  final DateTime? deliveryProofUploadedAt;
  final String? deliveryProofNote;
  final String statusSummary;
  final List<OrderLineItem> items;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final bool invoiceAvailable;
  final String? invoiceNumber;
  final String? invoicePreviewUrl;
  final String? invoiceDownloadUrl;
  final List<String> allowedActions;

  bool get canRefreshPayment => allowedActions.contains('REFRESH_PAYMENT');
  bool get canViewInvoice => invoiceAvailable || allowedActions.contains('VIEW_INVOICE');
}

class UserLevel {
  const UserLevel({
    required this.storeId,
    required this.storeSlug,
    required this.storeName,
    required this.currentYear,
    required this.currentQuarter,
    required this.evaluatedYear,
    required this.evaluatedQuarter,
    required this.qualifyingPaidAmount,
    required this.levelId,
    required this.levelCode,
    required this.levelName,
    required this.levelMinPaidAmount,
  });

  factory UserLevel.fromJson(JsonMap json) {
    return UserLevel(
      storeId: asInt(json['storeId']),
      storeSlug: asString(json['storeSlug']),
      storeName: asString(json['storeName']),
      currentYear: asInt(json['currentYear']),
      currentQuarter: asInt(json['currentQuarter']),
      evaluatedYear: asInt(json['evaluatedYear']),
      evaluatedQuarter: asInt(json['evaluatedQuarter']),
      qualifyingPaidAmount: asDouble(json['qualifyingPaidAmount']),
      levelId: asNullableInt(json['levelId']),
      levelCode: asNullableString(json['levelCode']),
      levelName: asNullableString(json['levelName']),
      levelMinPaidAmount: json['levelMinPaidAmount'] == null ? null : asDouble(json['levelMinPaidAmount']),
    );
  }

  final int storeId;
  final String storeSlug;
  final String storeName;
  final int currentYear;
  final int currentQuarter;
  final int evaluatedYear;
  final int evaluatedQuarter;
  final double qualifyingPaidAmount;
  final int? levelId;
  final String? levelCode;
  final String? levelName;
  final double? levelMinPaidAmount;
}

class UserReview {
  const UserReview({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.targetType,
    required this.targetId,
    required this.targetSlug,
    required this.targetLabel,
    required this.targetImagePaths,
    required this.rating,
    required this.title,
    required this.comment,
    required this.approved,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserReview.fromJson(JsonMap json) {
    return UserReview(
      id: asInt(json['id']),
      userId: asInt(json['userId']),
      userName: asString(json['userName']),
      userEmail: asString(json['userEmail']),
      targetType: asString(json['targetType']),
      targetId: asInt(json['targetId']),
      targetSlug: asNullableString(json['targetSlug']),
      targetLabel: asString(json['targetLabel']),
      targetImagePaths: asStringList(json['targetImagePaths']),
      rating: asDouble(json['rating']),
      title: asString(json['title']),
      comment: asString(json['comment']),
      approved: asBool(json['approved']),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int id;
  final int userId;
  final String userName;
  final String userEmail;
  final String targetType;
  final int targetId;
  final String? targetSlug;
  final String targetLabel;
  final List<String> targetImagePaths;
  final double rating;
  final String title;
  final String comment;
  final bool approved;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

class CustomerFeedback {
  const CustomerFeedback({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.category,
    required this.relatedStoreId,
    required this.relatedStoreSlug,
    required this.relatedStoreName,
    required this.relatedStoreAddress,
    required this.relatedOrderId,
    required this.relatedOrderStatus,
    required this.relatedOrderPaymentStatus,
    required this.relatedOrderPaymentReference,
    required this.subject,
    required this.message,
    required this.replyMessage,
    required this.repliedAt,
    required this.repliedByUserId,
    required this.repliedByUserName,
    required this.repliedByUserRole,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CustomerFeedback.fromJson(JsonMap json) {
    return CustomerFeedback(
      id: asInt(json['id']),
      userId: asInt(json['userId']),
      userName: asString(json['userName']),
      userEmail: asString(json['userEmail']),
      category: asString(json['category']),
      relatedStoreId: asNullableInt(json['relatedStoreId']),
      relatedStoreSlug: asNullableString(json['relatedStoreSlug']),
      relatedStoreName: asNullableString(json['relatedStoreName']),
      relatedStoreAddress: asNullableString(json['relatedStoreAddress']),
      relatedOrderId: asNullableInt(json['relatedOrderId']),
      relatedOrderStatus: asNullableString(json['relatedOrderStatus']),
      relatedOrderPaymentStatus: asNullableString(json['relatedOrderPaymentStatus']),
      relatedOrderPaymentReference: asNullableString(json['relatedOrderPaymentReference']),
      subject: asString(json['subject']),
      message: asString(json['message']),
      replyMessage: asNullableString(json['replyMessage']),
      repliedAt: asDateTime(json['repliedAt']),
      repliedByUserId: asNullableInt(json['repliedByUserId']),
      repliedByUserName: asNullableString(json['repliedByUserName']),
      repliedByUserRole: asNullableString(json['repliedByUserRole']),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int id;
  final int userId;
  final String userName;
  final String userEmail;
  final String category;
  final int? relatedStoreId;
  final String? relatedStoreSlug;
  final String? relatedStoreName;
  final String? relatedStoreAddress;
  final int? relatedOrderId;
  final String? relatedOrderStatus;
  final String? relatedOrderPaymentStatus;
  final String? relatedOrderPaymentReference;
  final String subject;
  final String message;
  final String? replyMessage;
  final DateTime? repliedAt;
  final int? repliedByUserId;
  final String? repliedByUserName;
  final String? repliedByUserRole;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

class UserNotificationItem {
  const UserNotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.relatedOrderId,
    required this.orderId,
    required this.relatedEventId,
    required this.eventId,
    required this.relatedEventSlug,
    required this.eventSlug,
    required this.relatedNewsId,
    required this.newsId,
    required this.relatedNewsSlug,
    required this.newsSlug,
    required this.relatedStoreId,
    required this.relatedStoreName,
    required this.actionUrl,
    required this.read,
    required this.readAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserNotificationItem.fromJson(JsonMap json) {
    return UserNotificationItem(
      id: asInt(json['id']),
      type: asString(json['type']),
      title: asString(json['title']),
      message: asString(json['message']),
      relatedOrderId: asNullableInt(json['relatedOrderId']),
      orderId: asNullableInt(json['orderId']),
      relatedEventId: asNullableInt(json['relatedEventId']),
      eventId: asNullableInt(json['eventId']),
      relatedEventSlug: asNullableString(json['relatedEventSlug']),
      eventSlug: asNullableString(json['eventSlug']),
      relatedNewsId: asNullableInt(json['relatedNewsId']),
      newsId: asNullableInt(json['newsId']),
      relatedNewsSlug: asNullableString(json['relatedNewsSlug']),
      newsSlug: asNullableString(json['newsSlug']),
      relatedStoreId: asNullableInt(json['relatedStoreId']),
      relatedStoreName: asNullableString(json['relatedStoreName']),
      actionUrl: asNullableString(json['actionUrl']),
      read: asBool(json['read']),
      readAt: asDateTime(json['readAt']),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int id;
  final String type;
  final String title;
  final String message;
  final int? relatedOrderId;
  final int? orderId;
  final int? relatedEventId;
  final int? eventId;
  final String? relatedEventSlug;
  final String? eventSlug;
  final int? relatedNewsId;
  final int? newsId;
  final String? relatedNewsSlug;
  final String? newsSlug;
  final int? relatedStoreId;
  final String? relatedStoreName;
  final String? actionUrl;
  final bool read;
  final DateTime? readAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

class SupportStore {
  const SupportStore({
    required this.id,
    required this.name,
  });

  factory SupportStore.fromJson(JsonMap json) {
    return SupportStore(
      id: asInt(json['id']),
      name: asString(json['name']),
    );
  }

  final int id;
  final String name;
}
