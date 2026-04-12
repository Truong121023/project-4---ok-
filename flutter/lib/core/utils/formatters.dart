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

  static String countdown(Duration value) {
    if (value.inSeconds <= 0) {
      return 'Da het han';
    }

    final days = value.inDays;
    final hours = value.inHours.remainder(24);
    final minutes = value.inMinutes.remainder(60);
    final seconds = value.inSeconds.remainder(60);

    if (days > 0) {
      return '${days}d ${hours}h ${minutes}m';
    }
    if (value.inHours > 0) {
      return '${value.inHours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
    return '${value.inMinutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  static String distance(double? km) {
    if (km == null) {
      return 'Khong ro';
    }
    return '${km.toStringAsFixed(1)} km';
  }
}
