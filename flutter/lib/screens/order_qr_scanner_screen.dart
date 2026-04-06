import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../core/utils/order_qr_utils.dart';
import '../widgets/app_widgets.dart';

class OrderQrScannerScreen extends StatefulWidget {
  const OrderQrScannerScreen({
    super.key,
    required this.title,
    required this.subtitle,
    required this.onTokenResolved,
    this.header,
    this.requireManualCameraOpen = false,
    this.openCameraLabel = 'Mo camera',
    this.cameraIntroTitle = 'San sang quet QR',
    this.cameraIntroMessage = 'Bam nut ben duoi khi ban muon bat camera de quet ma.',
  });

  final String title;
  final String subtitle;
  final Widget? header;
  final Future<void> Function(String token) onTokenResolved;
  final bool requireManualCameraOpen;
  final String openCameraLabel;
  final String cameraIntroTitle;
  final String cameraIntroMessage;

  @override
  State<OrderQrScannerScreen> createState() => _OrderQrScannerScreenState();
}

class _OrderQrScannerScreenState extends State<OrderQrScannerScreen> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  final TextEditingController _manualController = TextEditingController();
  bool _busy = false;
  late bool _cameraOpened;

  @override
  void initState() {
    super.initState();
    _cameraOpened = !widget.requireManualCameraOpen;
  }

  @override
  void dispose() {
    _manualController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _handleRawValue(String rawValue) async {
    if (_busy) {
      return;
    }
    final token = extractOrderQrToken(rawValue);
    if (token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('QR nay khong dung dinh dang don hang.')),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      await widget.onTokenResolved(token);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _openCamera() {
    if (_cameraOpened) {
      return;
    }
    setState(() => _cameraOpened = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          if (widget.header != null) ...[
            widget.header!,
            const SizedBox(height: 16),
          ],
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.subtitle,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 16),
                  if (_cameraOpened)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: AspectRatio(
                        aspectRatio: 1,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            MobileScanner(
                              controller: _scannerController,
                              onDetect: (capture) {
                                if (_busy || capture.barcodes.isEmpty) {
                                  return;
                                }
                                final rawValue = capture.barcodes.first.rawValue;
                                if (rawValue == null || rawValue.trim().isEmpty) {
                                  return;
                                }
                                _handleRawValue(rawValue);
                              },
                            ),
                            IgnorePointer(
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    width: 2,
                                  ),
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                child: Center(
                                  child: Container(
                                    width: 210,
                                    height: 210,
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: Colors.white.withValues(alpha: 0.95),
                                        width: 2,
                                      ),
                                      borderRadius: BorderRadius.circular(28),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            if (_busy)
                              ColoredBox(
                                color: Colors.black.withValues(alpha: 0.45),
                                child: const Center(
                                  child: CircularProgressIndicator(),
                                ),
                              ),
                          ],
                        ),
                      ),
                    )
                  else
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF4F7F1),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFD9E2D3)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            const Icon(Icons.qr_code_scanner, size: 56),
                            const SizedBox(height: 16),
                            Text(
                              widget.cameraIntroTitle,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              widget.cameraIntroMessage,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            FilledButton.icon(
                              onPressed: _openCamera,
                              icon: const Icon(Icons.camera_alt_outlined),
                              label: Text(widget.openCameraLabel),
                            ),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      MetricChip(label: _cameraOpened ? 'Dang quet QR' : 'Camera dang tat'),
                      const MetricChip(label: 'Chap nhan token hoac URL'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Nhap token thu cong',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Dung khi test tren emulator hoac khi ban da co san duong dan QR don hang.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _manualController,
                    minLines: 1,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      hintText: 'Dan link QR hoac ma don hang',
                      prefixIcon: Icon(Icons.qr_code_2),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _busy ? null : () => _handleRawValue(_manualController.text),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Xu ly QR'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const EmptyStateCard(
            title: 'Meo nho',
            message: 'Neu QR mo sang man hinh khac truoc, ban van co the quay lai day de quet lai hoac dan duong dan vao o ben tren.',
          ),
        ],
      ),
    );
  }
}
