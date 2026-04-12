import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../core/utils/formatters.dart';

class PaymentQrSection extends StatefulWidget {
  const PaymentQrSection({
    super.key,
    required this.qrCode,
    required this.checkoutUrl,
    required this.expiresAt,
    this.onOpenCheckoutUrl,
    this.title = 'Thanh toan PayOS',
    this.subtitle,
  });

  final String qrCode;
  final String checkoutUrl;
  final DateTime? expiresAt;
  final Future<void> Function()? onOpenCheckoutUrl;
  final String title;
  final String? subtitle;

  @override
  State<PaymentQrSection> createState() => _PaymentQrSectionState();
}

class _PaymentQrSectionState extends State<PaymentQrSection> {
  Timer? _ticker;
  DateTime _now = DateTime.now();

  bool get _hasQrCode => widget.qrCode.trim().isNotEmpty;
  bool get _hasCheckoutUrl => widget.checkoutUrl.trim().isNotEmpty;
  bool get _hasPaymentPayload =>
      _hasQrCode || _hasCheckoutUrl || widget.expiresAt != null;
  bool get _isExpired =>
      widget.expiresAt != null && !widget.expiresAt!.isAfter(_now);

  @override
  void initState() {
    super.initState();
    _configureTicker();
  }

  @override
  void didUpdateWidget(covariant PaymentQrSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.expiresAt != widget.expiresAt) {
      _configureTicker();
      return;
    }
    _now = DateTime.now();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _configureTicker() {
    _ticker?.cancel();
    _now = DateTime.now();
    final expiresAt = widget.expiresAt;
    if (expiresAt == null || !expiresAt.isAfter(_now)) {
      return;
    }

    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) {
        return;
      }
      final now = DateTime.now();
      setState(() {
        _now = now;
      });
      if (!expiresAt.isAfter(now)) {
        _ticker?.cancel();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasPaymentPayload) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final expiresAt = widget.expiresAt;
    final remaining = expiresAt == null ? null : expiresAt.difference(_now);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            if ((widget.subtitle ?? '').trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(widget.subtitle!),
            ],
            if (expiresAt != null) ...[
              const SizedBox(height: 14),
              _PaymentStatusPill(
                label: _isExpired
                    ? 'Da het han'
                    : 'Con ${Formatters.countdown(remaining!)}',
                expired: _isExpired,
              ),
              const SizedBox(height: 10),
              Text('Het han luc ${Formatters.fullDateTime(expiresAt)}'),
            ],
            const SizedBox(height: 16),
            if (_hasQrCode && !_isExpired)
              Center(
                child: Column(
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: theme.colorScheme.outlineVariant,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: QrImageView(
                          data: widget.qrCode.trim(),
                          version: QrVersions.auto,
                          gapless: false,
                          size: 220,
                          backgroundColor: Colors.white,
                          errorStateBuilder: (context, error) {
                            return const SizedBox(
                              width: 220,
                              height: 220,
                              child: Center(
                                child: Text(
                                  'Khong ve duoc ma QR PayOS.',
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Quet ma QR bang app ngan hang de thanh toan.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              )
            else
              Text(
                _isExpired
                    ? 'Link thanh toan da het han. Neu van muon thanh toan, hay refresh payment de lay ma moi.'
                    : 'Server chua tra ma QR PayOS cho don nay.',
              ),
            if (_hasCheckoutUrl) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isExpired ? null : widget.onOpenCheckoutUrl,
                  icon: const Icon(Icons.open_in_browser_outlined),
                  label: const Text('Thanh toan'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PaymentStatusPill extends StatelessWidget {
  const _PaymentStatusPill({
    required this.label,
    required this.expired,
  });

  final String label;
  final bool expired;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backgroundColor = expired
        ? theme.colorScheme.errorContainer
        : const Color(0xFFE8F0E0);
    final foregroundColor = expired
        ? theme.colorScheme.onErrorContainer
        : const Color(0xFF17332A);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Text(
          label,
          style: theme.textTheme.labelLarge?.copyWith(
            color: foregroundColor,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
