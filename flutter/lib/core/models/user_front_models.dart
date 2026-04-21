import 'catalog_models.dart';
import 'commerce_models.dart';
import 'common_models.dart';
import '../utils/ui_text.dart';

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
    final storeMap = json['store'] is Map
        ? Map<String, dynamic>.from(json['store'] as Map)
        : null;
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
      storeId:
          asInt(json['storeId'], storeMap == null ? 0 : asInt(storeMap['id'])),
      storeSlug: asString(json['storeSlug']).isEmpty
          ? (storeMap == null
              ? ''
              : asString(storeMap['storeSlug']).isEmpty
                  ? asString(storeMap['slug'])
                  : asString(storeMap['storeSlug']))
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
      distanceKm:
          json['distanceKm'] == null ? null : asDouble(json['distanceKm']),
      store: storeMap == null ? null : StoreCard.fromJson(storeMap),
      reviews: asObjectList(json['reviews'], ReviewItem.fromJson),
      featuredDishes:
          asObjectList(json['featuredDishes'], FeaturedDishPreview.fromJson),
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
    required this.storeAddress,
    required this.storePhoneNumber,
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
    required this.shippingDistanceKm,
    required this.shippingFeeAmount,
    required this.shippingFeeBreakdown,
    required this.totalAmount,
    required this.creditPointsAwarded,
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
    required this.cancelledByUserId,
    required this.cancelledByUserName,
    required this.cancelledByUserRole,
    required this.cancelledAt,
    required this.cancellationNote,
    required this.preparingStaffId,
    required this.preparingStaffName,
    required this.deliveringShipperId,
    required this.deliveringShipperName,
    required this.deliveryProofImagePath,
    required this.deliveryProofCapturedAt,
    required this.deliveryProofUploadedAt,
    required this.deliveryProofNote,
    required this.feedbackId,
    required this.feedbackSubmitted,
    required this.feedbackCreatedAt,
    required this.feedbackUpdatedAt,
    required this.feedbackMessage,
    required this.feedbackReplyMessage,
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
      storeAddress: asNullableString(json['storeAddress']),
      storePhoneNumber: asNullableString(json['storePhoneNumber']),
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
      shippingDistanceKm: json['shippingDistanceKm'] == null
          ? null
          : asDouble(json['shippingDistanceKm']),
      shippingFeeAmount: asDouble(json['shippingFeeAmount']),
      shippingFeeBreakdown: asObjectList(
          json['shippingFeeBreakdown'], ShippingFeeBreakdownItem.fromJson),
      totalAmount: asDouble(json['totalAmount']),
      creditPointsAwarded: asInt(json['creditPointsAwarded']),
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
      cancelledByUserId: asNullableInt(json['cancelledByUserId']),
      cancelledByUserName: asNullableString(json['cancelledByUserName']),
      cancelledByUserRole: asNullableString(json['cancelledByUserRole']),
      cancelledAt: asDateTime(json['cancelledAt']),
      cancellationNote: asNullableString(json['cancellationNote']),
      preparingStaffId: asNullableInt(json['preparingStaffId']),
      preparingStaffName: asNullableString(json['preparingStaffName']),
      deliveringShipperId: asNullableInt(json['deliveringShipperId']),
      deliveringShipperName: asNullableString(json['deliveringShipperName']),
      deliveryProofImagePath: asNullableString(json['deliveryProofImagePath']),
      deliveryProofCapturedAt: asDateTime(json['deliveryProofCapturedAt']),
      deliveryProofUploadedAt: asDateTime(json['deliveryProofUploadedAt']),
      deliveryProofNote: asNullableString(json['deliveryProofNote']),
      feedbackId: asNullableInt(json['feedbackId']),
      feedbackSubmitted: asBool(json['feedbackSubmitted']),
      feedbackCreatedAt: asDateTime(json['feedbackCreatedAt']),
      feedbackUpdatedAt: asDateTime(json['feedbackUpdatedAt']),
      feedbackMessage: asNullableString(json['feedbackMessage']),
      feedbackReplyMessage: asNullableString(json['feedbackReplyMessage']),
      statusSummary: UiText.translate(asString(json['statusSummary'])),
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
  final String? storeAddress;
  final String? storePhoneNumber;
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
  final double? shippingDistanceKm;
  final double shippingFeeAmount;
  final List<ShippingFeeBreakdownItem> shippingFeeBreakdown;
  final double totalAmount;
  final int creditPointsAwarded;
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
  final int? cancelledByUserId;
  final String? cancelledByUserName;
  final String? cancelledByUserRole;
  final DateTime? cancelledAt;
  final String? cancellationNote;
  final int? preparingStaffId;
  final String? preparingStaffName;
  final int? deliveringShipperId;
  final String? deliveringShipperName;
  final String? deliveryProofImagePath;
  final DateTime? deliveryProofCapturedAt;
  final DateTime? deliveryProofUploadedAt;
  final String? deliveryProofNote;
  final int? feedbackId;
  final bool feedbackSubmitted;
  final DateTime? feedbackCreatedAt;
  final DateTime? feedbackUpdatedAt;
  final String? feedbackMessage;
  final String? feedbackReplyMessage;
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
  bool get canCancelOrder => allowedActions.contains('CANCEL_ORDER');
  bool get canReorderOrder => allowedActions.contains('REORDER_ORDER');
  bool get canViewInvoice =>
      invoiceAvailable || allowedActions.contains('VIEW_INVOICE');
  bool get hasShippingSummary =>
      shippingDistanceKm != null ||
      shippingFeeAmount > 0 ||
      shippingFeeBreakdown.isNotEmpty;
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
    this.creditPoints,
    this.levelMinCreditPoints,
    this.membershipPoints,
    this.levelMinMembershipPoints,
    this.nextLevelId,
    this.nextLevelCode,
    this.nextLevelName,
    this.nextLevelMinCreditPoints,
    this.nextLevelMinMembershipPoints,
  });

  factory UserLevel.fromJson(JsonMap json) {
    final creditPoints = json['creditPoints'] == null
        ? 0
        : asInt(json['creditPoints']);
    final levelMinCreditPoints = json['levelMinCreditPoints'] == null
        ? (json['levelMinPaidAmount'] == null
            ? null
            : asDouble(json['levelMinPaidAmount']))
        : asDouble(json['levelMinCreditPoints']);
    final membershipPoints = json['membershipPoints'] == null
        ? (json['qualifyingPaidAmount'] == null
            ? 0
            : (asDouble(json['qualifyingPaidAmount']) / 1000).floor())
        : asInt(json['membershipPoints']);
    final levelMinMembershipPoints = json['levelMinMembershipPoints'] == null
        ? levelMinCreditPoints
        : asDouble(json['levelMinMembershipPoints']);
    final nextLevelMinCreditPoints = json['nextLevelMinCreditPoints'] == null
        ? null
        : asDouble(json['nextLevelMinCreditPoints']);
    final nextLevelMinMembershipPoints =
        json['nextLevelMinMembershipPoints'] == null
            ? nextLevelMinCreditPoints
            : asDouble(json['nextLevelMinMembershipPoints']);
    return UserLevel(
      storeId: json['storeId'] == null ? 0 : asInt(json['storeId']),
      storeSlug: asNullableString(json['storeSlug']) ?? 'global',
      storeName: asNullableString(json['storeName']) ?? 'Toan he thong',
      currentYear: asInt(json['currentYear']),
      currentQuarter: asInt(json['currentQuarter']),
      evaluatedYear: asInt(json['evaluatedYear']),
      evaluatedQuarter: asInt(json['evaluatedQuarter']),
      qualifyingPaidAmount: asDouble(json['qualifyingPaidAmount']),
      levelId: asNullableInt(json['levelId']),
      levelCode: asNullableString(json['levelCode']),
      levelName: asNullableString(json['levelName']),
      levelMinPaidAmount: json['levelMinPaidAmount'] == null
          ? null
          : asDouble(json['levelMinPaidAmount']),
      creditPoints: creditPoints,
      levelMinCreditPoints: levelMinCreditPoints,
      membershipPoints: membershipPoints,
      levelMinMembershipPoints: levelMinMembershipPoints,
      nextLevelId: asNullableInt(json['nextLevelId']),
      nextLevelCode: asNullableString(json['nextLevelCode']),
      nextLevelName: asNullableString(json['nextLevelName']),
      nextLevelMinCreditPoints: nextLevelMinCreditPoints,
      nextLevelMinMembershipPoints: nextLevelMinMembershipPoints,
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
  final int? creditPoints;
  final double? levelMinCreditPoints;
  final int? membershipPoints;
  final double? levelMinMembershipPoints;
  final int? nextLevelId;
  final String? nextLevelCode;
  final String? nextLevelName;
  final double? nextLevelMinCreditPoints;
  final double? nextLevelMinMembershipPoints;

  bool get hasLevel => levelId != null;

  String get levelBadgeLabel => levelCode ?? levelName ?? 'Chua dat moc';

  String get levelDisplayName => levelName ?? levelCode ?? 'Chua dat moc';

  int get resolvedCreditPoints => creditPoints ?? 0;

  int get resolvedMembershipPoints =>
      membershipPoints ?? (qualifyingPaidAmount / 1000).floor();

  double? get resolvedLevelThreshold =>
      levelMinMembershipPoints ?? levelMinCreditPoints ?? levelMinPaidAmount;

  String get nextLevelDisplayName =>
      nextLevelName ?? nextLevelCode ?? 'Chua co moc tiep theo';

  bool get hasNextLevel =>
      nextLevelId != null ||
      nextLevelMinMembershipPoints != null ||
      nextLevelMinCreditPoints != null;
}

class UserLevelDefinition {
  const UserLevelDefinition({
    required this.id,
    required this.storeId,
    required this.storeSlug,
    required this.storeName,
    required this.code,
    required this.name,
    required this.minPaidAmount,
    required this.minCreditPoints,
    required this.minMembershipPoints,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserLevelDefinition.fromJson(JsonMap json) {
    final minCreditPoints = json['minCreditPoints'] == null
        ? asDouble(json['minPaidAmount'])
        : asDouble(json['minCreditPoints']);
    final minMembershipPoints = json['minMembershipPoints'] == null
        ? minCreditPoints
        : asDouble(json['minMembershipPoints']);
    return UserLevelDefinition(
      id: asInt(json['id']),
      storeId: asNullableInt(json['storeId']),
      storeSlug: asNullableString(json['storeSlug']) ?? 'global',
      storeName: asNullableString(json['storeName']) ?? 'Toan he thong',
      code: asString(json['code']),
      name: asString(json['name']),
      minPaidAmount: json['minPaidAmount'] == null
          ? null
          : asDouble(json['minPaidAmount']),
      minCreditPoints: minCreditPoints,
      minMembershipPoints: minMembershipPoints,
      active: asBool(json['active'], true),
      createdAt: asDateTime(json['createdAt']),
      updatedAt: asDateTime(json['updatedAt']),
    );
  }

  final int id;
  final int? storeId;
  final String storeSlug;
  final String storeName;
  final String code;
  final String name;
  final double? minPaidAmount;
  final double minCreditPoints;
  final double minMembershipPoints;
  final bool active;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get displayName => name.trim().isEmpty ? code : name;

  String get badgeLabel => code.trim().isEmpty ? displayName : code;
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
      relatedOrderPaymentStatus:
          asNullableString(json['relatedOrderPaymentStatus']),
      relatedOrderPaymentReference:
          asNullableString(json['relatedOrderPaymentReference']),
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
