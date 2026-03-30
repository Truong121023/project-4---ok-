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
          appBar: AppBar(title: const Text('Dia chi giao hang')),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: controller.isLoggedIn ? () => _openEditor() : null,
            label: const Text('Them dia chi'),
            icon: const Icon(Icons.add_location_alt_outlined),
          ),
          body: RefreshIndicator(
            onRefresh: controller.loadDeliveryAddresses,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                if (!controller.isLoggedIn)
                  const EmptyStateCard(
                    title: 'Can dang nhap',
                    message: 'Dia chi giao hang la du lieu can tai khoan nguoi dung.',
                  )
                else if (controller.addressBusy && controller.deliveryAddresses.isEmpty)
                  const Center(child: Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: CircularProgressIndicator(),
                  ))
                else if (controller.deliveryAddresses.isEmpty)
                  const EmptyStateCard(
                    title: 'Chua co dia chi',
                    message: 'Them dia chi dau tien de bat dau checkout that.',
                  )
                else
                  ...controller.deliveryAddresses.map(
                    (address) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: widget.selectionMode ? () => Navigator.of(context).pop(address) : null,
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
                                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                              fontWeight: FontWeight.w800,
                                            ),
                                      ),
                                    ),
                                    if (address.primary) const MetricChip(label: 'Mac dinh'),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text('${address.phoneNumber}\n${address.deliveryAddress}'),
                                const SizedBox(height: 10),
                                Text(
                                  address.verified
                                      ? 'Da xac thuc - ${Formatters.shortDate(address.verifiedAt)}'
                                      : 'Chua xac thuc',
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
                                            await controller.makeDeliveryAddressPrimary(address.id);
                                          } on ApiException catch (error) {
                                            if (!context.mounted) {
                                              return;
                                            }
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(content: Text(error.message)),
                                            );
                                          }
                                        },
                                        child: const Text('Dat mac dinh'),
                                      ),
                                    FilledButton.tonal(
                                      onPressed: () => _openEditor(address),
                                      child: const Text('Sua'),
                                    ),
                                    FilledButton.tonal(
                                      onPressed: () => _delete(address),
                                      child: const Text('Xoa'),
                                    ),
                                    if (widget.selectionMode)
                                      FilledButton(
                                        onPressed: () => Navigator.of(context).pop(address),
                                        child: const Text('Chon'),
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
