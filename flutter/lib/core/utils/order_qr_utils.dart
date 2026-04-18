String? extractOrderQrToken(String rawValue) {
  final raw = rawValue.trim();
  if (raw.isEmpty) {
    return null;
  }

  final direct = _sanitizeToken(raw);
  if (direct != null) {
    return direct;
  }

  final uri = Uri.tryParse(raw);
  if (uri == null) {
    return null;
  }

  if (uri.scheme == 'kamatcha') {
    return _lastMeaningfulSegment(uri.pathSegments);
  }

  final orderQrIndex = uri.pathSegments.lastIndexWhere(
    (segment) => segment == 'order-qr-entry' || segment == 'order-qr',
  );
  if (orderQrIndex >= 0 && orderQrIndex + 1 < uri.pathSegments.length) {
    return _sanitizeToken(uri.pathSegments[orderQrIndex + 1]);
  }

  return _lastMeaningfulSegment(uri.pathSegments);
}

String? _lastMeaningfulSegment(List<String> segments) {
  for (var index = segments.length - 1; index >= 0; index--) {
    final token = _sanitizeToken(segments[index]);
    if (token != null) {
      return token;
    }
  }
  return null;
}

String? _sanitizeToken(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    return null;
  }
  final tokenPattern = RegExp(r'^[A-Za-z0-9._~-]{8,}$');
  if (!tokenPattern.hasMatch(trimmed)) {
    return null;
  }
  return trimmed;
}
