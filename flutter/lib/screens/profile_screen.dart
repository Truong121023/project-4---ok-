import 'package:flutter/material.dart';

import '../app/app.dart';
import '../app/app_controller.dart';
import '../widgets/app_widgets.dart';
import 'address_book_screen.dart';
import 'favorites_screen.dart';
import 'feedbacks_screen.dart';
import 'login_screen.dart';
import 'loyalty_levels_screen.dart';
import 'notifications_screen.dart';
import 'reviews_screen.dart';
import 'support_chat_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<void>? _overviewFuture;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _overviewFuture ??= _warmProfileOverview(controller);
    } else {
      _overviewFuture = null;
    }
  }

  Future<void> _warmProfileOverview(AppController controller) async {
    await _ignorePreloadError(controller.refreshOrders());
    await _ignorePreloadError(controller.loadDeliveryAddresses());
    await _ignorePreloadError(controller.loadFavorites());
    await _ignorePreloadError(controller.loadUserNotificationUnreadCount());
  }

  Future<void> _ignorePreloadError(Future<dynamic> future) async {
    try {
      await future;
    } catch (_) {
      // Keep the account tab usable even if one preload request fails.
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final session = controller.session;
        return Scaffold(
          appBar: AppBar(title: const Text('Account')),
          body: RefreshIndicator(
            onRefresh: () async {
              if (session == null) {
                return;
              }
              await controller.refreshCurrentUser();
              await controller.refreshOrders();
              await controller.loadDeliveryAddresses();
              await controller.loadFavorites();
              await controller.loadUserNotificationUnreadCount();
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                if (session == null)
                  EmptyStateCard(
                    title: 'Guest mode',
                    message:
                        'Sign in to save favorites, track orders, receive notifications, and open support chat.',
                    actionLabel: 'Sign in',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const LoginScreen()),
                      );
                    },
                  )
                else ...[
                  _ProfileHeroCard(
                    fullName: session.user.fullName,
                    email: session.user.email,
                    verified: session.user.verified,
                    orderCount: controller.orders.length,
                    cartItems: controller.cart.totalItems,
                    creditPoints: session.user.creditPoints,
                    onLogout: controller.logout,
                  ),
                  const SizedBox(height: 24),
                  const SectionHeader(
                    title: 'Ordering',
                    subtitle:
                        'The sections you use most while ordering, tracking orders, and coming back quickly.',
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.location_on_outlined,
                    title: 'Delivery addresses',
                    subtitle:
                        'Add, edit, and change the default address for faster checkout.',
                    badgeLabel: controller.deliveryAddresses.isEmpty
                        ? null
                        : '${controller.deliveryAddresses.length}',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const AddressBookScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.favorite_border,
                    title: 'Favorites',
                    subtitle:
                        'Manage saved stores, dishes, and events so you can return quickly.',
                    badgeLabel: controller.favoriteItems.isEmpty
                        ? null
                        : '${controller.favoriteItems.length}',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const FavoritesScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.rate_review_outlined,
                    title: 'My reviews',
                    subtitle: 'View, edit, and delete the reviews you have submitted.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const ReviewsScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.feedback_outlined,
                    title: 'Feedback',
                    subtitle:
                        'Send feedback about stores, delivery, or the app and follow the team response.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const FeedbacksScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.notifications_none,
                    title: 'Notifications',
                    subtitle:
                        'Receive order, event, and news updates for your account.',
                    badgeLabel: controller.userNotificationUnreadCount == 0
                        ? null
                        : '${controller.userNotificationUnreadCount}',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const NotificationsScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  const SectionHeader(
                    title: 'Support and rewards',
                    subtitle:
                        'Keep in touch with the brand and track your account benefits here.',
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.workspace_premium_outlined,
                    title: 'Membership and credits',
                    subtitle:
                        'View voucher credits and membership progress for your account.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const LoyaltyLevelsScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.support_agent_outlined,
                    title: 'Support chat',
                    subtitle:
                        'Open a store-specific support session when you need help with an order or the app.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const SupportChatScreen()),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ProfileHeroCard extends StatelessWidget {
  const _ProfileHeroCard({
    required this.fullName,
    required this.email,
    required this.verified,
    required this.orderCount,
    required this.cartItems,
    required this.creditPoints,
    required this.onLogout,
  });

  final String fullName;
  final String email;
  final bool verified;
  final int orderCount;
  final int cartItems;
  final int creditPoints;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF17332A), Color(0xFF365B49)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricChip(
                  label: verified ? 'Verified' : 'Pending verification',
                  backgroundColor: Colors.white.withValues(alpha: 0.14),
                  foregroundColor: Colors.white,
                ),
                MetricChip(
                  label: '$creditPoints credits',
                  backgroundColor: Colors.white.withValues(alpha: 0.14),
                  foregroundColor: Colors.white,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              fullName,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              email,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _ProfileStatTile(
                    label: 'Orders',
                    value: '$orderCount',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ProfileStatTile(
                    label: 'In cart',
                    value: '$cartItems',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onLogout,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: BorderSide(
                    color: Colors.white.withValues(alpha: 0.22),
                  ),
                ),
                child: const Text('Sign out'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileStatTile extends StatelessWidget {
  const _ProfileStatTile({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.84),
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
