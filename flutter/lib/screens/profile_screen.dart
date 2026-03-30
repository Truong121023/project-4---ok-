import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'address_book_screen.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final session = controller.session;
        return Scaffold(
          appBar: AppBar(title: const Text('Profile')),
          body: RefreshIndicator(
            onRefresh: () async {
              try {
                await controller.refreshOrders();
                await controller.loadDeliveryAddresses();
              } catch (_) {
                // Keep the current UI state and allow manual retry from the next pull.
              }
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                if (session == null)
                  EmptyStateCard(
                    title: 'Dang duyet voi guest mode',
                    message:
                        'Dang nhap de dong bo session, xem don hang, quan ly dia chi va checkout that voi backend.',
                    actionLabel: 'Dang nhap',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const LoginScreen(),
                        ),
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
                              MetricChip(label: session.user.role),
                              MetricChip(label: session.user.verified ? 'Verified' : 'Cho verify'),
                              MetricChip(label: controller.config.useMockData ? 'Mock session' : 'Live session'),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => const AddressBookScreen(),
                                    ),
                                  );
                                },
                                child: const Text('Dia chi giao hang'),
                              ),
                              OutlinedButton(
                                onPressed: () => controller.logout(),
                                child: const Text('Dang xuat'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const SectionHeader(
                    title: 'Don hang cua ban',
                    subtitle: 'Du lieu map tu /api/user/orders trong live mode.',
                  ),
                  const SizedBox(height: 12),
                  if (controller.orders.isEmpty)
                    const EmptyStateCard(
                      title: 'Chua co don hang',
                      message: 'Sau khi checkout that, danh sach don hang se xuat hien o day.',
                    )
                  else
                    ...controller.orders.map(
                      (order) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Card(
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            title: Text(
                              '#${order.id} - ${order.storeName}',
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            subtitle: Text(
                              '${order.statusSummary}\n${Formatters.currency(order.totalAmount)} - ${order.paymentStatus}',
                            ),
                            isThreeLine: true,
                          ),
                        ),
                      ),
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
