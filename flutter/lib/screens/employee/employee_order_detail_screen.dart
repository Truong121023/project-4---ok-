import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../core/services/api_service.dart';
import '../../core/utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/order_processing_timeline.dart';
import 'employee_support.dart';

class EmployeeOrderDetailScreen extends StatefulWidget {
  const EmployeeOrderDetailScreen({
    super.key,
    required this.kind,
    required this.initialOrder,
    this.bannerMessage,
  });

  final EmployeeRoleKind kind;
  final JsonMap initialOrder;
  final String? bannerMessage;

  @override
  State<EmployeeOrderDetailScreen> createState() => _EmployeeOrderDetailScreenState();
}

class _EmployeeOrderDetailScreenState extends State<EmployeeOrderDetailScreen> {
  final ImagePicker _imagePicker = ImagePicker();
  late JsonMap _order;
  bool _busy = false;
  bool _loadedDetail = false;

  @override
  void initState() {
    super.initState();
    _order = Map<String, dynamic>.from(widget.initialOrder);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedDetail) {
      return;
    }
    _loadedDetail = true;
    _refreshOrderDetail();
  }

  Future<void> _refreshOrderDetail() async {
    final orderId = asInt(_order['id']);
    if (orderId == 0) {
      return;
    }
    final controller = AppScope.of(context);
    try {
      final detail = await controller.loadEmployeeOrderDetail(orderId);
      if (!mounted) {
        return;
      }
      setState(() => _order = detail);
    } catch (_) {
      // Keep the QR payload on-screen even if the detail endpoint is unavailable.
    }
  }

  Future<String?> _captureProofImage(int orderId) async {
    final captured = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
      maxWidth: 1600,
    );
    if (captured == null) {
      return null;
    }
    final directory = await getApplicationDocumentsDirectory();
    final proofsDirectory = Directory('${directory.path}/delivery_proofs');
    await proofsDirectory.create(recursive: true);
    final extension = captured.path.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    final target = File(
      '${proofsDirectory.path}/order_${orderId}_${DateTime.now().millisecondsSinceEpoch}.$extension',
    );
    return File(captured.path).copy(target.path).then((file) => file.path);
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

  String _shipperOriginAddress(dynamic controller) {
    final candidates = [
      asNullableString(_order['storeAddress']),
      asNullableString(_order['relatedStoreAddress']),
      controller.session?.user.workingStoreAddress,
      asNullableString(_order['storeName']),
    ];
    for (final candidate in candidates) {
      final value = (candidate ?? '').trim();
      if (value.isNotEmpty) {
        return value;
      }
    }
    return '';
  }

  String _shipperDestinationAddress() {
    return asString(_order['deliveryAddress']).trim();
  }

  String _deliveryAssignmentSummary(int currentUserId, List<String> allowedActions) {
    final shipperName = asNullableString(_order['deliveringShipperName'])?.trim();
    final shipperId = asNullableInt(_order['deliveringShipperId']);
    final status = asString(_order['status']).trim().toUpperCase();

    if ((shipperName == null || shipperName.isEmpty) && shipperId == null) {
      return status == 'READY_FOR_SHIPPER'
          ? 'The manager has not assigned a shipper to this order yet. It will wait here until a shipper is assigned for pickup.'
          : 'No shipper information is available for this order yet.';
    }

    final identity = shipperName != null && shipperName.isNotEmpty
        ? shipperId == null
            ? shipperName
            : '$shipperName (#$shipperId)'
        : 'Shipper #$shipperId';
    final assignmentSummary = switch (status) {
      'READY_FOR_SHIPPER' => '$identity has been assigned and is waiting for pickup.',
      'OUT_FOR_DELIVERY' => '$identity is delivering this order.',
      'COMPLETED' => '$identity completed this delivery successfully.',
      _ => '$identity is currently assigned to this delivery.',
    };
    final isDifferentShipper = widget.kind == EmployeeRoleKind.shipper &&
        shipperId != null &&
        shipperId != currentUserId &&
        !allowedActions.contains('ACCEPT_DELIVERY');
    if (!isDifferentShipper) {
      return assignmentSummary;
    }
    return '$assignmentSummary This order is assigned to another shipper, so the pickup button follows backend allowedActions.';
  }

  Future<void> _openGoogleMapsDirections() async {
    final controller = AppScope.of(context);
    final origin = _shipperOriginAddress(controller);
    final destination = _shipperDestinationAddress();

    if (destination.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This order does not have a recipient address yet, so the map cannot be opened.')),
      );
      return;
    }

    final uri = Uri.https(
      'www.google.com',
      '/maps/dir/',
      {
        'api': '1',
        if (origin.isNotEmpty) 'origin': origin,
        'destination': destination,
        'travelmode': 'driving',
      },
    );

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open Google Maps.')),
      );
    }
  }

  Future<void> _callCustomer() async {
    final phone = asString(_order['deliveryPhoneNumber']).trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This order does not have a phone number to call yet.')),
      );
      return;
    }
    await _openExternalUrl('tel:$phone');
  }

  Future<void> _handlePrimaryAction() async {
    if (_busy) {
      return;
    }
    final controller = AppScope.of(context);
    final currentUserId = controller.session?.user.id ?? 0;
    final action = employeeActionPath(widget.kind, _order, currentUserId);
    if (action == null) {
      return;
    }

    setState(() => _busy = true);
    try {
      String? photoPath;
      JsonMap? uploadedProof;
      JsonMap updated;
      if (action == 'complete-delivery') {
        photoPath = await _captureProofImage(asInt(_order['id']));
        if (photoPath == null) {
          if (!mounted) {
            return;
          }
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Take a delivery photo before completing the order.')),
          );
          return;
        }
        uploadedProof = await controller.uploadEmployeeDeliveryProof(
          orderId: asInt(_order['id']),
          filePath: photoPath,
        );
        await controller.saveOrderProofRecord(
          role: employeeRoleLabel(widget.kind),
          orderSnapshot: {
            ..._order,
            if (uploadedProof != null) ...uploadedProof,
          },
          photoPath: photoPath,
        );
        try {
          updated = await controller.loadEmployeeOrderDetail(asInt(_order['id']));
        } catch (_) {
          updated = Map<String, dynamic>.from(_order);
          if (uploadedProof != null) {
            updated['deliveryProofImagePath'] =
                uploadedProof['imagePath'] ?? updated['deliveryProofImagePath'];
            updated['deliveryProofCapturedAt'] =
                uploadedProof['capturedAt'] ?? updated['deliveryProofCapturedAt'];
            updated['deliveryProofUploadedAt'] =
                uploadedProof['uploadedAt'] ?? updated['deliveryProofUploadedAt'];
            updated['deliveryProofNote'] =
                uploadedProof['note'] ?? updated['deliveryProofNote'];
          }
          updated['status'] = 'COMPLETED';
          updated['statusSummary'] =
              asString(updated['statusSummary'], 'Delivery proof uploaded and the order is now completed.');
        }
      } else {
        updated = await controller.runEmployeeOrderAction(
          orderId: asInt(_order['id']),
          action: action,
        );
      }

      if (!mounted) {
        return;
      }

      setState(() => _order = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            uploadedProof != null
                ? asString(updated['statusSummary'],
                    'Delivery proof uploaded and the order is now completed.')
                : asString(updated['statusSummary'], 'Order updated.'),
          ),
        ),
      );
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final currentUserId = controller.session?.user.id ?? 0;
    final actionLabel = employeeActionLabel(widget.kind, _order, currentUserId);
    final proofRecord = controller.findOrderProofRecord(asInt(_order['id']));
    final allowedActions = employeeAllowedActions(_order);
    final totalAmount = asDouble(_order['totalAmount']);
    final canViewInvoice =
        asBool(_order['invoiceAvailable']) || allowedActions.contains('VIEW_INVOICE');
    final invoiceUrl = asNullableString(_order['invoicePreviewUrl']) ?? asNullableString(_order['invoiceDownloadUrl']);
    final serverProofImagePath = asNullableString(_order['deliveryProofImagePath']);
    final serverProofNote = asNullableString(_order['deliveryProofNote']);
    final shipperOriginAddress = _shipperOriginAddress(controller);
    final shipperDestinationAddress = _shipperDestinationAddress();
    final shipperId = asNullableInt(_order['deliveringShipperId']);
    final shipperName = asNullableString(_order['deliveringShipperName'])?.trim();
    final showDeliveryAssignmentCard =
        asString(_order['status']).trim().toUpperCase() == 'READY_FOR_SHIPPER' ||
        shipperId != null ||
        (shipperName != null && shipperName.isNotEmpty);

    if (widget.kind == EmployeeRoleKind.shipper) {
      final customerName = asString(_order['deliveryFullName']).trim();
      final customerPhone = asString(_order['deliveryPhoneNumber']).trim();
      final customerAddress = asString(_order['deliveryAddress']).trim();
      final shippingFee = asDouble(_order['shippingFeeAmount']);

      return Scaffold(
        appBar: AppBar(
          title: Text('Order #${asInt(_order['id'])}'),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 180),
          children: [
            _ShipperOrderHeroCard(
              status: asString(_order['status'], 'ORDER'),
              paymentStatus: asString(_order['paymentStatus']),
              title: widget.bannerMessage?.trim().isNotEmpty == true
                  ? widget.bannerMessage!
                  : asString(
                      _order['statusSummary'],
                      'Track the order directly in the app.',
                    ),
              totalAmount: totalAmount,
              shippingFeeAmount: shippingFee,
            ),
            const SizedBox(height: 18),
            _ShipperDeliveryCard(
              storeName: asString(_order['storeName'], 'Kamatcha'),
              customerName: customerName,
              customerPhone: customerPhone,
              customerAddress: customerAddress,
              paymentStatus: asString(_order['paymentStatus']),
              totalAmount: totalAmount,
              shippingFeeAmount: shippingFee,
            ),
            const SizedBox(height: 18),
            _ShipperRouteCard(
              originAddress: shipperOriginAddress,
              destinationAddress: shipperDestinationAddress,
              onOpenMaps: shipperDestinationAddress.isEmpty
                  ? null
                  : _openGoogleMapsDirections,
            ),
            if (showDeliveryAssignmentCard) ...[
              const SizedBox(height: 18),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(
                        title: 'Delivery assignment',
                        subtitle:
                            'See the assigned shipper and the current assignment status here.',
                      ),
                      const SizedBox(height: 14),
                      Text(
                        _deliveryAssignmentSummary(currentUserId, allowedActions),
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          MetricChip(
                            label: shipperName == null || shipperName.isEmpty
                                ? 'No shipper assigned'
                                : 'Shipper: $shipperName',
                          ),
                          if (shipperId != null)
                            MetricChip(label: 'ID: $shipperId'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(
                      title: 'Additional details',
                      subtitle:
                          'Invoice access, allowed actions, and delivery proof are grouped below.',
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: allowedActions.isEmpty
                          ? const [MetricChip(label: 'No actions available')]
                          : allowedActions
                              .map((action) => MetricChip(label: action))
                              .toList(),
                    ),
                    if (canViewInvoice) ...[
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => _openExternalUrl(invoiceUrl),
                          icon: const Icon(Icons.receipt_long_outlined),
                          label: const Text('Open invoice'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (serverProofImagePath != null) ...[
              const SizedBox(height: 20),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(
                        title: 'Delivery proof from server',
                        subtitle:
                            'The delivery proof image has been saved on the system.',
                      ),
                      const SizedBox(height: 14),
                      NetworkOrFallbackImage(
                        imageUrl:
                            controller.config.resolveImageUrl(serverProofImagePath),
                        height: 220,
                        borderRadius: BorderRadius.circular(24),
                        label: 'Server proof',
                      ),
                      if (serverProofNote != null) ...[
                        const SizedBox(height: 12),
                        Text(serverProofNote),
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
            if (proofRecord?.photoPath != null &&
                File(proofRecord!.photoPath!).existsSync()) ...[
              const SizedBox(height: 20),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(
                        title: 'Successful delivery photo',
                        subtitle: 'The image is stored on the device after the order is completed.',
                      ),
                      const SizedBox(height: 14),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: AspectRatio(
                          aspectRatio: 4 / 3,
                          child: Image.file(
                            File(proofRecord.photoPath!),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            const SectionHeader(
              title: 'Order timeline',
              subtitle:
                  'Track the order flow from store confirmation through final delivery.',
            ),
            const SizedBox(height: 12),
            OrderProcessingTimeline(
              confirmedByUserName: asNullableString(_order['confirmedByUserName']),
              confirmedByUserRole: asNullableString(_order['confirmedByUserRole']),
              confirmedAt: asDateTime(_order['confirmedAt']),
              preparingStaffName: asNullableString(_order['preparingStaffName']),
              deliveringShipperName:
                  asNullableString(_order['deliveringShipperName']),
              deliveryStatus: asString(_order['status']),
              deliveryProofCapturedAt:
                  asDateTime(_order['deliveryProofCapturedAt']),
            ),
          ],
        ),
        bottomNavigationBar: _ShipperOrderActionBar(
          canCallCustomer: customerPhone.isNotEmpty,
          canOpenMaps: shipperDestinationAddress.isNotEmpty,
          primaryLabel: actionLabel == null
              ? null
              : (_busy
                  ? 'Processing...'
                  : actionLabel == 'Upload delivery proof'
                      ? 'Take photo and complete delivery'
                      : actionLabel),
          primaryIcon: actionLabel == null
              ? null
              : (actionLabel == 'Upload delivery proof'
                  ? Icons.camera_alt_outlined
                  : Icons.check_circle_outline),
          primaryBusy: _busy,
          onCallCustomer: _callCustomer,
          onOpenMaps: _openGoogleMapsDirections,
          onPrimaryAction: actionLabel == null ? null : _handlePrimaryAction,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('#${asInt(_order['id'])}'),
      ),
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
                      MetricChip(label: employeeRoleLabel(widget.kind)),
                      MetricChip(label: asString(_order['status'], 'ORDER')),
                      if (asString(_order['paymentStatus']).isNotEmpty)
                        MetricChip(label: asString(_order['paymentStatus'])),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.bannerMessage?.trim().isNotEmpty == true
                        ? widget.bannerMessage!
                        : asString(_order['statusSummary'], 'Track the order directly in the app.'),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
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
                    '${asString(_order['storeName'], 'Kamatcha')} - ${employeeOrderSubtitle(_order)}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  if (totalAmount > 0) Text('Total: ${Formatters.currency(totalAmount)}'),
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
                    Text('Address: ${asString(_order['deliveryAddress'])}'),
                  ],
                  if (widget.kind == EmployeeRoleKind.shipper &&
                      shipperDestinationAddress.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Delivery route',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 8),
                    if (shipperOriginAddress.isNotEmpty) ...[
                      Text('From: $shipperOriginAddress'),
                      const SizedBox(height: 6),
                    ],
                    Text('To: $shipperDestinationAddress'),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonalIcon(
                        onPressed: _openGoogleMapsDirections,
                        icon: const Icon(Icons.map_outlined),
                        label: const Text('Open Google Maps for delivery'),
                      ),
                    ),
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
          if (showDeliveryAssignmentCard) ...[
            const SizedBox(height: 20),
            const SectionHeader(
              title: 'Delivery assignment',
              subtitle: 'This assignment is synced directly from the latest employee order response.',
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _deliveryAssignmentSummary(currentUserId, allowedActions),
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MetricChip(
                          label: shipperName == null || shipperName.isEmpty
                              ? 'No shipper assigned'
                              : 'Shipper: $shipperName',
                        ),
                        if (shipperId != null) MetricChip(label: 'ID: $shipperId'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          const SectionHeader(
            title: 'Available actions',
            subtitle: 'Only valid workflow steps for this order are shown here.',
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: allowedActions.isEmpty
                    ? [const MetricChip(label: 'No actions available')]
                    : allowedActions.map((action) => MetricChip(label: action)).toList(),
              ),
            ),
          ),
          if (canViewInvoice) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _openExternalUrl(invoiceUrl),
                icon: const Icon(Icons.receipt_long_outlined),
                label: const Text('Open invoice'),
              ),
            ),
          ],
          if (serverProofImagePath != null) ...[
            const SizedBox(height: 20),
            const SectionHeader(
              title: 'Delivery proof from server',
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
                      imageUrl: controller.config.resolveImageUrl(serverProofImagePath),
                      height: 220,
                      borderRadius: BorderRadius.circular(24),
                      label: 'Server proof',
                    ),
                    if (serverProofNote != null) ...[
                      const SizedBox(height: 12),
                      Text(serverProofNote),
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
          if (proofRecord?.photoPath != null && File(proofRecord!.photoPath!).existsSync()) ...[
            const SizedBox(height: 20),
            const SectionHeader(
              title: 'Successful delivery photo',
              subtitle: 'The image is stored on the device after the order is completed.',
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: AspectRatio(
                aspectRatio: 4 / 3,
                child: Image.file(
                  File(proofRecord.photoPath!),
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ],
        ],
      ),
      bottomNavigationBar: actionLabel == null
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: FilledButton.icon(
                  onPressed: _busy ? null : _handlePrimaryAction,
                  icon: Icon(
                    widget.kind == EmployeeRoleKind.shipper
                        ? Icons.camera_alt_outlined
                        : Icons.check_circle_outline,
                  ),
                  label: Text(
                    _busy
                        ? 'Processing...'
                        : widget.kind == EmployeeRoleKind.shipper &&
                                actionLabel == 'Upload delivery proof'
                            ? 'Take photo and complete delivery'
                            : actionLabel,
                  ),
                ),
              ),
            ),
    );
  }
}

class _ShipperOrderHeroCard extends StatelessWidget {
  const _ShipperOrderHeroCard({
    required this.status,
    required this.paymentStatus,
    required this.title,
    required this.totalAmount,
    required this.shippingFeeAmount,
  });

  final String status;
  final String paymentStatus;
  final String title;
  final double totalAmount;
  final double shippingFeeAmount;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF17332A), Color(0xFF355B49)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(
                  label: status,
                  backgroundColor: Colors.white.withValues(alpha: 0.14),
                  foregroundColor: Colors.white,
                ),
                if (paymentStatus.trim().isNotEmpty)
                  MetricChip(
                    label: paymentStatus,
                    backgroundColor: Colors.white.withValues(alpha: 0.14),
                    foregroundColor: Colors.white,
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    height: 1.15,
                  ),
            ),
            const SizedBox(height: 16),
            DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.12),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    SummaryLine(
                      label: 'Total payment',
                      value: Formatters.currency(totalAmount),
                      emphasize: true,
                      labelColor: Colors.white.withValues(alpha: 0.84),
                      valueColor: Colors.white,
                    ),
                    const SizedBox(height: 10),
                    SummaryLine(
                      label: 'Shipping fee',
                      value: shippingFeeAmount > 0
                          ? Formatters.currency(shippingFeeAmount)
                          : 'Updating',
                      labelColor: Colors.white.withValues(alpha: 0.84),
                      valueColor: Colors.white,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShipperDeliveryCard extends StatelessWidget {
  const _ShipperDeliveryCard({
    required this.storeName,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    required this.paymentStatus,
    required this.totalAmount,
    required this.shippingFeeAmount,
  });

  final String storeName;
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final String paymentStatus;
  final double totalAmount;
  final double shippingFeeAmount;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Delivery details',
              subtitle: 'Recipient, phone number, and address are placed at the top for quick access.',
            ),
            const SizedBox(height: 14),
            DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xFFF8F3E9),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFE8DECE)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      storeName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    if (customerName.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        customerName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ],
                    if (customerPhone.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(customerPhone),
                    ],
                    if (customerAddress.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        customerAddress,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              height: 1.35,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (paymentStatus.trim().isNotEmpty)
                  MetricChip(label: paymentStatus),
                if (totalAmount > 0)
                  MetricChip(label: Formatters.currency(totalAmount)),
                if (shippingFeeAmount > 0)
                  MetricChip(label: 'Ship ${Formatters.currency(shippingFeeAmount)}'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ShipperRouteCard extends StatelessWidget {
  const _ShipperRouteCard({
    required this.originAddress,
    required this.destinationAddress,
    required this.onOpenMaps,
  });

  final String originAddress;
  final String destinationAddress;
  final VoidCallback? onOpenMaps;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Delivery route',
              subtitle: 'Open Google Maps quickly and review both the pickup and drop-off points in one card.',
            ),
            const SizedBox(height: 14),
            if (originAddress.isEmpty && destinationAddress.isEmpty)
              const SoftInfoBanner(
                message: 'This order does not have enough information yet to open the delivery route.',
                icon: Icons.map_outlined,
              )
            else
              DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F3E9),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFE8DECE)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (originAddress.isNotEmpty) ...[
                        Text(
                          'Pickup',
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(originAddress),
                        const SizedBox(height: 14),
                      ],
                      if (destinationAddress.isNotEmpty) ...[
                        Text(
                          'Drop-off',
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(destinationAddress),
                      ],
                    ],
                  ),
                ),
              ),
            if (onOpenMaps != null) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.tonalIcon(
                  onPressed: onOpenMaps,
                  icon: const Icon(Icons.map_outlined),
                  label: const Text('Open Google Maps'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ShipperOrderActionBar extends StatelessWidget {
  const _ShipperOrderActionBar({
    required this.canCallCustomer,
    required this.canOpenMaps,
    required this.primaryLabel,
    required this.primaryIcon,
    required this.primaryBusy,
    required this.onCallCustomer,
    required this.onOpenMaps,
    required this.onPrimaryAction,
  });

  final bool canCallCustomer;
  final bool canOpenMaps;
  final String? primaryLabel;
  final IconData? primaryIcon;
  final bool primaryBusy;
  final VoidCallback onCallCustomer;
  final VoidCallback onOpenMaps;
  final VoidCallback? onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    if (!canCallCustomer && !canOpenMaps && primaryLabel == null) {
      return const SizedBox.shrink();
    }

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xFFFFFCF7),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFE8DDCC)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x16000000),
                blurRadius: 26,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    if (canCallCustomer)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: onCallCustomer,
                          icon: const Icon(Icons.call_outlined),
                          label: const Text('Call customer'),
                        ),
                      ),
                    if (canCallCustomer && canOpenMaps)
                      const SizedBox(width: 12),
                    if (canOpenMaps)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: onOpenMaps,
                          icon: const Icon(Icons.map_outlined),
                          label: const Text('Open Maps'),
                        ),
                      ),
                  ],
                ),
                if (primaryLabel != null) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: primaryBusy ? null : onPrimaryAction,
                      icon: primaryBusy
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(primaryIcon),
                      label: Text(primaryLabel!),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
