import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/order_processing_timeline.dart';

class OrderQrStatusScreen extends StatefulWidget {
  const OrderQrStatusScreen({
    super.key,
    required this.response,
    required this.viewerRole,
    this.title = 'Thong tin don hang',
    this.canManagerConfirm = false,
    this.orderBelongsToWorkingStore = false,
    this.onConfirmManager,
  });

  final MobileOrderQrResolveResponse response;
  final String viewerRole;
  final String title;
  final bool canManagerConfirm;
  final bool orderBelongsToWorkingStore;
  final Future<JsonMap> Function()? onConfirmManager;

  @override
  State<OrderQrStatusScreen> createState() => _OrderQrStatusScreenState();
}

class _OrderQrStatusScreenState extends State<OrderQrStatusScreen> {
  late JsonMap _order;
  bool _confirming = false;

  @override
  void initState() {
    super.initState();
    _order = Map<String, dynamic>.from(widget.response.order);
  }

  List<String> get _allowedActions => asStringList(_order['allowedActions']).map((action) => action.toUpperCase()).toList();

  bool get _managerConfirmed => asNullableInt(_order['confirmedByUserId']) != null || asDateTime(_order['confirmedAt']) != null;

  bool get _canViewInvoice =>
      asBool(_order['invoiceAvailable']) || _allowedActions.contains('VIEW_INVOICE');

  bool get _canManagerConfirm =>
      widget.viewerRole.toUpperCase() == 'MANAGER' &&
      widget.canManagerConfirm &&
      _allowedActions.contains('CONFIRM_ORDER') &&
      !_managerConfirmed;

  String _roleBadge() {
    return switch (widget.viewerRole.toUpperCase()) {
      'USER' => 'USER QR',
      'STAFF' => 'STAFF QR',
      'SHIPPER' => 'SHIPPER QR',
      'MANAGER' => 'MANAGER QR',
      'ADMIN' => 'ADMIN QR',
      _ => '${widget.viewerRole.toUpperCase()} QR',
    };
  }

  String _heroTitle() {
    if (widget.viewerRole.toUpperCase() == 'MANAGER') {
      if (_managerConfirmed) {
        return 'Don da duoc xac nhan boi cua hang.';
      }
      if (_canManagerConfirm) {
        return 'Don nay dang cho manager cua store xac nhan.';
      }
      return widget.orderBelongsToWorkingStore
          ? 'Manager dang o che do xem thong tin don.'
          : 'Don nay khong thuoc cua hang dang duoc manager nay phu trach.';
    }
    return widget.response.message.isEmpty ? 'Thong tin don hang da san sang.' : widget.response.message;
  }

  String _heroSubtitle() {
    final summary = asString(_order['statusSummary']).trim();
    if (summary.isNotEmpty) {
      return summary;
    }
    return 'Theo doi don hang ngay trong app.';
  }

  Future<void> _openExternalUrl(String? url) async {
    if (url == null || url.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Server chua tra URL de mo.')),
      );
      return;
    }
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL khong hop le.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Khong mo duoc $url')),
      );
    }
  }

  Future<void> _confirmManagerCheck() async {
    if (_confirming || widget.onConfirmManager == null) {
      return;
    }
    setState(() => _confirming = true);
    try {
      final updated = await widget.onConfirmManager!();
      if (!mounted) {
        return;
      }
      setState(() => _order = Map<String, dynamic>.from(updated));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            asString(updated['statusSummary'], 'Da xac nhan thong tin don cua cua hang.'),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _confirming = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final totalAmount = asDouble(_order['totalAmount']);
    final invoiceNumber = asString(_order['invoiceNumber']);
    final storeName = asString(_order['storeName'], 'Kamatcha');
    final proofImagePath = asNullableString(_order['deliveryProofImagePath']);
    final proofNote = asNullableString(_order['deliveryProofNote']);
    final invoiceUrl = asNullableString(_order['invoicePreviewUrl']) ?? asNullableString(_order['invoiceDownloadUrl']);

    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          Card(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF17332A), Color(0xFF4A7253)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.all(Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      MetricChip(label: _roleBadge()),
                      MetricChip(label: asString(_order['status'], 'ORDER')),
                      if (asString(_order['paymentStatus']).isNotEmpty)
                        MetricChip(label: asString(_order['paymentStatus'])),
                      if (_managerConfirmed) const MetricChip(label: 'Da xac nhan'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _heroTitle(),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _heroSubtitle(),
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.white.withValues(alpha: 0.92),
                        ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '#${asInt(_order['id'])} - $storeName',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  if (invoiceNumber.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text('Hoa don: $invoiceNumber'),
                  ],
                  if (totalAmount > 0) ...[
                    const SizedBox(height: 8),
                    Text('Tong tien: ${Formatters.currency(totalAmount)}'),
                  ],
                  if (widget.response.claimedByUserName != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      widget.response.claimedByUserRole == null || widget.response.claimedByUserRole!.trim().isEmpty
                          ? 'Nguoi da nhan QR: ${widget.response.claimedByUserName}'
                          : 'Nguoi da nhan QR: ${widget.response.claimedByUserName} (${widget.response.claimedByUserRole})',
                    ),
                  ],
                  if (widget.response.executedAction != null) ...[
                    const SizedBox(height: 8),
                    Text('Buoc vua thuc hien: ${widget.response.executedAction}'),
                  ],
                  if (asString(_order['deliveryFullName']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Nguoi nhan: ${asString(_order['deliveryFullName'])}'),
                  ],
                  if (asString(_order['deliveryPhoneNumber']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('So dien thoai: ${asString(_order['deliveryPhoneNumber'])}'),
                  ],
                  if (asString(_order['deliveryAddress']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Dia chi giao: ${asString(_order['deliveryAddress'])}'),
                  ],
                  if (asDateTime(_order['createdAt']) != null) ...[
                    const SizedBox(height: 8),
                    Text('Tao luc: ${Formatters.fullDateTime(asDateTime(_order['createdAt'])!)}'),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          OrderProcessingTimeline(
            confirmedByUserName: asNullableString(_order['confirmedByUserName']),
            confirmedByUserRole: asNullableString(_order['confirmedByUserRole']),
            confirmedAt: asDateTime(_order['confirmedAt']),
            preparingStaffName: asNullableString(_order['preparingStaffName']),
            deliveringShipperName: asNullableString(_order['deliveringShipperName']),
            deliveryProofCapturedAt: asDateTime(_order['deliveryProofCapturedAt']),
          ),
          if (widget.viewerRole.toUpperCase() == 'MANAGER') ...[
            const SizedBox(height: 20),
          SectionHeader(
            title: 'Xac nhan cua hang',
            subtitle: _canManagerConfirm
                  ? 'Manager co the xac nhan don ngay tu man quet QR.'
                  : widget.orderBelongsToWorkingStore
                      ? 'Manager dang xem thong tin don cua cua hang minh.'
                      : 'Don nay khong thuoc cua hang dang duoc phan cong.',
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _managerConfirmed
                          ? 'Don nay da co nguoi xac nhan o buoc cua hang.'
                          : _canManagerConfirm
                              ? 'Sau khi xac nhan, don se chuyen sang buoc nhan vien xu ly.'
                              : 'Khong co thao tac xac nhan them cho don nay.',
                    ),
                    if (_canManagerConfirm) ...[
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _confirming ? null : _confirmManagerCheck,
                          icon: const Icon(Icons.verified_outlined),
                          label: Text(_confirming ? 'Dang xac nhan...' : 'Xac nhan don'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          SectionHeader(
            title: 'Thao tac va tai lieu',
            subtitle: 'Chi hien nhung nut hop le o thoi diem hien tai.',
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_allowedActions.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _allowedActions.map((action) => MetricChip(label: action)).toList(),
                    )
                  else
                    const Text('Role hien tai dang o che do xem thong tin don hang.'),
                  if (_canViewInvoice || _canManagerConfirm) ...[
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (_canViewInvoice)
                          OutlinedButton.icon(
                            onPressed: () => _openExternalUrl(invoiceUrl),
                            icon: const Icon(Icons.receipt_long_outlined),
                            label: const Text('Mo hoa don'),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (proofImagePath != null) ...[
            const SizedBox(height: 20),
            SectionHeader(
              title: 'Proof giao hang',
              subtitle: 'Anh xac nhan giao hang da duoc luu tren he thong.',
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    NetworkOrFallbackImage(
                      imageUrl: controller.config.resolveImageUrl(proofImagePath),
                      height: 220,
                      borderRadius: BorderRadius.circular(24),
                      label: 'Delivery proof',
                    ),
                    if (proofNote != null) ...[
                      const SizedBox(height: 12),
                      Text(proofNote),
                    ],
                    if (asDateTime(_order['deliveryProofUploadedAt']) != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Upload luc ${Formatters.fullDateTime(asDateTime(_order['deliveryProofUploadedAt'])!)}',
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
