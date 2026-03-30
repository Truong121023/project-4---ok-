import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/services/api_service.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'address_book_screen.dart';
import 'checkout_result_screen.dart';
import 'login_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _promotionController = TextEditingController();
  String _deliveryType = 'IMMEDIATE';
  DateTime? _scheduledAt;
  DeliveryAddress? _selectedAddress;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final controller = AppScope.of(context);
        await controller.loadDeliveryAddresses();
        if (!mounted) {
          return;
        }
        setState(() {
          _selectedAddress = controller.primaryDeliveryAddress;
        });
      } catch (error) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    });
  }

  @override
  void dispose() {
    _promotionController.dispose();
    super.dispose();
  }

  Future<void> _pickScheduledTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      initialDate: now.add(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 30)),
    );
    if (date == null || !mounted) {
      return;
    }
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (time == null) {
      return;
    }
    setState(() {
      _scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _chooseAddress() async {
    final result = await Navigator.of(context).push<DeliveryAddress>(
      MaterialPageRoute<DeliveryAddress>(
        builder: (_) => const AddressBookScreen(selectionMode: true),
      ),
    );
    if (result != null && mounted) {
      setState(() => _selectedAddress = result);
    }
  }

  Future<void> _checkout() async {
    final controller = AppScope.of(context);
    if (_selectedAddress == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hay chon dia chi giao hang truoc.')),
      );
      return;
    }
    if (_deliveryType == 'SCHEDULED' && _scheduledAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hay chon thoi gian giao hang.')),
      );
      return;
    }
    try {
      final result = await controller.checkout(
        deliveryAddressId: _selectedAddress!.id,
        promotionCode: _promotionController.text.trim(),
        deliveryType: _deliveryType,
        scheduledDeliveryAt: _scheduledAt,
      );
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CheckoutResultScreen(result: result),
        ),
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        if (!controller.isLoggedIn) {
          return Scaffold(
            appBar: AppBar(title: const Text('Checkout')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EmptyStateCard(
                  title: 'Can dang nhap truoc khi checkout',
                  message: 'Checkout that se goi /api/user/cart/checkout voi dia chi da chon.',
                  actionLabel: 'Dang nhap',
                  onAction: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const LoginScreen(),
                      ),
                    );
                  },
                ),
              ),
            ),
          );
        }

        final selectedAddress = _selectedAddress ?? controller.primaryDeliveryAddress;
        return Scaffold(
          appBar: AppBar(title: const Text('Checkout')),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(
                        title: 'Dia chi giao hang',
                        subtitle: 'Chon dia chi se duoc gui vao deliveryAddressId.',
                      ),
                      const SizedBox(height: 12),
                      if (selectedAddress == null)
                        const Text('Chua co dia chi nao.')
                      else
                        Text(
                          '${selectedAddress.fullName} - ${selectedAddress.phoneNumber}\n${selectedAddress.deliveryAddress}',
                        ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilledButton.tonal(
                            onPressed: _chooseAddress,
                            child: const Text('Chon dia chi'),
                          ),
                          FilledButton.tonal(
                            onPressed: () async {
                              await Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => const AddressBookScreen(),
                                ),
                              );
                              if (!context.mounted) {
                                return;
                              }
                              try {
                                await controller.loadDeliveryAddresses();
                                setState(() {
                                  _selectedAddress = controller.primaryDeliveryAddress;
                                });
                              } catch (error) {
                                if (!context.mounted) {
                                  return;
                                }
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(error.toString())),
                                );
                              }
                            },
                            child: const Text('Quan ly dia chi'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(
                        title: 'Cach giao',
                        subtitle: 'Map vao deliveryType va scheduledDeliveryAt.',
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ChoiceChip(
                            label: const Text('Ngay'),
                            selected: _deliveryType == 'IMMEDIATE',
                            onSelected: (_) => setState(() {
                              _deliveryType = 'IMMEDIATE';
                              _scheduledAt = null;
                            }),
                          ),
                          ChoiceChip(
                            label: const Text('Hen gio'),
                            selected: _deliveryType == 'SCHEDULED',
                            onSelected: (_) => setState(() => _deliveryType = 'SCHEDULED'),
                          ),
                        ],
                      ),
                      if (_deliveryType == 'SCHEDULED') ...[
                        const SizedBox(height: 12),
                        FilledButton.tonal(
                          onPressed: _pickScheduledTime,
                          child: Text(
                            _scheduledAt == null
                                ? 'Chon ngay gio'
                                : Formatters.fullDateTime(_scheduledAt),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      TextField(
                        controller: _promotionController,
                        decoration: const InputDecoration(
                          labelText: 'Ma giam gia (neu co)',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tong tam tinh: ${Formatters.currency(controller.cart.subtotal)}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text('Return URL: ${controller.config.defaultReturnUrl}'),
                      const SizedBox(height: 4),
                      Text('Cancel URL: ${controller.config.defaultCancelUrl}'),
                    ],
                  ),
                ),
              ),
            ],
          ),
          bottomNavigationBar: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: ElevatedButton(
                onPressed: controller.checkoutBusy || controller.cart.items.isEmpty ? null : _checkout,
                child: Text(controller.checkoutBusy ? 'Dang tao checkout...' : 'Tao checkout that'),
              ),
            ),
          ),
        );
      },
    );
  }
}
