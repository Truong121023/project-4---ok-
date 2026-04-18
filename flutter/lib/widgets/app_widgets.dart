import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onTap,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
          Text(
            title,
            style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              style: textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
                height: 1.35,
              ),
            ),
          ],
        ],
    );
    final action = actionLabel != null && onTap != null
        ? TextButton(
            onPressed: onTap,
            child: Text(actionLabel!),
          )
        : null;

    if (action == null) {
      return content;
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 420) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              content,
              const SizedBox(height: 8),
              action,
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: content),
            const SizedBox(width: 12),
            action,
          ],
        );
      },
    );
  }
}

class KamatchaBrandMark extends StatelessWidget {
  const KamatchaBrandMark({
    super.key,
    this.compact = false,
    this.showSubtitle = true,
    this.centered = false,
  });

  final bool compact;
  final bool showSubtitle;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final imageSize = compact ? 42.0 : 72.0;
    final titleStyle = (compact ? textTheme.titleMedium : textTheme.headlineSmall)
        ?.copyWith(
          fontWeight: FontWeight.w900,
          letterSpacing: compact ? 0.6 : 1.0,
          color: const Color(0xFF17332A),
        );
    final subtitleStyle = textTheme.bodySmall?.copyWith(
      color: const Color(0xFF6F7C71),
      fontWeight: FontWeight.w700,
      letterSpacing: 0.2,
    );

    final image = Container(
      width: imageSize,
      height: imageSize,
      padding: EdgeInsets.all(compact ? 5 : 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF6ECDE),
        borderRadius: BorderRadius.circular(compact ? 16 : 22),
        border: Border.all(color: const Color(0xFFE9DCC8)),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(89, 108, 61, 0.12),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Image.asset(
        'assets/branding/kamatcha-logo.png',
        fit: BoxFit.contain,
      ),
    );

    final copy = Column(
      crossAxisAlignment:
          centered ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Kamatcha',
          overflow: TextOverflow.ellipsis,
          style: titleStyle,
        ),
        if (showSubtitle) ...[
          const SizedBox(height: 2),
          Text(
            'Modern tea spaces',
            overflow: TextOverflow.ellipsis,
            style: subtitleStyle,
          ),
        ],
      ],
    );

    return Row(
      mainAxisSize: centered ? MainAxisSize.min : MainAxisSize.max,
      mainAxisAlignment:
          centered ? MainAxisAlignment.center : MainAxisAlignment.start,
      children: [
        image,
        SizedBox(width: compact ? 10 : 14),
        if (centered)
          SizedBox(width: compact ? 140 : 190, child: copy)
        else
          Expanded(child: copy),
      ],
    );
  }
}

class EmptyStateCard extends StatelessWidget {
  const EmptyStateCard({
    super.key,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(message),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorStateCard extends StatelessWidget {
  const ErrorStateCard({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return EmptyStateCard(
      title: 'Khong tai duoc du lieu',
      message: message,
      actionLabel: 'Thu lai',
      onAction: onRetry,
    );
  }
}

class NetworkOrFallbackImage extends StatelessWidget {
  const NetworkOrFallbackImage({
    super.key,
    required this.imageUrl,
    required this.height,
    this.borderRadius = const BorderRadius.all(Radius.circular(22)),
    this.label,
  });

  final String? imageUrl;
  final double height;
  final BorderRadius borderRadius;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: imageUrl == null
            ? _FallbackPoster(label: label)
            : Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _FallbackPoster(label: label),
              ),
      ),
    );
  }
}

class _FallbackPoster extends StatelessWidget {
  const _FallbackPoster({this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFBFD8AE), Color(0xFF5F7F56)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          label ?? 'Kamatcha',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
        ),
      ),
    );
  }
}

class MetricChip extends StatelessWidget {
  const MetricChip({
    super.key,
    required this.label,
    this.icon,
    this.backgroundColor,
    this.foregroundColor,
    this.padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    this.maxWidth,
  });

  final String label;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final EdgeInsetsGeometry padding;
  final double? maxWidth;

  @override
  Widget build(BuildContext context) {
    final resolvedForeground = foregroundColor ?? const Color(0xFF17332A);
    final resolvedMaxWidth =
        maxWidth ?? math.min(MediaQuery.sizeOf(context).width * 0.55, 220.0);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor ?? const Color(0xFFE8F0E0),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: resolvedForeground.withValues(alpha: 0.08),
        ),
      ),
      child: Padding(
        padding: padding,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: resolvedMaxWidth),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: resolvedForeground),
                const SizedBox(width: 6),
              ],
              Flexible(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  softWrap: true,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: resolvedForeground,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SummaryLine extends StatelessWidget {
  const SummaryLine({
    super.key,
    required this.label,
    required this.value,
    this.emphasize = false,
    this.compact = false,
    this.labelColor,
    this.valueColor,
    this.padding = EdgeInsets.zero,
  });

  final String label;
  final String value;
  final bool emphasize;
  final bool compact;
  final Color? labelColor;
  final Color? valueColor;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final defaultColor = theme.colorScheme.onSurfaceVariant;
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: (compact ? theme.textTheme.bodySmall : theme.textTheme.bodyMedium)
                  ?.copyWith(
                color: labelColor ?? defaultColor,
                fontWeight: emphasize ? FontWeight.w700 : FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: (emphasize
                      ? (compact
                          ? theme.textTheme.titleMedium
                          : theme.textTheme.titleLarge)
                      : (compact
                          ? theme.textTheme.bodyMedium
                          : theme.textTheme.bodyLarge))
                  ?.copyWith(
                color: valueColor ?? theme.colorScheme.onSurface,
                fontWeight: emphasize ? FontWeight.w800 : FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SoftInfoBanner extends StatelessWidget {
  const SoftInfoBanner({
    super.key,
    required this.message,
    this.icon = Icons.info_outline,
    this.backgroundColor,
    this.foregroundColor,
  });

  final String message;
  final IconData icon;
  final Color? backgroundColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resolvedForeground = foregroundColor ?? const Color(0xFF5A6B61);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor ?? const Color(0xFFF3EEE2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: resolvedForeground),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: resolvedForeground,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ShippingBreakdownList extends StatelessWidget {
  const ShippingBreakdownList({
    super.key,
    required this.items,
    this.showDistance = true,
  });

  final List<ShippingFeeBreakdownItem> items;
  final bool showDistance;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFF8F3E9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE8DECE)),
      ),
      child: Column(
        children: [
          for (var index = 0; index < items.length; index++) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          items[index].storeName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        if (showDistance && items[index].distanceKm != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            Formatters.distance(items[index].distanceKm),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    Formatters.currency(items[index].shippingFeeAmount),
                    textAlign: TextAlign.end,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            if (index != items.length - 1)
              const Divider(height: 1, indent: 16, endIndent: 16),
          ],
        ],
      ),
    );
  }
}

class StoreCardTile extends StatelessWidget {
  const StoreCardTile({
    super.key,
    required this.store,
    required this.onTap,
    this.distanceKmOverride,
  });

  final StoreCard store;
  final VoidCallback onTap;
  final double? distanceKmOverride;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final displayDistanceKm = distanceKmOverride ?? store.distanceKm;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  store.imagePaths.isEmpty ? null : store.imagePaths.first,
                ),
                height: 132,
                label: store.name,
              ),
              const SizedBox(height: 12),
              Text(
                store.name,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              Text(
                store.highlightSummary,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  MetricChip(
                      label: '${Formatters.rating(store.averageRating)} sao'),
                  if (displayDistanceKm != null)
                    MetricChip(label: Formatters.distance(displayDistanceKm)),
                  MetricChip(label: store.open ? 'Dang mo' : 'Sap mo lai'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DishCardTile extends StatelessWidget {
  const DishCardTile({
    super.key,
    required this.dish,
    required this.onTap,
    this.onQuickAdd,
  });

  final DishCard dish;
  final VoidCallback onTap;
  final VoidCallback? onQuickAdd;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  dish.imagePaths.isEmpty ? null : dish.imagePaths.first,
                ),
                height: 118,
                label: dish.name,
              ),
              const SizedBox(height: 12),
              Text(
                dish.name,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              Text(
                dish.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),
              Text(
                Formatters.currency(dish.price),
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  MetricChip(
                      label: '${Formatters.rating(dish.averageRating)} sao'),
                  if (onQuickAdd != null) ...[
                    FilledButton.tonal(
                      onPressed: onQuickAdd,
                      child: const Text('Them'),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class NewsTile extends StatelessWidget {
  const NewsTile({
    super.key,
    required this.news,
    required this.onTap,
  });

  final NewsCard news;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  news.imagePaths.isEmpty ? null : news.imagePaths.first,
                ),
                height: 140,
                label: news.title,
              ),
              const SizedBox(height: 12),
              Text(
                news.title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              Text(
                news.summary,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ActionMenuCard extends StatelessWidget {
  const ActionMenuCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.badgeLabel,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final String? badgeLabel;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE7F0E1), Color(0xFFD9E9D0)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(13),
                  child: Icon(icon, color: const Color(0xFF17332A)),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800, height: 1.1),
                    ),
                    if (badgeLabel != null && badgeLabel!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      MetricChip(label: badgeLabel!),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFFF1EBDD),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Padding(
                  padding: EdgeInsets.all(8),
                  child: Icon(Icons.chevron_right),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ExploreShortcutCard extends StatelessWidget {
  const ExploreShortcutCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEEF3E6), Color(0xFFE2EAD9)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Icon(
                    icon,
                    size: 24,
                    color: const Color(0xFF17332A),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
