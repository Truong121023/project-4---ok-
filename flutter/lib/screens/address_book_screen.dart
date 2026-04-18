import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/services/api_service.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'address_editor_screen.dart';

class AddressBookScreen extends StatefulWidget {
  const AddressBookScreen({
    super.key,
    this.selectionMode = false,
  });

  final bool selectionMode;

  @override
  State<AddressBookScreen> createState() => _AddressBookScreenState();
}

class _AddressBookScreenState extends State<AddressBookScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await AppScope.of(context).loadDeliveryAddresses();
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

  Future<void> _openEditor([DeliveryAddress? address]) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => AddressEditorScreen(address: address),
      ),
    );
    if (changed == true && mounted) {
      try {
        await AppScope.of(context).loadDeliveryAddresses();
      } catch (error) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
  }

  Future<void> _delete(DeliveryAddress address) async {
    final controller = AppScope.of(context);
    try {
      await controller.deleteDeliveryAddress(address.id);
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
        return Scaffold(
          appBar: AppBar(title: const Text('Delivery addresses')),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: controller.isLoggedIn ? () => _openEditor() : null,
            label: const Text('Add address'),
            icon: const Icon(Icons.add_location_alt_outlined),
          ),
          body: RefreshIndicator(
            onRefresh: controller.loadDeliveryAddresses,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                if (!controller.isLoggedIn)
                  const EmptyStateCard(
                    title: 'Sign in required',
                    message:
                        'Delivery addresses are tied to your account.',
                  )
                else if (controller.addressBusy &&
                    controller.deliveryAddresses.isEmpty)
                  const Center(
                      child: Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: CircularProgressIndicator(),
                  ))
                else if (controller.deliveryAddresses.isEmpty)
                  const EmptyStateCard(
                    title: 'No addresses yet',
                    message: 'Add your first address to start checkout faster.',
                  )
                else
                  ...controller.deliveryAddresses.map(
                    (address) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: widget.selectionMode
                              ? () => Navigator.of(context).pop(address)
                              : () => _openEditor(address),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        address.fullName,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.w800,
                                            ),
                                      ),
                                    ),
                                    if (address.primary)
                                      const MetricChip(label: 'Primary'),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                    '${address.phoneNumber}\n${address.deliveryAddress}'),
                                const SizedBox(height: 10),
                                Text(
                                  address.verified
                                      ? 'Verified on ${Formatters.shortDate(address.verifiedAt)}'
                                      : 'Not verified',
                                ),
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    MetricChip(
                                      label: address.hasCoordinates
                                          ? 'Coordinates available'
                                          : 'Coordinates missing',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    if (!address.primary)
                                      FilledButton.tonal(
                                        onPressed: () async {
                                          try {
                                            await controller
                                                .makeDeliveryAddressPrimary(
                                                    address.id);
                                          } on ApiException catch (error) {
                                            if (!context.mounted) {
                                              return;
                                            }
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              SnackBar(
                                                  content: Text(error.message)),
                                            );
                                          }
                                        },
                                        child: const Text('Set as default'),
                                      ),
                                    FilledButton.tonal(
                                      onPressed: () => _openEditor(address),
                                      child: const Text('Edit'),
                                    ),
                                    FilledButton.tonal(
                                      onPressed: () => _delete(address),
                                      child: const Text('Delete'),
                                    ),
                                    if (widget.selectionMode)
                                      FilledButton(
                                        onPressed: () =>
                                            Navigator.of(context).pop(address),
                                        child: const Text('Select'),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
