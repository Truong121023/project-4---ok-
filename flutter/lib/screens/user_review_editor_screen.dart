import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';

class UserReviewEditorScreen extends StatefulWidget {
  const UserReviewEditorScreen({
    super.key,
    required this.targetType,
    required this.targetId,
    required this.targetLabel,
    this.targetImagePaths = const [],
    this.existing,
  });

  final String targetType;
  final int targetId;
  final String targetLabel;
  final List<String> targetImagePaths;
  final UserReview? existing;

  @override
  State<UserReviewEditorScreen> createState() => _UserReviewEditorScreenState();
}

class _UserReviewEditorScreenState extends State<UserReviewEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _commentController;
  double _rating = 5;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.existing?.title ?? '');
    _commentController = TextEditingController(text: widget.existing?.comment ?? '');
    _rating = widget.existing?.rating ?? 5;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _submitting) {
      return;
    }
    final controller = AppScope.of(context);
    setState(() {
      _submitting = true;
    });
    try {
      await controller.saveUserReview(
        existing: widget.existing,
        targetType: widget.targetType,
        targetId: widget.targetId,
        rating: _rating,
        title: _titleController.text.trim(),
        comment: _commentController.text.trim(),
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.existing == null ? 'Review submitted' : 'Review updated'),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.existing == null ? 'Write review' : 'Edit review'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.targetLabel,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text('Type: ${widget.targetType}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Your rating: ${_rating.toStringAsFixed(1)}',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            Slider(
              value: _rating,
              min: 1,
              max: 5,
              divisions: 8,
              label: _rating.toStringAsFixed(1),
              onChanged: (value) {
                setState(() {
                  _rating = value;
                });
              },
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'Example: easy to order, friendly staff',
              ),
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'Enter a review title';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _commentController,
              maxLines: 6,
              decoration: const InputDecoration(
                labelText: 'Comment',
                hintText: 'Share your experience so the team can keep improving',
              ),
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'Enter your review comment';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_outlined),
              label: Text(_submitting ? 'Sending...' : 'Save review'),
            ),
          ],
        ),
      ),
    );
  }
}
