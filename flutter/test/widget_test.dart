import 'package:flutter_test/flutter_test.dart';
import 'package:tea_matcha_mobile/core/utils/formatters.dart';

void main() {
  test('formatters return stable mobile-friendly strings', () {
    expect(Formatters.shortDate(DateTime.utc(2026, 3, 29)), '29/03/2026');
    expect(Formatters.distance(null), 'Khong ro');
    expect(Formatters.rating(4.25), '4.3');
  });
}
