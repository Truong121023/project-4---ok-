import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat _currency = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'VND ',
    decimalDigits: 0,
  );

  static final NumberFormat _compact = NumberFormat.compact(locale: 'vi_VN');

  static String currency(num value) => _currency.format(value);

  static String compact(num value) => _compact.format(value);

  static String rating(double value) => value.toStringAsFixed(1);

  static String shortDate(DateTime? value) {
    if (value == null) {
      return 'Dang cap nhat';
    }
    return DateFormat('dd/MM/yyyy').format(value.toLocal());
  }

  static String fullDateTime(DateTime? value) {
    if (value == null) {
      return 'Dang cap nhat';
    }
    return DateFormat('dd/MM/yyyy HH:mm').format(value.toLocal());
  }

  static String distance(double? km) {
    if (km == null) {
      return 'Khong ro';
    }
    return '${km.toStringAsFixed(1)} km';
  }
}
