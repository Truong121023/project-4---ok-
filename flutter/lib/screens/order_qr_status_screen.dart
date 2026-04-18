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
    this.title = 'Order details',
  });

  final MobileOrderQrResolveResponse response;
  final String viewerRole;
  final String title;

  @override
  State<OrderQrStatusScreen> createState() => _OrderQrStatusScreenState();
}

class _OrderQrStatusScreenState extends State<OrderQrStatusScreen> {
  late JsonMap _order;

  @override
  void initState() {
    super.initState();
    _order = Map<String, dynamic>.from(widget.response.order);
  }

  List<String> get _allowedActions => asStringList(_order['allowedActions']).map((action) => action.toUpperCase()).toList();

  bool get _storeConfirmed => asNullableInt(_order['confirmedByUserId']) != null || asDateTime(_order['confirmedAt']) != null;

  bool get _canViewInvoice =>
      asBool(_order['invoiceAvailable']) || _allowedActions.contains('VIEW_INVOICE');

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
    if (widget.response.message.isNotEmpty) {
      return widget.response.message;
    }
    if (_storeConfirmed) {
      return 'The store has confirmed the order.';
    }
    return 'The order details are ready.';
  }

  String _heroSubtitle() {
    final summary = asString(_order['statusSummary']).trim();
    if (summary.isNotEmpty) {
      return summary;
    }
    return 'Track the order directly in the app.';
  }

  Future<void> _openExternalUrl(String? url) async {
    if (url == null || url.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The server did not return a link to open yet.')),
      );
      return;
    }
    final uri = Uri.tryParse(url);
    if (uri == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The URL is invalid.')),
      );
      return;
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open $url')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final isUserViewer = widget.viewerRole.toUpperCase() == 'USER';
    final totalAmount = asDouble(_order['totalAmount']);
    final invoiceNumber = asString(_order['invoiceNumber']);
    final storeName = asString(_order['storeName'], 'Kamatcha');
    final proofImagePath = asNullableString(_order['deliveryProofImagePath']);
    final proofNote = asNullableString(_order['deliveryProofNote']);
    final invoiceUrl = asNullableString(_order['invoicePreviewUrl']) ?? asNullableString(_order['invoiceDownloadUrl']);
    final visibleActions = isUserViewer ? _allowedActions : const <String>[];

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
                      if (_storeConfirmed) const MetricChip(label: 'Confirmed'),
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
                    Text('Invoice: $invoiceNumber'),
                  ],
                  if (totalAmount > 0) ...[
                    const SizedBox(height: 8),
                    Text('Total amount: ${Formatters.currency(totalAmount)}'),
                  ],
                  if (widget.response.claimedByUserName != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      widget.response.claimedByUserRole == null || widget.response.claimedByUserRole!.trim().isEmpty
                          ? 'QR claimed by: ${widget.response.claimedByUserName}'
                          : 'QR claimed by: ${widget.response.claimedByUserName} (${widget.response.claimedByUserRole})',
                    ),
                  ],
                  if (widget.response.executedAction != null) ...[
                    const SizedBox(height: 8),
                    Text('Last action: ${widget.response.executedAction}'),
                  ],
                  if (asString(_order['deliveryFullName']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Recipient: ${asString(_order['deliveryFullName'])}'),
                  ],
                  if (asString(_order['deliveryPhoneNumber']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Phone: ${asString(_order['deliveryPhoneNumber'])}'),
                  ],
                  if (asString(_order['deliveryAddress']).isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Delivery address: ${asString(_order['deliveryAddress'])}'),
                  ],
                  if (asDateTime(_order['createdAt']) != null) ...[
                    const SizedBox(height: 8),
                    Text('Created at: ${Formatters.fullDateTime(asDateTime(_order['createdAt'])!)}'),
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
            deliveryStatus: asString(_order['status']),
            deliveryProofCapturedAt: asDateTime(_order['deliveryProofCapturedAt']),
          ),
          const SizedBox(height: 20),
          SectionHeader(
            title: isUserViewer ? 'Available actions and documents' : 'Available documents',
            subtitle: isUserViewer
                ? 'Only valid actions for the current live order state are shown here.'
                : 'This role can only view order details and open the invoice on mobile.',
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (visibleActions.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: visibleActions.map((action) => MetricChip(label: action)).toList(),
                    )
                  else
                    Text(
                      isUserViewer
                          ? 'The current role is in order-view mode only.'
                          : 'Mobile does not open the manager/admin workflow for this order.',
                    ),
                  if (_canViewInvoice) ...[
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (_canViewInvoice)
                          OutlinedButton.icon(
                            onPressed: () => _openExternalUrl(invoiceUrl),
                            icon: const Icon(Icons.receipt_long_outlined),
                            label: const Text('Open invoice'),
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
              title: 'Delivery proof',
              subtitle: 'The delivery proof image has been saved on the system.',
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
                        'Uploaded at ${Formatters.fullDateTime(asDateTime(_order['deliveryProofUploadedAt'])!)}',
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
