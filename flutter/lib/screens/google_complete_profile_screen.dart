import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/services/api_service.dart';

class GoogleCompleteProfileScreen extends StatefulWidget {
  const GoogleCompleteProfileScreen({
    super.key,
    required this.initialFullName,
    required this.email,
  });

  final String initialFullName;
  final String email;

  @override
  State<GoogleCompleteProfileScreen> createState() => _GoogleCompleteProfileScreenState();
}

class _GoogleCompleteProfileScreenState extends State<GoogleCompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullNameController;
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController(text: widget.initialFullName);
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final controller = AppScope.of(context);
    setState(() => _error = null);

    try {
      final result = await controller.completeGoogleProfile(
        fullName: _fullNameController.text.trim(),
        password: _passwordController.text,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message)),
      );
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Khong the cap nhat ho so Google luc nay.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Bo sung ho so Google')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Tai khoan Google da dang nhap. Them ten va mat khau de ho so hoan chinh ngay trong app.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      initialValue: widget.email,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Email Google',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _fullNameController,
                      decoration: const InputDecoration(labelText: 'Ho va ten'),
                      validator: (value) {
                        if ((value ?? '').trim().length < 2) {
                          return 'Nhap ho ten hop le';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Mat khau moi',
                      ),
                      validator: (value) {
                        if ((value ?? '').length < 6) {
                          return 'Nhap toi thieu 6 ky tu';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Nhap lai mat khau',
                      ),
                      validator: (value) {
                        if (value != _passwordController.text) {
                          return 'Mat khau nhap lai chua khop';
                        }
                        return null;
                      },
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error),
                      ),
                    ],
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: controller.authBusy ? null : _submit,
                      child: Text(
                        controller.authBusy ? 'Dang luu...' : 'Hoan tat ho so',
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
