import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/services/api_service.dart';

class AddressEditorScreen extends StatefulWidget {
  const AddressEditorScreen({
    super.key,
    this.address,
  });

  final DeliveryAddress? address;

  @override
  State<AddressEditorScreen> createState() => _AddressEditorScreenState();
}

class _AddressEditorScreenState extends State<AddressEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullNameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;
  late bool _primary;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController(text: widget.address?.fullName ?? '');
    _phoneController = TextEditingController(text: widget.address?.phoneNumber ?? '');
    _addressController = TextEditingController(text: widget.address?.deliveryAddress ?? '');
    _primary = widget.address?.primary ?? false;
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final controller = AppScope.of(context);
    setState(() => _error = null);
    try {
      await controller.saveDeliveryAddress(
        existing: widget.address,
        fullName: _fullNameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        deliveryAddress: _addressController.text.trim(),
        primary: _primary,
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Khong luu duoc dia chi.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(widget.address == null ? 'Them dia chi' : 'Sua dia chi')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _fullNameController,
                      decoration: const InputDecoration(labelText: 'Nguoi nhan'),
                      validator: (value) => (value ?? '').trim().isEmpty ? 'Nhap ten nguoi nhan' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'So dien thoai'),
                      validator: (value) => (value ?? '').trim().length < 8 ? 'Nhap so hop le' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressController,
                      minLines: 2,
                      maxLines: 4,
                      decoration: const InputDecoration(labelText: 'Dia chi giao hang'),
                      validator: (value) => (value ?? '').trim().isEmpty ? 'Nhap dia chi' : null,
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _primary,
                      onChanged: (value) => setState(() => _primary = value),
                      title: const Text('Dat lam dia chi mac dinh'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          _error!,
                          style: TextStyle(color: Theme.of(context).colorScheme.error),
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: controller.addressBusy ? null : _save,
                        child: Text(controller.addressBusy ? 'Dang luu...' : 'Luu dia chi'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
