import 'package:flutter_test/flutter_test.dart';
<<<<<<< HEAD
import 'package:kamatcha_mobile/core/models/auth_models.dart';
import 'package:kamatcha_mobile/core/models/commerce_models.dart';
import 'package:kamatcha_mobile/core/utils/formatters.dart';
=======
import 'package:tea_matcha_mobile/core/models/auth_models.dart';
import 'package:tea_matcha_mobile/core/models/commerce_models.dart';
import 'package:tea_matcha_mobile/core/utils/formatters.dart';
>>>>>>> origin/main

void main() {
  test('formatters return stable mobile-friendly strings', () {
    expect(Formatters.shortDate(DateTime.utc(2026, 3, 29)), '29/03/2026');
    expect(Formatters.distance(null), 'Khong ro');
    expect(Formatters.rating(4.25), '4.3');
    expect(Formatters.countdown(const Duration(seconds: 61)), '01:01');
    expect(Formatters.countdown(const Duration(hours: 1, minutes: 1, seconds: 1)), '01:01:01');
    expect(Formatters.countdown(Duration.zero), 'Da het han');
  });

  test('app user parses credit points from auth payload', () {
    final user = AppUser.fromJson({
      'id': 1,
      'fullName': 'Nguyen Van A',
      'email': 'a@example.com',
      'role': 'USER',
      'creditPoints': 56,
    });

    expect(user.creditPoints, 56);
  });

  test('order summary parses promotion checkout metadata', () {
    final summary = OrderSummary.fromJson({
      'id': 201,
<<<<<<< HEAD
      'storeName': 'Kamatcha Q1',
=======
      'storeName': 'Tea Matcha Q1',
>>>>>>> origin/main
      'status': 'PENDING',
      'paymentStatus': 'PENDING',
      'totalAmount': 110000,
      'statusSummary': 'Waiting for payment',
      'promotionCode': 'MATCHA10',
      'promotionEligibleAmount': 100000,
    });

    expect(summary.promotionCode, 'MATCHA10');
    expect(summary.promotionEligibleAmount, 100000);
  });
}
