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

  Future<void> _openGoogleMapsDirections() async {
    final controller = AppScope.of(context);
    final origin = _shipperOriginAddress(controller);
    final destination = _shipperDestinationAddress();

    if (destination.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Don hang nay chua co dia chi nguoi nhan de mo ban do.')),
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
        const SnackBar(content: Text('Khong mo duoc Google Maps.')),
      );
    }
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
      if (action == 'complete-delivery') {
        photoPath = await _captureProofImage(asInt(_order['id']));
        if (photoPath == null) {
          if (!mounted) {
            return;
          }
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Can chup anh giao hang truoc khi hoan tat don.')),
          );
          return;
        }
        uploadedProof = await controller.uploadEmployeeDeliveryProof(
          orderId: asInt(_order['id']),
          filePath: photoPath,
        );
      }

      final updated = await controller.runEmployeeOrderAction(
        orderId: asInt(_order['id']),
        action: action,
      );
      if (uploadedProof != null) {
        updated.addAll(uploadedProof);
        updated['deliveryProofImagePath'] = updated['deliveryProofImagePath'] ?? uploadedProof['imagePath'];
        updated['deliveryProofCapturedAt'] = updated['deliveryProofCapturedAt'] ?? uploadedProof['capturedAt'];
        updated['deliveryProofUploadedAt'] = updated['deliveryProofUploadedAt'] ?? uploadedProof['uploadedAt'];
        updated['deliveryProofNote'] = updated['deliveryProofNote'] ?? uploadedProof['note'];
      }
      if (action == 'mark-ready' || action == 'complete-delivery') {
        await controller.saveOrderProofRecord(
          role: employeeRoleLabel(widget.kind),
          orderSnapshot: updated,
          photoPath: photoPath,
        );
      }

      if (!mounted) {
        return;
      }

      setState(() => _order = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            uploadedProof == null && action == 'complete-delivery'
                ? '${asString(updated['statusSummary'], 'Da cap nhat don hang.')} Anh proof dang duoc luu tren may vi server chua ho tro upload.'
                : asString(updated['statusSummary'], 'Da cap nhat don hang.'),
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
                        : asString(_order['statusSummary'], 'Theo doi don hang ngay trong app.'),
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
                    '${asString(_order['storeName'], 'Tea Matcha')} - ${employeeOrderSubtitle(_order)}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  if (totalAmount > 0) Text('Tong tien: ${Formatters.currency(totalAmount)}'),
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
                    Text('Dia chi: ${asString(_order['deliveryAddress'])}'),
                  ],
                  if (widget.kind == EmployeeRoleKind.shipper &&
                      shipperDestinationAddress.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Lo trinh giao hang',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 8),
                    if (shipperOriginAddress.isNotEmpty) ...[
                      Text('Di tu: $shipperOriginAddress'),
                      const SizedBox(height: 6),
                    ],
                    Text('Den: $shipperDestinationAddress'),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonalIcon(
                        onPressed: _openGoogleMapsDirections,
                        icon: const Icon(Icons.map_outlined),
                        label: const Text('Mo Google Maps de giao hang'),
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
            deliveryProofCapturedAt: asDateTime(_order['deliveryProofCapturedAt']),
          ),
          const SizedBox(height: 20),
          SectionHeader(
            title: 'Thao tac hien tai',
            subtitle: 'Chi hien cac buoc hop le cho don hang nay.',
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: allowedActions.isEmpty
                    ? [const MetricChip(label: 'Khong co thao tac')]
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
                label: const Text('Mo hoa don'),
              ),
            ),
          ],
          if (serverProofImagePath != null) ...[
            const SizedBox(height: 20),
            SectionHeader(
              title: 'Proof giao hang tu server',
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
                        'Upload luc ${Formatters.fullDateTime(asDateTime(_order['deliveryProofUploadedAt'])!)}',
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
          if (proofRecord?.photoPath != null && File(proofRecord!.photoPath!).existsSync()) ...[
            const SizedBox(height: 20),
            SectionHeader(
              title: 'Anh giao thanh cong',
              subtitle: 'Anh duoc luu tren may sau khi chot don.',
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
                    widget.kind == EmployeeRoleKind.shipper ? Icons.camera_alt_outlined : Icons.check_circle_outline,
                  ),
                  label: Text(
                    _busy
                        ? 'Dang xu ly...'
                        : widget.kind == EmployeeRoleKind.shipper && actionLabel == 'Da giao don'
                            ? 'Chup anh & $actionLabel'
                            : actionLabel,
                  ),
                ),
              ),
            ),
    );
  }
}
