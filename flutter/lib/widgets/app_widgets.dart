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
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (actionLabel != null && onTap != null)
          TextButton(
            onPressed: onTap,
            child: Text(actionLabel!),
          ),
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
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
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
          label ?? 'Tea Matcha',
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
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFE8F0E0),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

class StoreCardTile extends StatelessWidget {
  const StoreCardTile({
    super.key,
    required this.store,
    required this.onTap,
  });

  final StoreCard store;
  final VoidCallback onTap;

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
                  store.imagePaths.isEmpty ? null : store.imagePaths.first,
                ),
                height: 132,
                label: store.name,
              ),
              const SizedBox(height: 12),
              Text(
                store.name,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
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
                  MetricChip(label: '${Formatters.rating(store.averageRating)} sao'),
                  MetricChip(label: Formatters.distance(store.distanceKm)),
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
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
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
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  MetricChip(label: '${Formatters.rating(dish.averageRating)} sao'),
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
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(news.summary),
            ],
          ),
        ),
      ),
    );
  }
}
