import 'package:flutter/services.dart';
import 'package:flutter/material.dart';

import '../app/app.dart';
import '../app/app_controller.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';

class LoyaltyLevelsScreen extends StatefulWidget {
  const LoyaltyLevelsScreen({super.key});

  @override
  State<LoyaltyLevelsScreen> createState() => _LoyaltyLevelsScreenState();
}

class _LoyaltyLevelsScreenState extends State<LoyaltyLevelsScreen> {
  Future<_LoyaltyPageData>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= _loadPageData(controller);
    }
  }

  Future<_LoyaltyPageData> _loadPageData(AppController controller) async {
    final currentLevels = await controller.loadUserLevels();
    List<UserLevelDefinition> levelDefinitions;
    try {
      levelDefinitions = await controller.loadUserLevelDefinitions();
    } catch (_) {
      levelDefinitions = _fallbackDefinitionsFromCurrentLevels(currentLevels);
    }
    List<PromotionCard> vouchers;
    try {
      vouchers = await controller.loadUserVouchers();
    } catch (_) {
      vouchers = const [];
    }
    return _LoyaltyPageData(
      currentLevels: currentLevels,
      levelDefinitions: levelDefinitions,
      vouchers: vouchers
          .where(
            (promotion) =>
                promotion.requiresCreditRedemption ||
                promotion.hasAvailableRedemption,
          )
          .toList(),
    );
  }

  List<UserLevelDefinition> _fallbackDefinitionsFromCurrentLevels(
    List<UserLevel> currentLevels,
  ) {
    if (currentLevels.isEmpty) {
      return const [];
    }
    final currentLevel = currentLevels.first;
    final currentThreshold = currentLevel.resolvedLevelThreshold ?? 0;
    final definitions = <UserLevelDefinition>[
      UserLevelDefinition(
        id: currentLevel.levelId ?? 0,
        storeId: null,
        storeSlug: 'global',
        storeName: 'All stores',
        code: currentLevel.levelCode ?? 'CURRENT',
        name: currentLevel.levelDisplayName,
        minPaidAmount: currentThreshold,
        minCreditPoints: currentThreshold,
        minMembershipPoints: currentThreshold,
        active: true,
        createdAt: null,
        updatedAt: null,
      ),
    ];
    final nextThreshold = currentLevel.nextLevelMinMembershipPoints ??
        currentLevel.nextLevelMinCreditPoints;
    if (currentLevel.hasNextLevel && nextThreshold != null) {
      definitions.add(
        UserLevelDefinition(
          id: currentLevel.nextLevelId ?? -1,
          storeId: null,
          storeSlug: 'global',
          storeName: 'All stores',
          code: currentLevel.nextLevelCode ?? 'NEXT',
          name: currentLevel.nextLevelDisplayName,
          minPaidAmount: nextThreshold,
          minCreditPoints: nextThreshold,
          minMembershipPoints: nextThreshold,
          active: true,
          createdAt: null,
          updatedAt: null,
        ),
      );
    }
    return definitions;
  }

  Future<void> _refresh() async {
    final future = _loadPageData(AppScope.of(context));
    setState(() {
      _future = future;
    });
    await future;
  }

  Future<void> _copyVoucherCode(PromotionCard promotion) async {
    if (promotion.requiresCreditRedemption && !promotion.hasAvailableRedemption) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Redeem ${promotion.creditCost} credits before copying this code.'),
        ),
      );
      return;
    }
    await Clipboard.setData(ClipboardData(text: promotion.code));
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Copied code ${promotion.code}')),
    );
  }

  Future<void> _redeemVoucher(PromotionCard promotion) async {
    final controller = AppScope.of(context);
    try {
      final result = await controller.redeemVoucher(promotion.id);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${result.promotionCode} was redeemed successfully. ${result.remainingCreditPoints} credits remaining.',
          ),
        ),
      );
      await _refresh();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Membership and credits')),
      body: controller.isLoggedIn
          ? FutureBuilder<_LoyaltyPageData>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError || !snapshot.hasData) {
                  return Padding(
                    padding: const EdgeInsets.all(16),
                    child: ErrorStateCard(
                      message: snapshot.error.toString(),
                      onRetry: _refresh,
                    ),
                  );
                }

                final data = snapshot.data!;
                final currentLevel =
                    data.currentLevels.isEmpty ? null : data.currentLevels.first;
                final creditPoints =
                    currentLevel?.resolvedCreditPoints ??
                        controller.session?.user.creditPoints ??
                        0;
                final membershipPoints =
                    currentLevel?.resolvedMembershipPoints ??
                        controller.session?.user.membershipPoints ??
                        0;

                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    children: [
                      const SoftInfoBanner(
                        message:
                            'Credits and membership are separate systems. Every 1,000 VND paid adds 1 credit point and 1 membership point.',
                      ),
                      const SizedBox(height: 14),
                      _CreditBalanceCard(creditPoints: creditPoints),
                      const SizedBox(height: 12),
                      _VoucherCatalogCard(
                        creditPoints: creditPoints,
                        vouchers: data.vouchers,
                        onRedeem: _redeemVoucher,
                        onCopyCode: _copyVoucherCode,
                      ),
                      const SizedBox(height: 12),
                      _MembershipOverviewCard(
                        membershipPoints: membershipPoints,
                        currentLevel: currentLevel,
                      ),
                      const SizedBox(height: 18),
                      _AllLevelsCard(
                        membershipPoints: membershipPoints,
                        currentLevel: currentLevel,
                        levelDefinitions: data.levelDefinitions,
                      ),
                    ],
                  ),
                );
              },
            )
          : Padding(
              padding: const EdgeInsets.all(16),
              child: EmptyStateCard(
                title: 'Sign in required',
                message:
                    'Sign in to view voucher credits and your membership level.',
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
    );
  }
}

class _CreditBalanceCard extends StatelessWidget {
  const _CreditBalanceCard({required this.creditPoints});

  final int creditPoints;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              height: 52,
              width: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFE7F1E3),
                borderRadius: BorderRadius.circular(18),
              ),
              alignment: Alignment.center,
              child: const Icon(
                Icons.card_giftcard_outlined,
                color: Color(0xFF17332A),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Voucher credits',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$creditPoints credits',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF17332A),
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Credits are your balance for redeeming rewards and vouchers in the app.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                          height: 1.35,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VoucherCatalogCard extends StatelessWidget {
  const _VoucherCatalogCard({
    required this.creditPoints,
    required this.vouchers,
    required this.onRedeem,
    required this.onCopyCode,
  });

  final int creditPoints;
  final List<PromotionCard> vouchers;
  final Future<void> Function(PromotionCard promotion) onRedeem;
  final Future<void> Function(PromotionCard promotion) onCopyCode;

  @override
  Widget build(BuildContext context) {
    final sortedVouchers = [...vouchers]..sort((left, right) {
        final redeemedCompare = right.availableRedemptions.compareTo(
          left.availableRedemptions,
        );
        if (redeemedCompare != 0) {
          return redeemedCompare;
        }
        final creditCompare = left.creditCost.compareTo(right.creditCost);
        if (creditCompare != 0) {
          return creditCompare;
        }
        return left.name.toLowerCase().compareTo(right.name.toLowerCase());
      });

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Voucher redemption',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Use available credits to redeem vouchers first, then copy the code and apply it during checkout.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
            ),
            const SizedBox(height: 16),
            if (sortedVouchers.isEmpty)
              const EmptyStateCard(
                title: 'No redeemable vouchers yet',
                message:
                    'Redeemable vouchers will appear here when they become available.',
              )
            else
              ...List.generate(sortedVouchers.length, (index) {
                final voucher = sortedVouchers[index];
                return Padding(
                  padding: EdgeInsets.only(
                    bottom: index == sortedVouchers.length - 1 ? 0 : 12,
                  ),
                  child: _VoucherRedeemTile(
                    promotion: voucher,
                    creditPoints: creditPoints,
                    onRedeem: () {
                      onRedeem(voucher);
                    },
                    onCopyCode: () {
                      onCopyCode(voucher);
                    },
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _VoucherRedeemTile extends StatelessWidget {
  const _VoucherRedeemTile({
    required this.promotion,
    required this.creditPoints,
    required this.onRedeem,
    required this.onCopyCode,
  });

  final PromotionCard promotion;
  final int creditPoints;
  final VoidCallback onRedeem;
  final VoidCallback onCopyCode;

  String _discountLabel() {
    if (promotion.isPercentDiscount) {
      return '${promotion.discountValue.toStringAsFixed(0)}%';
    }
    return Formatters.currency(promotion.discountValue);
  }

  String _targetSummary() {
    return switch (promotion.normalizedDiscountTarget) {
      'SHIPPING' => 'Shipping fee for the signature-item order',
      'BOTH' => 'Signature items and shipping fee across all stores',
      _ => 'Signature items across all stores',
    };
  }

  @override
  Widget build(BuildContext context) {
    final redeemed = promotion.hasAvailableRedemption;
    final canRedeem =
        promotion.requiresCreditRedemption && creditPoints >= promotion.creditCost;
    final missingCredit = promotion.creditCost > creditPoints
        ? promotion.creditCost - creditPoints
        : 0;

    return Container(
      decoration: BoxDecoration(
        color: redeemed ? const Color(0xFFF2F7F1) : const Color(0xFFFFFBF3),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: redeemed
              ? const Color(0xFFD3E2CC)
              : const Color(0xFFE7DCC8),
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MetricChip(
                label: promotion.code,
                icon: Icons.sell_outlined,
              ),
              MetricChip(
                label: _discountLabel(),
                backgroundColor: const Color(0xFFF0E3B8),
                foregroundColor: const Color(0xFF8A5C12),
              ),
              MetricChip(
                label: redeemed
                    ? 'Redeemed x${promotion.availableRedemptions}'
                    : 'Redeem ${promotion.creditCost} credits',
                backgroundColor: redeemed
                    ? const Color(0xFFE7F1E3)
                    : const Color(0xFFF2EEE4),
                foregroundColor: redeemed
                    ? const Color(0xFF17332A)
                    : const Color(0xFF6A665E),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            promotion.name,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            promotion.description,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
          ),
          const SizedBox(height: 12),
          SummaryLine(
            label: 'Applies to',
            value: _targetSummary(),
            compact: true,
          ),
          const SizedBox(height: 10),
          if (promotion.minOrderAmount != null) ...[
            SummaryLine(
              label: 'Minimum order',
              value: Formatters.currency(promotion.minOrderAmount!),
              compact: true,
            ),
            const SizedBox(height: 10),
          ],
          if (promotion.endsAt != null) ...[
            SummaryLine(
              label: 'Valid until',
              value: Formatters.shortDate(promotion.endsAt!),
              compact: true,
            ),
            const SizedBox(height: 10),
          ],
          if (!redeemed && missingCredit > 0) ...[
            SummaryLine(
              label: 'Still needed',
              value: '$missingCredit credits',
              compact: true,
              valueColor: const Color(0xFFB6543A),
            ),
            const SizedBox(height: 12),
          ] else
            const SizedBox(height: 2),
          OverflowBar(
            spacing: 8,
            overflowSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: redeemed ? onCopyCode : null,
                icon: const Icon(Icons.copy_rounded),
                label: const Text('Copy code'),
              ),
              FilledButton(
                onPressed: redeemed
                    ? onCopyCode
                    : canRedeem
                        ? onRedeem
                        : null,
                child: Text(
                  redeemed ? 'Use voucher' : 'Redeem ${promotion.creditCost} credits',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MembershipOverviewCard extends StatelessWidget {
  const _MembershipOverviewCard({
    required this.membershipPoints,
    required this.currentLevel,
  });

  final int membershipPoints;
  final UserLevel? currentLevel;

  @override
  Widget build(BuildContext context) {
    final level = currentLevel;
    final currentThreshold = level?.resolvedLevelThreshold;
    final nextThreshold =
        level?.nextLevelMinMembershipPoints ?? level?.nextLevelMinCreditPoints;
    final remainingPoints = nextThreshold == null
        ? 0
        : (nextThreshold - membershipPoints).ceil().clamp(0, 1 << 30);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
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
                        'Membership level',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        level?.levelDisplayName ?? 'No tier reached yet',
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF17332A),
                                ),
                      ),
                    ],
                  ),
                ),
                MetricChip(
                  label: level?.levelBadgeLabel ?? 'Membership',
                  backgroundColor: const Color(0xFFE7F1E3),
                ),
              ],
            ),
            const SizedBox(height: 14),
            SummaryLine(
              label: 'Membership points',
              value: '$membershipPoints points',
              compact: true,
            ),
            if (currentThreshold != null) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Current threshold',
                value: '${currentThreshold.toStringAsFixed(0)} points',
                compact: true,
              ),
            ],
            if (nextThreshold != null) ...[
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Next threshold',
                value: '${nextThreshold.toStringAsFixed(0)} points',
                compact: true,
              ),
              const SizedBox(height: 10),
              SummaryLine(
                label: 'Still needed',
                value: '$remainingPoints points',
                compact: true,
                valueColor: const Color(0xFF5E7B62),
              ),
            ] else ...[
              const SizedBox(height: 12),
              const SoftInfoBanner(
                message: 'You are already at the highest membership tier available.',
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _AllLevelsCard extends StatelessWidget {
  const _AllLevelsCard({
    required this.membershipPoints,
    required this.currentLevel,
    required this.levelDefinitions,
  });

  final int membershipPoints;
  final UserLevel? currentLevel;
  final List<UserLevelDefinition> levelDefinitions;

  @override
  Widget build(BuildContext context) {
    final sortedDefinitions = [...levelDefinitions]..sort((left, right) {
        final thresholdCompare = left.minMembershipPoints
            .compareTo(right.minMembershipPoints);
        if (thresholdCompare != 0) {
          return thresholdCompare;
        }
        return left.id.compareTo(right.id);
      });

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'All membership tiers',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'The list below highlights your current tier and the next milestones to reach.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 16),
            if (sortedDefinitions.isEmpty)
              const EmptyStateCard(
                title: 'No membership tiers yet',
                message: 'The system has not returned an active membership tier list yet.',
              )
            else
              ...List.generate(sortedDefinitions.length, (index) {
                final definition = sortedDefinitions[index];
                final isCurrent = _isCurrentLevel(definition, currentLevel);
                final unlocked =
                    membershipPoints >= definition.minMembershipPoints;
                final isNext = !isCurrent &&
                    currentLevel != null &&
                    currentLevel!.nextLevelId == definition.id;
                return Padding(
                  padding: EdgeInsets.only(
                    bottom: index == sortedDefinitions.length - 1 ? 0 : 12,
                  ),
                  child: _LevelTierTile(
                    definition: definition,
                    membershipPoints: membershipPoints,
                    isCurrent: isCurrent,
                    unlocked: unlocked,
                    isNext: isNext,
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  bool _isCurrentLevel(
    UserLevelDefinition definition,
    UserLevel? currentLevel,
  ) {
    if (currentLevel == null) {
      return false;
    }
    if (currentLevel.levelId != null && currentLevel.levelId == definition.id) {
      return true;
    }
    final currentThreshold = currentLevel.resolvedLevelThreshold;
    if (currentThreshold == null) {
      return false;
    }
    return (definition.minMembershipPoints - currentThreshold).abs() < 0.000001;
  }
}

class _LevelTierTile extends StatelessWidget {
  const _LevelTierTile({
    required this.definition,
    required this.membershipPoints,
    required this.isCurrent,
    required this.unlocked,
    required this.isNext,
  });

  final UserLevelDefinition definition;
  final int membershipPoints;
  final bool isCurrent;
  final bool unlocked;
  final bool isNext;

  @override
  Widget build(BuildContext context) {
    final borderColor = isCurrent
        ? const Color(0xFF17332A)
        : isNext
            ? const Color(0xFF5E7B62)
            : const Color(0xFFE5DED0);
    final backgroundColor = isCurrent
        ? const Color(0xFFF2F7F1)
        : isNext
            ? const Color(0xFFFFFBF3)
            : Colors.white;
    final statusLabel = isCurrent
        ? 'Current'
        : unlocked
            ? 'Unlocked'
            : isNext
                ? 'Next tier'
                : 'Locked';
    final statusColor = isCurrent
        ? const Color(0xFF17332A)
        : unlocked
            ? const Color(0xFF5E7B62)
            : isNext
                ? const Color(0xFFC98A2E)
                : const Color(0xFF7E7A70);

    final remainingPoints = definition.minMembershipPoints > membershipPoints
        ? (definition.minMembershipPoints - membershipPoints).ceil()
        : 0;

    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.all(16),
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
                      definition.displayName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${definition.minMembershipPoints.toStringAsFixed(0)} points',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
              MetricChip(
                label: statusLabel,
                backgroundColor: statusColor.withValues(alpha: 0.14),
                foregroundColor: statusColor,
              ),
            ],
          ),
          const SizedBox(height: 12),
          SummaryLine(
            label: 'Membership code',
            value: definition.badgeLabel,
            compact: true,
          ),
          const SizedBox(height: 10),
          SummaryLine(
            label: 'Your progress',
            value:
                '$membershipPoints / ${definition.minMembershipPoints.toStringAsFixed(0)} points',
            compact: true,
          ),
          if (!unlocked) ...[
            const SizedBox(height: 10),
            SummaryLine(
              label: 'Still needed',
              value: '$remainingPoints points',
              compact: true,
              valueColor: const Color(0xFFB6543A),
            ),
          ],
        ],
      ),
    );
  }
}

class _LoyaltyPageData {
  const _LoyaltyPageData({
    required this.currentLevels,
    required this.levelDefinitions,
    required this.vouchers,
  });

  final List<UserLevel> currentLevels;
  final List<UserLevelDefinition> levelDefinitions;
  final List<PromotionCard> vouchers;
}
