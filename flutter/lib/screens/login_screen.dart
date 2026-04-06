import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/services/api_service.dart';
import '../core/services/google_auth_service.dart';
import '../widgets/app_widgets.dart';
import 'google_complete_profile_screen.dart';
import 'password_reset_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final controller = AppScope.of(context);
    setState(() => _error = null);

    try {
      await controller.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Dang nhap chua thanh cong.');
    }
  }

  Future<void> _loginWithGoogle() async {
    final controller = AppScope.of(context);
    setState(() => _error = null);

    try {
      final idToken = await GoogleAuthService.instance.authenticateAndGetIdToken(
        controller.config,
      );
      final session = await controller.loginWithGoogle(idToken: idToken);
      if (!mounted) {
        return;
      }

      if (!session.user.profileCompleted) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => GoogleCompleteProfileScreen(
              initialFullName: session.user.fullName,
              email: session.user.email,
            ),
          ),
        );
      }

      if (!mounted) {
        return;
      }

      if (controller.session?.user.profileCompleted == false) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Da dang nhap voi Google. Ban co the bo sung ho so sau trong Profile.'),
          ),
        );
      }
      Navigator.of(context).pop();
    } on GoogleAuthFailure catch (error) {
      setState(() => _error = error.message);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Dang nhap Google chua thanh cong.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Dang nhap')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          EmptyStateCard(
            title: 'Trang thai ket noi',
            message: controller.config.useMockData
                ? 'Ban dang o che do demo. Tat USE_MOCK_DATA de dang nhap vao he thong that.'
                : 'App dang ket noi toi ${controller.config.normalizedBaseUrl}.',
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    OutlinedButton(
                      onPressed: controller.authBusy ? null : _loginWithGoogle,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _GoogleBadge(),
                          SizedBox(width: 12),
                          Text('Dang nhap nhanh voi Google'),
                        ],
                      ),
                    ),
                    if (!controller.config.useMockData && controller.config.googleServerClientId.trim().isEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        'Can them VITE_GOOGLE_CLIENT_ID trong .env hoac GOOGLE_SERVER_CLIENT_ID qua dart-define de lay Google idToken.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ] else if (!controller.config.useMockData) ...[
                      const SizedBox(height: 10),
                      Text(
                        'Neu mot Gmail dang nhap duoc nhung Gmail khac khong vao duoc, kiem tra OAuth consent screen co dang o Testing va bo sung cac tai khoan do vao Test users.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(child: Divider(color: Theme.of(context).dividerColor)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(
                            'hoac dang nhap bang email',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                        Expanded(child: Divider(color: Theme.of(context).dividerColor)),
                      ],
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email'),
                      validator: (value) {
                        final text = value?.trim() ?? '';
                        if (text.isEmpty || !text.contains('@')) {
                          return 'Nhap email hop le';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password'),
                      validator: (value) {
                        if ((value ?? '').length < 6) {
                          return 'Nhap toi thieu 6 ky tu';
                        }
                        return null;
                      },
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
                        onPressed: controller.authBusy ? null : _submit,
                        child: Text(controller.authBusy ? 'Dang xu ly...' : 'Dang nhap'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: controller.authBusy
                                ? null
                                : () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) => const RegisterScreen(),
                                      ),
                                    );
                                  },
                            child: const Text('Dang ky'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: controller.authBusy
                                ? null
                                : () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) => const PasswordResetScreen(),
                                      ),
                                    );
                                  },
                            child: const Text('Quen mat khau'),
                          ),
                        ),
                      ],
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

class _GoogleBadge extends StatelessWidget {
  const _GoogleBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      alignment: Alignment.center,
      child: Text(
        'G',
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: const Color(0xFFDB4437),
            ),
      ),
    );
  }
}
