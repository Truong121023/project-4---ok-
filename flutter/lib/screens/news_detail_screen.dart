import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';

class NewsDetailScreen extends StatefulWidget {
  const NewsDetailScreen({
    super.key,
    required this.newsKey,
  });

  final String newsKey;

  @override
  State<NewsDetailScreen> createState() => _NewsDetailScreenState();
}

class _NewsDetailScreenState extends State<NewsDetailScreen> {
  Future<NewsDetail>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= AppScope.of(context).loadNewsDetail(widget.newsKey);
  }

  Future<void> _reload() async {
    final future = AppScope.of(context).loadNewsDetail(widget.newsKey);
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiet tin tuc')),
      body: FutureBuilder<NewsDetail>(
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
                onRetry: _reload,
              ),
            );
          }
          final news = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              NetworkOrFallbackImage(
                imageUrl: controller.config.resolveImageUrl(
                  news.imagePaths.isEmpty ? null : news.imagePaths.first,
                ),
                height: 220,
                label: news.title,
              ),
              const SizedBox(height: 18),
              Text(
                news.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text('${news.relatedStoreName} - ${Formatters.shortDate(news.publishedAt)}'),
              const SizedBox(height: 16),
              Text(news.summary, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              Text(news.content),
              const SizedBox(height: 20),
              if (news.sections.isNotEmpty)
                ...news.sections.map(
                  (section) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (section.imagePath != null) ...[
                              NetworkOrFallbackImage(
                                imageUrl: controller.config.resolveImageUrl(section.imagePath),
                                height: 160,
                                label: section.title,
                              ),
                              const SizedBox(height: 12),
                            ],
                            Text(
                              section.title,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Text(section.content),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
