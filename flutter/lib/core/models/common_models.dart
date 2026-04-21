typedef JsonMap = Map<String, dynamic>;

int asInt(dynamic value, [int fallback = 0]) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  if (value is String) {
    return int.tryParse(value) ?? fallback;
  }
  return fallback;
}

double asDouble(dynamic value, [double fallback = 0]) {
  if (value is double) {
    return value;
  }
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value) ?? fallback;
  }
  return fallback;
}

bool asBool(dynamic value, [bool fallback = false]) {
  if (value is bool) {
    return value;
  }
  if (value is String) {
    if (value.toLowerCase() == 'true') {
      return true;
    }
    if (value.toLowerCase() == 'false') {
      return false;
    }
  }
  return fallback;
}

String asString(dynamic value, [String fallback = '']) {
  if (value == null) {
    return fallback;
  }
  return value.toString();
}

int? asNullableInt(dynamic value) {
  if (value == null) {
    return null;
  }
  final parsed = asInt(value, -1);
  return parsed == -1 ? null : parsed;
}

String? asNullableString(dynamic value) {
  final text = asString(value).trim();
  return text.isEmpty ? null : text;
}

DateTime? asDateTime(dynamic value) {
  if (value is DateTime) {
    return value;
  }
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}

List<String> asStringList(dynamic value) {
  if (value is List) {
    return value.map((item) => item.toString()).where((item) => item.isNotEmpty).toList();
  }
  return const [];
}

List<T> asObjectList<T>(dynamic value, T Function(JsonMap) parser) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((item) => parser(Map<String, dynamic>.from(item)))
        .toList();
  }
  return const [];
}

class PageResponse<T> {
  const PageResponse({
    required this.items,
    required this.page,
    required this.size,
    required this.totalItems,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrevious,
  });

  factory PageResponse.fromJson(JsonMap json, T Function(JsonMap json) parser) {
    return PageResponse<T>(
      items: asObjectList<T>(json['items'], parser),
      page: asInt(json['page']),
      size: asInt(json['size']),
      totalItems: asInt(json['totalItems']),
      totalPages: asInt(json['totalPages']),
      hasNext: asBool(json['hasNext']),
      hasPrevious: asBool(json['hasPrevious']),
    );
  }

  final List<T> items;
  final int page;
  final int size;
  final int totalItems;
  final int totalPages;
  final bool hasNext;
  final bool hasPrevious;
}

class AddressSuggestionOption {
  const AddressSuggestionOption({
    required this.label,
    this.secondaryLabel = '',
    this.placeId = '',
    this.sessionToken = '',
    this.source = '',
    this.latitude,
    this.longitude,
    this.normalizedAddress = '',
  });

  factory AddressSuggestionOption.fromJson(JsonMap json) {
    return AddressSuggestionOption(
      label: asString(json['label']),
      secondaryLabel: asString(json['secondaryLabel']),
      placeId: asString(json['placeId']),
      sessionToken: asString(json['sessionToken']),
      source: asString(json['source']),
      latitude: json['latitude'] == null ? null : asDouble(json['latitude']),
      longitude: json['longitude'] == null ? null : asDouble(json['longitude']),
      normalizedAddress: asString(json['normalizedAddress']),
    );
  }

  final String label;
  final String secondaryLabel;
  final String placeId;
  final String sessionToken;
  final String source;
  final double? latitude;
  final double? longitude;
  final String normalizedAddress;

  bool get hasCoordinates => latitude != null && longitude != null;
}

class AddressResolveResult {
  const AddressResolveResult({
    required this.label,
    required this.normalizedAddress,
    required this.latitude,
    required this.longitude,
    this.placeId = '',
    this.source = '',
  });

  factory AddressResolveResult.fromJson(JsonMap json) {
    return AddressResolveResult(
      label: asString(json['label']),
      normalizedAddress: asString(json['normalizedAddress']),
      latitude: asDouble(json['latitude']),
      longitude: asDouble(json['longitude']),
      placeId: asString(json['placeId']),
      source: asString(json['source']),
    );
  }

  final String label;
  final String normalizedAddress;
  final double latitude;
  final double longitude;
  final String placeId;
  final String source;
}

class ContentSection {
  const ContentSection({
    required this.title,
    required this.content,
    this.imagePath,
    this.imagePaths = const [],
  });

  factory ContentSection.fromJson(JsonMap json) {
    final imagePaths = asStringList(json['imagePaths']);
    final singleImage = asString(json['imagePath']);
    return ContentSection(
      title: asString(json['title']),
      content: asString(json['content']),
      imagePath: singleImage.isEmpty ? (imagePaths.isEmpty ? null : imagePaths.first) : singleImage,
      imagePaths: imagePaths,
    );
  }

  final String title;
  final String content;
  final String? imagePath;
  final List<String> imagePaths;
}

class ReviewItem {
  const ReviewItem({
    required this.id,
    required this.userName,
    required this.rating,
    required this.title,
    required this.comment,
    this.targetType,
    this.targetId,
    this.createdAt,
  });

  factory ReviewItem.fromJson(JsonMap json) {
    return ReviewItem(
      id: asInt(json['id']),
      userName: asString(json['userName']),
      rating: asDouble(json['rating']),
      title: asString(json['title']),
      comment: asString(json['comment']),
      targetType: asString(json['targetType']).isEmpty ? null : asString(json['targetType']),
      targetId: json['targetId'] == null ? null : asInt(json['targetId']),
      createdAt: asDateTime(json['createdAt']),
    );
  }

  final int id;
  final String userName;
  final double rating;
  final String title;
  final String comment;
  final String? targetType;
  final int? targetId;
  final DateTime? createdAt;
}

class MessageResponse {
  const MessageResponse({
    required this.message,
  });

  factory MessageResponse.fromJson(JsonMap json) {
    return MessageResponse(
      message: asString(json['message']),
    );
  }

  final String message;
}
