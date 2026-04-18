import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'address_book_screen.dart';
import 'checkout_screen.dart';
import 'login_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final cart = controller.cart;
        final isGuestCart = !controller.config.useMockData && controller.isGuestCartActive;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Cart'),
            actions: [
              if (cart.items.isNotEmpty)
                TextButton(
                  onPressed: controller.cartBusy ? null : () => controller.clearCart(),
                  child: const Text('Clear'),
                ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 140),
            children: [
              if (isGuestCart) ...[
                EmptyStateCard(
                  title: 'You are using a temporary cart',
                  message:
                      'You can still add items before signing in. Sign in to sync the cart and continue to checkout.',
                  actionLabel: 'Sign in',
                  onAction: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const LoginScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),
              ],
              if (controller.isLoggedIn && controller.primaryDeliveryAddress != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Card(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(24),
                      onTap: () async {
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
                        } catch (_) {
                          // Keep cart usable even if address refresh fails here.
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Default address',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${controller.primaryDeliveryAddress!.fullName} - ${controller.primaryDeliveryAddress!.phoneNumber}',
                            ),
                            const SizedBox(height: 4),
                            Text(
                              controller.primaryDeliveryAddress!
                                  .deliveryAddress,
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Tap to open saved addresses and change the default one',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: const Color(0xFF6E6259),
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              if (cart.items.isEmpty)
                const EmptyStateCard(
                  title: 'Your cart is empty',
                  message: 'Add items from Home, Store, or Dish pages to get started.',
                )
              else
                ...cart.items.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.dishName,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 6),
                            Text(item.storeName),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                IconButton(
                                  onPressed: controller.cartBusy
                                      ? null
                                      : () => controller.updateCartItemQuantity(item, item.quantity - 1),
                                  icon: const Icon(Icons.remove_circle_outline),
                                ),
                                Text(
                                  '${item.quantity}',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                                ),
                                IconButton(
                                  onPressed: controller.cartBusy
                                      ? null
                                      : () => controller.updateCartItemQuantity(item, item.quantity + 1),
                                  icon: const Icon(Icons.add_circle_outline),
                                ),
                                const Spacer(),
                                Text(
                                  Formatters.currency(item.totalPrice),
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          bottomNavigationBar: SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFE4DFD4)),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Subtotal',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      Text(
                        Formatters.currency(cart.subtotal),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (isGuestCart && cart.items.isNotEmpty) ...[
                    Text(
                      'Sign in to sync your cart and choose a delivery address.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF6E6259),
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: cart.items.isEmpty
                          ? null
                          : () {
                              if (!controller.isLoggedIn) {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => const LoginScreen(),
                                  ),
                                );
                                return;
                              }
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => const CheckoutScreen(),
                                ),
                              );
                            },
                      child: Text(
                        isGuestCart ? 'Sign in to checkout' : 'Choose an address and checkout',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
