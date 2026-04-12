import 'package:flutter/material.dart';

import '../app/app.dart';
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
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      controller.loadUserNotificationUnreadCount();
      if (controller.favoriteItems.isEmpty) {
        controller.loadFavorites();
      }
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
          appBar: AppBar(title: const Text('Tai khoan')),
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
                        'Dang nhap de luu favorites, theo doi don hang, nhan notifications va mo support chat.',
                    actionLabel: 'Dang nhap',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                      );
                    },
                  )
                else ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.user.fullName,
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 8),
                          Text(session.user.email),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              MetricChip(label: session.user.verified ? 'Verified' : 'Cho verify'),
                              MetricChip(label: '${controller.orders.length} don'),
                              MetricChip(label: '${controller.cart.totalItems} sp trong cart'),
                              MetricChip(label: '${session.user.creditPoints} credit'),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: controller.logout,
                                  child: const Text('Dang xuat'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const SectionHeader(
                    title: 'Cong cu tai khoan',
                    subtitle: 'Tap trung cac muc user can dung sau khi mua hang.',
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.location_on_outlined,
                    title: 'Dia chi giao hang',
                    subtitle: 'Them, sua va doi dia chi mac dinh de checkout nhanh hon.',
                    badgeLabel: controller.deliveryAddresses.isEmpty ? null : '${controller.deliveryAddresses.length}',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const AddressBookScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.favorite_border,
                    title: 'Yeu thich',
                    subtitle: 'Quan ly store, dish va event da save de quay lai nhanh.',
                    badgeLabel: controller.favoriteItems.isEmpty ? null : '${controller.favoriteItems.length}',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const FavoritesScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.rate_review_outlined,
                    title: 'Review cua toi',
                    subtitle: 'Xem, sua va xoa cac review ban da gui.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const ReviewsScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.feedback_outlined,
                    title: 'Feedback',
                    subtitle: 'Gui phan hoi ve store, delivery, app va theo doi phan hoi tu team.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const FeedbacksScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.notifications_none,
                    title: 'Notifications',
                    subtitle: 'Nhan cap nhat don hang, event va news theo tai khoan cua ban.',
                    badgeLabel: controller.userNotificationUnreadCount == 0
                        ? null
                        : '${controller.userNotificationUnreadCount}',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.workspace_premium_outlined,
                    title: 'Loyalty levels',
                    subtitle: 'Xem muc level hien tai theo tung store de biet quyen dung voucher va nguong chi tieu.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const LoyaltyLevelsScreen()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  ActionMenuCard(
                    icon: Icons.support_agent_outlined,
                    title: 'Support chat',
                    subtitle: 'Mo phien ho tro theo store khi can team ho tro don hang hoac app.',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const SupportChatScreen()),
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
