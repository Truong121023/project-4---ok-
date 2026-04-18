import 'dart:async';

import 'package:flutter/material.dart';

import '../app/app.dart';
import '../app/app_controller.dart';
import '../core/models/models.dart';
import '../core/services/api_service.dart';
import '../core/utils/formatters.dart';
import '../core/utils/shipping_fee_estimator.dart';
import '../widgets/app_widgets.dart';
import 'address_book_screen.dart';
import 'address_editor_screen.dart';
import 'checkout_result_screen.dart';
import 'login_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({
    super.key,
    this.initialPromotionCode = '',
  });

  final String initialPromotionCode;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
<<<<<<< HEAD
  late final TextEditingController _promotionController;
=======
  final _promotionController = TextEditingController();
>>>>>>> origin/main
  String _deliveryType = 'DELIVERY';
  DateTime? _scheduledAt;
  DeliveryAddress? _selectedAddress;
  bool _resolvingAddressCoordinates = false;
  Timer? _previewDebounce;
  int _previewRequestSerial = 0;
  int _promotionRequestSerial = 0;
  CheckoutPreview? _checkoutPreview;
  String? _checkoutPreviewError;
  bool _checkoutPreviewLoading = false;
  List<CheckoutPromotionSuggestion> _eligiblePromotions = const [];
  String? _eligiblePromotionsError;
  bool _eligiblePromotionsLoading = false;
  bool _checkoutSubmitting = false;

  @override
  void initState() {
    super.initState();
    _promotionController = TextEditingController(
      text: widget.initialPromotionCode.trim(),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final controller = AppScope.of(context);
        await controller.loadDeliveryAddresses();
        if (!mounted) {
          return;
        }
        _syncSelectedAddress(controller);
        unawaited(_refreshEligiblePromotions());
        _scheduleCheckoutPreviewRefresh(immediate: true);
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
    _previewDebounce?.cancel();
    _promotionController.dispose();
    super.dispose();
  }

  DeliveryAddress? _selectedCheckoutAddress(AppController controller) =>
      _selectedAddress ?? controller.primaryDeliveryAddress;

  bool _canLoadCheckoutInsights(
    AppController controller,
    DeliveryAddress? selectedAddress,
  ) {
    if (!controller.isLoggedIn ||
        controller.cart.items.isEmpty ||
        selectedAddress == null ||
        !selectedAddress.hasCoordinates) {
      return false;
    }
    if (_deliveryType == 'SCHEDULED' && _scheduledAt == null) {
      return false;
    }
    return true;
  }

  void _clearCheckoutPreview() {
    if (_checkoutPreview == null &&
        _checkoutPreviewError == null &&
        !_checkoutPreviewLoading) {
      return;
    }
    setState(() {
      _checkoutPreview = null;
      _checkoutPreviewError = null;
      _checkoutPreviewLoading = false;
    });
  }

  void _clearEligiblePromotions() {
    if (_eligiblePromotions.isEmpty &&
        _eligiblePromotionsError == null &&
        !_eligiblePromotionsLoading) {
      return;
    }
    setState(() {
      _eligiblePromotions = const [];
      _eligiblePromotionsError = null;
      _eligiblePromotionsLoading = false;
    });
  }

  void _scheduleCheckoutPreviewRefresh({bool immediate = false}) {
    _previewDebounce?.cancel();
    if (immediate) {
      unawaited(_refreshCheckoutPreview());
      return;
    }
    _previewDebounce = Timer(
      const Duration(milliseconds: 350),
      () => unawaited(_refreshCheckoutPreview()),
    );
  }

  Future<void> _refreshCheckoutPreview() async {
    if (!mounted) {
      return;
    }
    final controller = AppScope.of(context);
    final selectedAddress = _selectedCheckoutAddress(controller);
    if (!_canLoadCheckoutInsights(controller, selectedAddress)) {
      _clearCheckoutPreview();
      return;
    }
    final requestSerial = ++_previewRequestSerial;
    setState(() {
      _checkoutPreviewLoading = true;
      _checkoutPreviewError = null;
    });
    try {
      final preview = await controller.previewCheckout(
        deliveryAddressId: selectedAddress!.id,
        promotionCode: _promotionController.text.trim(),
        deliveryType: _deliveryType,
        scheduledDeliveryAt: _scheduledAt,
      );
      if (!mounted || requestSerial != _previewRequestSerial) {
        return;
      }
      setState(() {
        _checkoutPreview = preview;
        _checkoutPreviewError = null;
        _checkoutPreviewLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted || requestSerial != _previewRequestSerial) {
        return;
      }
      setState(() {
        _checkoutPreview = null;
        _checkoutPreviewError = error.message;
        _checkoutPreviewLoading = false;
      });
    } catch (error) {
      if (!mounted || requestSerial != _previewRequestSerial) {
        return;
      }
      setState(() {
        _checkoutPreview = null;
        _checkoutPreviewError = '$error';
        _checkoutPreviewLoading = false;
      });
    }
  }

  Future<void> _refreshEligiblePromotions() async {
    if (!mounted) {
      return;
    }
    final controller = AppScope.of(context);
    final selectedAddress = _selectedCheckoutAddress(controller);
    if (!_canLoadCheckoutInsights(controller, selectedAddress)) {
      _clearEligiblePromotions();
      return;
    }
    final requestSerial = ++_promotionRequestSerial;
    setState(() {
      _eligiblePromotionsLoading = true;
      _eligiblePromotionsError = null;
    });
    try {
      final items = await controller.loadEligibleCheckoutPromotions(
        deliveryAddressId: selectedAddress!.id,
        deliveryType: _deliveryType,
        scheduledDeliveryAt: _scheduledAt,
      );
      if (!mounted || requestSerial != _promotionRequestSerial) {
        return;
      }
      setState(() {
        _eligiblePromotions = items;
        _eligiblePromotionsError = null;
        _eligiblePromotionsLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted || requestSerial != _promotionRequestSerial) {
        return;
      }
      setState(() {
        _eligiblePromotions = const [];
        _eligiblePromotionsError = error.message;
        _eligiblePromotionsLoading = false;
      });
    } catch (error) {
      if (!mounted || requestSerial != _promotionRequestSerial) {
        return;
      }
      setState(() {
        _eligiblePromotions = const [];
        _eligiblePromotionsError = '$error';
        _eligiblePromotionsLoading = false;
      });
    }
  }

  void _applySuggestedPromotion(CheckoutPromotionSuggestion suggestion) {
    _promotionController
      ..text = suggestion.code
      ..selection = TextSelection.collapsed(offset: suggestion.code.length);
    _scheduleCheckoutPreviewRefresh(immediate: true);
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
      _scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
    unawaited(_refreshEligiblePromotions());
    _scheduleCheckoutPreviewRefresh(immediate: true);
  }

  Future<void> _openAddressBook() async {
    final controller = AppScope.of(context);
    final previousSelectedId =
        (_selectedAddress ?? controller.primaryDeliveryAddress)?.id;
    final result = await Navigator.of(context).push<DeliveryAddress>(
      MaterialPageRoute<DeliveryAddress>(
        builder: (_) => const AddressBookScreen(selectionMode: true),
      ),
    );
    if (!mounted) {
      return;
    }
    try {
      await controller.loadDeliveryAddresses();
      if (!mounted) {
        return;
      }
      _syncSelectedAddress(
        controller,
        preferredAddressId: result?.id ?? previousSelectedId,
      );
      unawaited(_refreshEligiblePromotions());
      _scheduleCheckoutPreviewRefresh(immediate: true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  DeliveryAddress? _findAddressById(AppController controller, int? addressId) {
    if (addressId == null) {
      return null;
    }
    for (final address in controller.deliveryAddresses) {
      if (address.id == addressId) {
        return address;
      }
    }
    return null;
  }

  void _syncSelectedAddress(
    AppController controller, {
    int? preferredAddressId,
  }) {
    final selectedId = preferredAddressId ?? _selectedAddress?.id;
    final matchingAddress = _findAddressById(controller, selectedId);
    setState(() {
      _selectedAddress = matchingAddress ?? controller.primaryDeliveryAddress;
    });
  }

  Future<void> _editSelectedAddress() async {
    final controller = AppScope.of(context);
    final selectedAddress =
        _selectedAddress ?? controller.primaryDeliveryAddress;
    if (selectedAddress == null) {
      return;
    }
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => AddressEditorScreen(address: selectedAddress),
      ),
    );
    if (changed != true || !mounted) {
      return;
    }
    try {
      await controller.loadDeliveryAddresses();
      if (!mounted) {
        return;
      }
      _syncSelectedAddress(controller, preferredAddressId: selectedAddress.id);
      unawaited(_refreshEligiblePromotions());
      _scheduleCheckoutPreviewRefresh(immediate: true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _resolveSelectedAddressCoordinates() async {
    final controller = AppScope.of(context);
    final selectedAddress =
        _selectedAddress ?? controller.primaryDeliveryAddress;
    if (selectedAddress == null ||
        selectedAddress.hasCoordinates ||
        _resolvingAddressCoordinates) {
      return;
    }
    setState(() => _resolvingAddressCoordinates = true);
    try {
      final updatedAddress =
          await controller.ensureDeliveryAddressCoordinates(selectedAddress.id);
      if (!mounted) {
        return;
      }
      _syncSelectedAddress(controller, preferredAddressId: updatedAddress.id);
      unawaited(_refreshEligiblePromotions());
      _scheduleCheckoutPreviewRefresh(immediate: true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Updated the delivery address coordinates.'),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) {
        setState(() => _resolvingAddressCoordinates = false);
      }
    }
  }

  Future<void> _checkout() async {
    if (_checkoutSubmitting) {
      return;
    }

    final controller = AppScope.of(context);
    final selectedAddress =
        _selectedAddress ?? controller.primaryDeliveryAddress;
    if (selectedAddress == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please choose a delivery address first.')),
      );
      return;
    }
    if (!selectedAddress.hasCoordinates) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'This address does not have coordinates yet. Fetch them automatically or edit the address before checkout.',
          ),
        ),
      );
      return;
    }
    if (_deliveryType == 'SCHEDULED' && _scheduledAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please choose a delivery time.')),
      );
      return;
    }

    setState(() => _checkoutSubmitting = true);

    try {
      final result = await controller.checkout(
        deliveryAddressId: selectedAddress.id,
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
      setState(() => _checkoutSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _checkoutSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  String _formatDiscount(double amount) {
    if (amount <= 0) {
      return Formatters.currency(0);
    }
    return '-${Formatters.currency(amount)}';
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
                  title: 'Sign in before paying',
                  message:
                      'Sign in to choose a delivery address, apply a discount code, and create a payment order.',
                  actionLabel: 'Sign in',
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

<<<<<<< HEAD
        final selectedAddress = _selectedCheckoutAddress(controller);
        final addressHasCoordinates = selectedAddress?.hasCoordinates ?? false;
=======
        final selectedAddress = _selectedAddress ?? controller.primaryDeliveryAddress;
>>>>>>> origin/main
        final shippingEstimate = estimateCartShipping(
          cart: controller.cart,
          address: selectedAddress,
          deliveryType: _deliveryType,
        );
<<<<<<< HEAD
        final checkoutPreview = _checkoutPreview;
        final previewShipping = checkoutPreview?.shippingFeeAmount ??
            (shippingEstimate.hasEstimate
                ? shippingEstimate.shippingFeeAmount
                : 0.0);
        final previewDiscount = checkoutPreview?.discountAmount ?? 0.0;
        final previewTotal = checkoutPreview?.totalAmount ??
            (controller.cart.subtotal + previewShipping - previewDiscount);
        final hasPromoInput = _promotionController.text.trim().isNotEmpty;
        final shippingPending =
            checkoutPreview == null && shippingEstimate.pendingMessage != null;
        final canCheckout = !controller.checkoutBusy &&
            controller.cart.items.isNotEmpty &&
            selectedAddress != null &&
            addressHasCoordinates &&
            (_deliveryType != 'SCHEDULED' || _scheduledAt != null);
        final footerNote = _checkoutPreviewError != null && hasPromoInput
            ? _checkoutPreviewError
            : checkoutPreview != null &&
                    (hasPromoInput || checkoutPreview.discountAmount > 0) &&
                    checkoutPreview.statusSummary.trim().isNotEmpty
                ? checkoutPreview.statusSummary
                : hasPromoInput
                    ? 'The final total will be updated from the backend preview.'
                    : null;

        if (_checkoutSubmitting) {
          return _CheckoutProcessingScaffold(
            addressLabel:
                selectedAddress == null
                    ? 'Selected address'
                    : '${selectedAddress.fullName} - ${selectedAddress.phoneNumber}',
            deliveryTypeLabel:
                _deliveryType == 'SCHEDULED' ? 'Scheduled delivery' : 'Delivery',
            totalAmount: previewTotal,
            promotionCode: _promotionController.text.trim(),
          );
        }

=======
>>>>>>> origin/main
        return Scaffold(
          appBar: AppBar(title: const Text('Checkout')),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 248),
            children: [
<<<<<<< HEAD
              Text(
                'Ready to pay',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'Choose an address, delivery mode, and review the shipping fee before creating the order.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 18),
              _CheckoutAddressCard(
                selectedAddress: selectedAddress,
                onOpenAddressBook: _openAddressBook,
                onEditSelectedAddress:
                    selectedAddress == null ? null : _editSelectedAddress,
                onResolveCoordinates: selectedAddress == null ||
                        addressHasCoordinates
                    ? null
                    : _resolveSelectedAddressCoordinates,
                resolvingCoordinates: _resolvingAddressCoordinates,
              ),
              const SizedBox(height: 16),
              _CheckoutDeliveryModeCard(
                deliveryType: _deliveryType,
                scheduledAt: _scheduledAt,
                onSelectDelivery: () {
                  setState(() {
                    _deliveryType = 'DELIVERY';
                    _scheduledAt = null;
                  });
                  unawaited(_refreshEligiblePromotions());
                  _scheduleCheckoutPreviewRefresh(immediate: true);
                },
                onSelectScheduled: () {
                  setState(() {
                    _deliveryType = 'SCHEDULED';
                  });
                  unawaited(_refreshEligiblePromotions());
                  _scheduleCheckoutPreviewRefresh(immediate: true);
                },
                onPickScheduledTime: _pickScheduledTime,
              ),
              const SizedBox(height: 16),
              _CheckoutShippingCard(
                shippingEstimate: shippingEstimate,
                checkoutPreview: checkoutPreview,
                previewLoading: _checkoutPreviewLoading,
                addressHasCoordinates: addressHasCoordinates,
              ),
              const SizedBox(height: 16),
              _CheckoutPromoCard(
                controller: _promotionController,
                hasPromoInput: hasPromoInput,
                previewLoading: _checkoutPreviewLoading,
                preview: checkoutPreview,
                previewError: _checkoutPreviewError,
                suggestions: _eligiblePromotions,
                suggestionsLoading: _eligiblePromotionsLoading,
                suggestionsError: _eligiblePromotionsError,
                onChanged: () {
                  setState(() {});
                  _scheduleCheckoutPreviewRefresh();
                },
                onApplySuggestion: _applySuggestedPromotion,
=======
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
                      if (selectedAddress != null) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            MetricChip(
                              label: selectedAddress.hasCoordinates
                                  ? 'Da co toa do'
                                  : 'Chua co toa do',
                            ),
                          ],
                        ),
                      ],
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
                            label: const Text('Giao ngay'),
                            selected: _deliveryType == 'DELIVERY',
                            onSelected: (_) => setState(() {
                              _deliveryType = 'DELIVERY';
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
                      const SizedBox(height: 12),
                      Text('Dang gui deliveryType: $_deliveryType (${deliveryTypeLabel(_deliveryType)})'),
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
                      const SizedBox(height: 12),
                      const Text(
                        'Promo hien uu tien validate o backend. Voucher chi ap dung cho 1 hoa don cua 1 store trong mot lan checkout va se bi reject neu bill co mon local/store specialty.',
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
                        title: 'Shipping fee',
                        subtitle: 'Frontend co the uoc tinh nhanh, nhung tong tien cuoi cung van theo response backend.',
                      ),
                      const SizedBox(height: 12),
                      if (!shippingEstimate.isDeliveryOrder)
                        const Text('Don pickup khong tinh shipping fee.')
                      else if (shippingEstimate.pendingMessage != null)
                        Text(shippingEstimate.pendingMessage!)
                      else ...[
                        Text(
                          'Estimated shipping fee: ${Formatters.currency(shippingEstimate.shippingFeeAmount)}',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Shipping distance: ${Formatters.distance(shippingEstimate.shippingDistanceKm)}',
                        ),
                        if (shippingEstimate.shippingFeeBreakdown.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          ...shippingEstimate.shippingFeeBreakdown.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                '${item.storeName}: ${Formatters.distance(item.distanceKm)} - ${Formatters.currency(item.shippingFeeAmount)}',
                              ),
                            ),
                          ),
                        ],
                      ],
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
                        'Tong tam tinh mon: ${Formatters.currency(controller.cart.subtotal)}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      if (shippingEstimate.pendingMessage == null) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Estimated shipping fee: ${Formatters.currency(shippingEstimate.shippingFeeAmount)}',
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Tam tinh truoc promo: ${Formatters.currency(controller.cart.subtotal + shippingEstimate.shippingFeeAmount)}',
                        ),
                      ],
                      if (controller.session != null) ...[
                        const SizedBox(height: 8),
                        Text('Credit hien tai: ${controller.session!.user.creditPoints}'),
                      ],
                      const SizedBox(height: 8),
                      const Text(
                        'Discount, shipping fee cuoi cung va totalAmount se duoc thay bang gia tri backend tra ve trong checkout response.',
                      ),
                      const SizedBox(height: 8),
                      Text('Return URL: ${controller.config.defaultReturnUrl}'),
                      const SizedBox(height: 4),
                      Text('Cancel URL: ${controller.config.defaultCancelUrl}'),
                    ],
                  ),
                ),
>>>>>>> origin/main
              ),
            ],
          ),
          bottomNavigationBar: _CheckoutStickySummaryBar(
            subtotalAmount: controller.cart.subtotal,
            shippingLabel: shippingPending
                ? 'Tinh sau'
                : Formatters.currency(previewShipping),
            discountLabel: _formatDiscount(previewDiscount),
            totalAmount: previewTotal,
            checkoutBusy: controller.checkoutBusy,
            canCheckout: canCheckout,
            hasPromoInput: hasPromoInput,
            footerNote: footerNote,
            footerNoteColor:
                _checkoutPreviewError != null ? const Color(0xFFB6543A) : null,
            onCheckout: _checkout,
          ),
        );
      },
    );
  }
}

class _CheckoutProcessingScaffold extends StatelessWidget {
  const _CheckoutProcessingScaffold({
    required this.addressLabel,
    required this.deliveryTypeLabel,
    required this.totalAmount,
    required this.promotionCode,
  });

  final String addressLabel;
  final String deliveryTypeLabel;
  final double totalAmount;
  final String promotionCode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    Widget infoTile({
      required String label,
      required String value,
      IconData? icon,
    }) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F2E8),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x1F2C3A2D)),
        ),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18, color: const Color(0xFF6A7B4F)),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    value,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: const Text('Creating payment request'),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFFCF7), Color(0xFFF3EADB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: const Color(0x1F2C3A2D)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x143B3126),
                    blurRadius: 32,
                    offset: Offset(0, 18),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: const BoxDecoration(
                          color: Color(0xFFE8F0DA),
                          shape: BoxShape.circle,
                        ),
                        child: const Padding(
                          padding: EdgeInsets.all(14),
                          child: CircularProgressIndicator(strokeWidth: 3),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Preparing the PayOS QR',
                              style: theme.textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Kamatcha is creating your order, requesting the payment link, and waiting for a confirmed QR before opening the result screen.',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  infoTile(
                    label: 'DELIVERY MODE',
                    value: deliveryTypeLabel,
                    icon: Icons.local_shipping_outlined,
                  ),
                  const SizedBox(height: 12),
                  infoTile(
                    label: 'DELIVERY ADDRESS',
                    value: addressLabel,
                    icon: Icons.location_on_outlined,
                  ),
                  const SizedBox(height: 12),
                  infoTile(
                    label: 'TOTAL PAYMENT',
                    value: Formatters.currency(totalAmount),
                    icon: Icons.receipt_long_outlined,
                  ),
                  if (promotionCode.trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    infoTile(
                      label: 'PROMOTION CODE',
                      value: promotionCode.trim(),
                      icon: Icons.local_offer_outlined,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 18),
            SoftInfoBanner(
              message:
                  'Please keep this screen open. If PayOS reports that a payment request already exists, the backend should retry automatically after the latest server update.',
              icon: Icons.info_outline,
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckoutAddressCard extends StatelessWidget {
  const _CheckoutAddressCard({
    required this.selectedAddress,
    required this.onOpenAddressBook,
    this.onEditSelectedAddress,
    this.onResolveCoordinates,
    this.resolvingCoordinates = false,
  });

  final DeliveryAddress? selectedAddress;
  final VoidCallback onOpenAddressBook;
  final VoidCallback? onEditSelectedAddress;
  final VoidCallback? onResolveCoordinates;
  final bool resolvingCoordinates;

  @override
  Widget build(BuildContext context) {
    final hasCoordinates = selectedAddress?.hasCoordinates ?? false;
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: SectionHeader(
                    title: 'Delivery address',
                    subtitle:
                        'Tap the address card to switch or manage your delivery addresses.',
                  ),
                ),
                if (selectedAddress != null)
                  MetricChip(
                label: hasCoordinates ? 'Coordinates ready' : 'Coordinates missing',
                    icon: hasCoordinates
                        ? Icons.check_circle_outline
                        : Icons.location_searching_outlined,
                    backgroundColor: hasCoordinates
                        ? const Color(0xFFE7F1E3)
                        : const Color(0xFFFFEED8),
                    foregroundColor: hasCoordinates
                        ? const Color(0xFF17332A)
                        : const Color(0xFF9A6B1F),
                    maxWidth: 160,
                  ),
              ],
            ),
            const SizedBox(height: 14),
            InkWell(
              borderRadius: BorderRadius.circular(22),
              onTap: onOpenAddressBook,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F3E9),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFE8DECE)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: selectedAddress == null
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'No delivery address selected',
                                    style:
                                        theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Tap here to choose your default address or manage your saved addresses.',
                                    style:
                                        theme.textTheme.bodyLarge?.copyWith(
                                      height: 1.4,
                                      color:
                                          theme.colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              )
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${selectedAddress!.fullName} - ${selectedAddress!.phoneNumber}',
                                    style:
                                        theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    selectedAddress!.deliveryAddress,
                                    style:
                                        theme.textTheme.bodyLarge?.copyWith(
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'Tap to switch addresses or update the default address',
                                    style:
                                        theme.textTheme.bodySmall?.copyWith(
                                      color:
                                          theme.colorScheme.onSurfaceVariant,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                      const SizedBox(width: 12),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (selectedAddress != null && !hasCoordinates) ...[
              const SizedBox(height: 16),
              const SoftInfoBanner(
                message:
                    'This address does not have coordinates yet, so the shipping fee will be finalized after the app resolves them. Tap "Fetch coordinates automatically" if the address is detailed enough, or edit it to add more information.',
                icon: Icons.location_searching_outlined,
                backgroundColor: Color(0xFFFFF4E5),
                foregroundColor: Color(0xFF9A6B1F),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  FilledButton.icon(
                    onPressed: resolvingCoordinates ? null : onResolveCoordinates,
                    icon: const Icon(Icons.my_location_outlined),
                    label: Text(
                      resolvingCoordinates
                          ? 'Fetching coordinates...'
                          : 'Fetch coordinates automatically',
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: onEditSelectedAddress,
                    icon: const Icon(Icons.edit_location_alt_outlined),
                    label: const Text('Edit address'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CheckoutDeliveryModeCard extends StatelessWidget {
  const _CheckoutDeliveryModeCard({
    required this.deliveryType,
    required this.scheduledAt,
    required this.onSelectDelivery,
    required this.onSelectScheduled,
    required this.onPickScheduledTime,
  });

  final String deliveryType;
  final DateTime? scheduledAt;
  final VoidCallback onSelectDelivery;
  final VoidCallback onSelectScheduled;
  final VoidCallback onPickScheduledTime;

  @override
  Widget build(BuildContext context) {
    final isScheduled = deliveryType == 'SCHEDULED';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Delivery mode',
              subtitle: 'Choose delivery now or schedule it later using the large cards.',
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _DeliveryModeOption(
                    title: 'Delivery now',
                    subtitle: 'Receive the order as soon as possible',
                    icon: Icons.flash_on_outlined,
                    selected: !isScheduled,
                    onTap: onSelectDelivery,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DeliveryModeOption(
                    title: 'Scheduled',
                    subtitle: 'Schedule delivery',
                    icon: Icons.schedule_outlined,
                    selected: isScheduled,
                    onTap: onSelectScheduled,
                  ),
                ),
              ],
            ),
            if (isScheduled) ...[
              const SizedBox(height: 16),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F6EA),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFDCE7D5)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      const Icon(Icons.event_available_outlined),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          scheduledAt == null
                              ? 'Choose the date and time when you want to receive the order.'
                              : Formatters.fullDateTime(scheduledAt),
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onPickScheduledTime,
                  icon: const Icon(Icons.schedule_outlined),
                  label: Text(
                    scheduledAt == null
                        ? 'Choose delivery date and time'
                        : 'Update scheduled delivery',
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CheckoutShippingCard extends StatelessWidget {
  const _CheckoutShippingCard({
    required this.shippingEstimate,
    required this.checkoutPreview,
    required this.previewLoading,
    required this.addressHasCoordinates,
  });

  final CartShippingEstimate shippingEstimate;
  final CheckoutPreview? checkoutPreview;
  final bool previewLoading;
  final bool addressHasCoordinates;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shippingFeeAmount =
        checkoutPreview?.shippingFeeAmount ?? shippingEstimate.shippingFeeAmount;
    final shippingDistanceKm =
        checkoutPreview?.shippingDistanceKm ?? shippingEstimate.shippingDistanceKm;
    final shippingFeeBreakdown =
        checkoutPreview?.shippingFeeBreakdown ?? shippingEstimate.shippingFeeBreakdown;
    final hasShippingSummary =
        checkoutPreview?.hasShippingSummary ?? shippingEstimate.hasEstimate;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: SectionHeader(
                    title: 'Shipping fee',
                    subtitle:
                        'Estimated from the current address and each store in the cart.',
                  ),
                ),
                if ((hasShippingSummary || previewLoading) &&
                    shippingEstimate.isDeliveryOrder)
                  const MetricChip(
                    label: 'Estimated',
                    icon: Icons.auto_awesome_outlined,
                    backgroundColor: Color(0xFFE7EFE1),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (!shippingEstimate.isDeliveryOrder)
              const SoftInfoBanner(
                message: 'Pickup orders do not have a shipping fee.',
                icon: Icons.storefront_outlined,
              )
            else if (previewLoading)
              const SoftInfoBanner(
                message: 'Syncing the shipping fee and breakdown from the backend...',
                icon: Icons.sync_outlined,
              )
            else if (checkoutPreview == null &&
                shippingEstimate.pendingMessage != null)
              SoftInfoBanner(
                message: shippingEstimate.pendingMessage!,
                icon: addressHasCoordinates
                    ? Icons.location_city_outlined
                    : Icons.pin_drop_outlined,
              )
            else if (!hasShippingSummary)
              const SoftInfoBanner(
                message:
                    'Shipping fee will be finalized after address coordinates are available.',
                icon: Icons.location_searching_outlined,
              )
            else ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      'Estimated shipping fee',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      Formatters.currency(shippingFeeAmount),
                      textAlign: TextAlign.end,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (shippingDistanceKm != null)
                SummaryLine(
                  label: 'Shipping distance',
                  value: Formatters.distance(shippingDistanceKm),
                ),
              if (shippingFeeBreakdown.isNotEmpty) ...[
                const SizedBox(height: 16),
                ShippingBreakdownList(
                  items: shippingFeeBreakdown,
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _CheckoutPromoCard extends StatelessWidget {
  const _CheckoutPromoCard({
    required this.controller,
    required this.hasPromoInput,
    required this.previewLoading,
    required this.preview,
    required this.previewError,
    required this.suggestions,
    required this.suggestionsLoading,
    required this.suggestionsError,
    required this.onChanged,
    required this.onApplySuggestion,
  });

  final TextEditingController controller;
  final bool hasPromoInput;
  final bool previewLoading;
  final CheckoutPreview? preview;
  final String? previewError;
  final List<CheckoutPromotionSuggestion> suggestions;
  final bool suggestionsLoading;
  final String? suggestionsError;
  final VoidCallback onChanged;
  final void Function(CheckoutPromotionSuggestion suggestion) onApplySuggestion;

  @override
  Widget build(BuildContext context) {
    final trimmedCode = controller.text.trim();
    final appliedPreview =
        preview != null && preview!.promotionCode.trim().isNotEmpty
            ? preview
            : null;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Promotions',
              subtitle:
                  'Enter a code or choose a voucher suggestion. Try KAMATCHASHIP for a delivery order. Some older codes need credit redemption or signature items.',
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              onChanged: (_) => onChanged(),
              decoration: const InputDecoration(
                hintText: 'Promo code...',
                prefixIcon: Icon(Icons.local_offer_outlined),
              ),
            ),
            const SizedBox(height: 12),
            const SoftInfoBanner(
              message:
                  'Tip: KAMATCHASHIP is ready to use on delivery orders. Some older vouchers only work after credit redemption or when signature items are in the cart.',
              icon: Icons.tips_and_updates_outlined,
            ),
            if (previewLoading && hasPromoInput) ...[
              const SizedBox(height: 12),
              const SoftInfoBanner(
                message: 'Checking the discount code with the backend...',
                icon: Icons.sync_outlined,
              ),
            ] else if (previewError != null && hasPromoInput) ...[
              const SizedBox(height: 12),
              SoftInfoBanner(
                message: previewError!,
                icon: Icons.warning_amber_outlined,
                backgroundColor: const Color(0xFFF7E7E1),
                foregroundColor: const Color(0xFFB6543A),
              ),
            ] else if (appliedPreview != null) ...[
              const SizedBox(height: 12),
              SoftInfoBanner(
                message:
                    'Applied ${appliedPreview.promotionCode} to this preview. Discount: ${Formatters.currency(appliedPreview.discountAmount)}.',
                icon: Icons.verified_outlined,
                backgroundColor: const Color(0xFFE7F1E3),
                foregroundColor: const Color(0xFF17332A),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Recommended vouchers',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                if (suggestionsLoading)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            if (suggestionsError != null && suggestions.isEmpty)
              SoftInfoBanner(
                message: suggestionsError!,
                icon: Icons.info_outline,
              )
            else if (suggestions.isEmpty && !suggestionsLoading)
              const SoftInfoBanner(
                message:
                    'No redeemed voucher matches the signature items in this cart yet. You can still enter a code if you redeemed one earlier.',
                icon: Icons.local_offer_outlined,
              )
            else ...[
              ...suggestions.take(4).map(
                    (suggestion) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _PromotionSuggestionTile(
                        suggestion: suggestion,
                        selected: trimmedCode.toUpperCase() ==
                            suggestion.code.trim().toUpperCase(),
                        onTap: () => onApplySuggestion(suggestion),
                      ),
                    ),
                  ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CheckoutStickySummaryBar extends StatelessWidget {
  const _CheckoutStickySummaryBar({
    required this.subtotalAmount,
    required this.shippingLabel,
    required this.discountLabel,
    required this.totalAmount,
    required this.checkoutBusy,
    required this.canCheckout,
    required this.hasPromoInput,
    this.footerNote,
    this.footerNoteColor,
    required this.onCheckout,
  });

  final double subtotalAmount;
  final String shippingLabel;
  final String discountLabel;
  final double totalAmount;
  final bool checkoutBusy;
  final bool canCheckout;
  final bool hasPromoInput;
  final String? footerNote;
  final Color? footerNoteColor;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xFFFFFCF7),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0xFFE8DDCC)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x16000000),
                blurRadius: 18,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Payment summary',
                  style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 10),
                SummaryLine(
                  label: 'Items subtotal',
                  value: Formatters.currency(subtotalAmount),
                  compact: true,
                ),
                const SizedBox(height: 8),
                SummaryLine(
                  label: 'Shipping fee',
                  value: shippingLabel,
                  compact: true,
                ),
                const SizedBox(height: 8),
                SummaryLine(
                  label: 'Discount',
                  value: discountLabel,
                  compact: true,
                  valueColor: const Color(0xFF5E7B62),
                ),
                const Divider(height: 18),
                SummaryLine(
                  label: 'Total payment',
                  value: Formatters.currency(totalAmount),
                  emphasize: true,
                  compact: true,
                ),
                if (footerNote != null && footerNote!.trim().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    footerNote!,
                    style: theme.textTheme.labelMedium?.copyWith(
                          color: footerNoteColor ??
                              theme.colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: canCheckout ? onCheckout : null,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      textStyle: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    child: Text(
                      checkoutBusy ? 'Creating order...' : 'Pay now',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PromotionSuggestionTile extends StatelessWidget {
  const _PromotionSuggestionTile({
    required this.suggestion,
    required this.selected,
    required this.onTap,
  });

  final CheckoutPromotionSuggestion suggestion;
  final bool selected;
  final VoidCallback onTap;

  String _discountLabel() {
    if (suggestion.isPercentageDiscount) {
      final value = suggestion.discountValue;
      final wholeNumber = value == value.roundToDouble();
      return wholeNumber
          ? '${value.toStringAsFixed(0)}%'
          : '${value.toStringAsFixed(1)}%';
    }
    return Formatters.currency(suggestion.discountValue);
  }

  String _summary() {
    final parts = <String>[];
    parts.add(_targetSummary());
    if (suggestion.eligibleAmount > 0) {
      parts.add('Eligible on ${Formatters.currency(suggestion.eligibleAmount)}');
    }
    if (suggestion.minOrderAmount != null && suggestion.minOrderAmount! > 0) {
      parts.add('Minimum order ${Formatters.currency(suggestion.minOrderAmount!)}');
    }
    return parts.join(' | ');
  }

  String _scopeLabel() {
    return switch (suggestion.scope.trim().toUpperCase()) {
      'DISH' => 'Signature items',
      _ => 'Signature item order',
    };
  }

  String _targetLabel() {
    return switch (suggestion.normalizedDiscountTarget) {
      'SHIPPING' => 'Shipping discount',
      'BOTH' => 'Item + shipping discount',
      _ => 'Signature item discount',
    };
  }

  String _targetSummary() {
    return switch (suggestion.normalizedDiscountTarget) {
      'SHIPPING' => 'Shipping fee for the signature-item order',
      'BOTH' => 'Signature items and shipping across the system',
      _ => 'Signature items across the system',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final summary = _summary();
    return DecoratedBox(
      decoration: BoxDecoration(
        color: selected ? const Color(0xFFE7F1E3) : const Color(0xFFF8F3E9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: selected ? const Color(0xFFC9DABF) : const Color(0xFFE8DECE),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          suggestion.code,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          suggestion.displayName,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  MetricChip(
                    label:
                        '-${Formatters.currency(suggestion.estimatedDiscountAmount)}',
                    backgroundColor:
                        selected ? const Color(0xFFD5E8CC) : const Color(0xFFE7EFE1),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(label: _discountLabel()),
                  MetricChip(label: _scopeLabel()),
                  MetricChip(label: _targetLabel()),
                  if (selected)
                    const MetricChip(
                      label: 'Selected',
                      backgroundColor: Color(0xFF17332A),
                      foregroundColor: Colors.white,
                    ),
                ],
              ),
              if (summary.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  summary,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              if (suggestion.description.trim().isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  suggestion.description,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.tonal(
                  onPressed: onTap,
                  child: Text(selected ? 'Applying' : 'Apply'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DeliveryModeOption extends StatelessWidget {
  const _DeliveryModeOption({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backgroundColor =
        selected ? const Color(0xFF17332A) : const Color(0xFFF8F3E9);
    final foregroundColor = selected ? Colors.white : const Color(0xFF17332A);

    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected ? const Color(0xFF17332A) : const Color(0xFFE6DCCD),
          ),
        ),
        child: Row(
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: selected
                    ? Colors.white.withValues(alpha: 0.14)
                    : const Color(0xFFE9F0E2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Icon(icon, color: foregroundColor, size: 20),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: foregroundColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: foregroundColor.withValues(
                        alpha: selected ? 0.82 : 0.72,
                      ),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              selected
                  ? Icons.check_circle
                  : Icons.radio_button_unchecked_outlined,
              color: foregroundColor,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
