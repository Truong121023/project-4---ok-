import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/services/api_service.dart';
import '../core/utils/formatters.dart';

class VerifyOtpScreen extends StatefulWidget {
  const VerifyOtpScreen({
    super.key,
    required this.email,
    required this.password,
    this.expiresAt,
  });

  final String email;
  final String password;
  final DateTime? expiresAt;

  @override
  State<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends State<VerifyOtpScreen> {
  final _otpController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final controller = AppScope.of(context);
    setState(() => _error = null);
    try {
      await controller.verifyOtp(
        email: widget.email,
        otp: _otpController.text.trim(),
      );
      await controller.login(
        email: widget.email,
        password: widget.password,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('OTP verified successfully and you are now signed in.')),
      );
      Navigator.of(context).popUntil((route) => route.isFirst);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'OTP verification was not successful.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'OTP sent to ${widget.email}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  if (widget.expiresAt != null) ...[
                    const SizedBox(height: 8),
                    Text('Expires at: ${Formatters.fullDateTime(widget.expiresAt)}'),
                  ],
                  const SizedBox(height: 16),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Enter OTP'),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: controller.authBusy ? null : _submit,
                      child: Text(controller.authBusy ? 'Processing...' : 'Verify and sign in'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
