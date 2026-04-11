import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../widgets/app_widgets.dart';
import 'admin/admin_resource_detail_screen.dart';
import 'admin/admin_support.dart';
import 'dish_detail_screen.dart';
import 'events_screen.dart';
import 'login_screen.dart';
import 'news_detail_screen.dart';
import 'store_detail_screen.dart';

class AiChatFab extends StatelessWidget {
  const AiChatFab({super.key});

  void _open(BuildContext context) {
    final controller = AppScope.of(context);
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => controller.isLoggedIn ? const AiChatScreen() : const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return FloatingActionButton.extended(
      heroTag: 'ai-chat-fab-${controller.currentRole}',
      onPressed: () => _open(context),
      icon: const Icon(Icons.smart_toy_outlined),
      label: const Text('AI'),
    );
  }
}

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final TextEditingController _composerController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_AiChatUiMessage> _messages = [];
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_messages.isEmpty) {
      final controller = AppScope.of(context);
      _messages.add(
        _AiChatUiMessage(
          role: 'assistant',
          content: _welcomeMessageForRole(controller.currentRole),
        ),
      );
    }
  }

  @override
  void dispose() {
    _composerController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  List<String> _quickPromptsForRole(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return const [
          'Hom nay store nao ban tot nhat?',
          'Cho minh xem uu dai dang bat cua he thong',
          'Tai khoan manager nao dang phu trach Q1?',
        ];
      case 'MANAGER':
        return const [
          'Tom tat store cua toi hom nay',
          'Mon nao dang ban tot nhat o store nay?',
          'Cho minh xem feedback gan day cua store',
        ];
      case 'STAFF':
        return const [
          'Store nay co mon matcha nao dang hot?',
          'Cho minh xem tin tuc moi cua Kamatcha',
          'Tai khoan cua toi dang o trang thai nao?',
        ];
      case 'SHIPPER':
        return const [
          'Voucher nao dang bat de tu van cho khach?',
          'Cho minh xem tin tuc moi cua Kamatcha',
          'Tai khoan cua toi dang o trang thai nao?',
        ];
      default:
        return const [
          'Cua hang nao o Quan 1 co matcha latte?',
          'Cho minh xem uu dai dang bat',
          'Tai khoan cua toi dang o trang thai nao?',
        ];
    }
  }

  Future<void> _sendMessage([String? preset]) async {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn || _busy) {
      return;
    }
    final message = (preset ?? _composerController.text).trim();
    if (message.isEmpty) {
      return;
    }

    setState(() {
      _messages.add(_AiChatUiMessage(role: 'user', content: message));
      _busy = true;
      if (preset == null) {
        _composerController.clear();
      }
    });
    _scrollToBottom();

    try {
      final history = _messages
          .where((message) => message.role == 'user' || message.role == 'assistant')
          .take(_messages.length - 1)
          .map((message) => AiChatHistoryEntry(role: message.role, content: message.content))
          .toList();

      final response = await controller.queryAiChat(
        message: message,
        history: history.length > 10 ? history.sublist(history.length - 10) : history,
      );

      if (!mounted) {
        return;
      }
      setState(() {
        _messages.add(
          _AiChatUiMessage(
            role: 'assistant',
            content: response.answer,
            references: response.references,
            currentUserStatus: response.currentUserStatus,
          ),
        );
      });
      _scrollToBottom();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _openReference(AiChatReference reference) async {
    final controller = AppScope.of(context);
    Route<void>? route;

    if (controller.isBackoffice && (reference.adminApiPath ?? '').trim().isNotEmpty) {
      route = _buildAdminReferenceRoute(reference.adminApiPath!);
    } else {
      route = _buildPublicReferenceRoute(reference);
    }

    if (route == null && (reference.userApiPath ?? '').trim() == '/api/auth/me') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Thong tin tai khoan da duoc hien ngay trong khung AI chat.')),
      );
      return;
    }

    if (route == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chua co man hinh chi tiet phu hop cho tham chieu nay.')),
      );
      return;
    }

    await Navigator.of(context).push(route);
  }

  Route<void>? _buildPublicReferenceRoute(AiChatReference reference) {
    switch (reference.entityType.toUpperCase()) {
      case 'STORE':
        final key = (reference.slug ?? '').trim();
        if (key.isEmpty) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => StoreDetailScreen(storeKey: key),
        );
      case 'DISH':
        final id = reference.id;
        if (id == null || id <= 0) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => DishDetailScreen(dishId: id),
        );
      case 'EVENT':
        final key = (reference.slug ?? '').trim();
        if (key.isEmpty) {
          final id = reference.id;
          if (id == null || id <= 0) {
            return null;
          }
          return MaterialPageRoute<void>(
            builder: (_) => EventDetailScreen(eventKey: '$id'),
          );
        }
        return MaterialPageRoute<void>(
          builder: (_) => EventDetailScreen(eventKey: key),
        );
      case 'NEWS':
        final key = (reference.slug ?? '').trim();
        if (key.isEmpty) {
          return null;
        }
        return MaterialPageRoute<void>(
          builder: (_) => NewsDetailScreen(newsKey: key),
        );
      default:
        return null;
    }
  }

  Route<void>? _buildAdminReferenceRoute(String adminApiPath) {
    final uri = Uri.tryParse(adminApiPath);
    if (uri == null) {
      return null;
    }
    final segments = uri.pathSegments;
    if (segments.length < 4 || segments[0] != 'api' || segments[1] != 'admin') {
      return null;
    }
    final moduleId = segments[2];
    final resourceId = int.tryParse(segments[3]);
    if (resourceId == null) {
      return null;
    }
    try {
      final module = moduleById(moduleId);
      return MaterialPageRoute<void>(
        builder: (_) => AdminResourceDetailScreen(
          module: module,
          resourceId: resourceId,
        ),
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    if (!controller.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('AI chat')),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: EmptyStateCard(
            title: 'Can dang nhap',
            message: 'Dang nhap de hoi AI ve store, mon, event, news, voucher va trang thai tai khoan.',
            actionLabel: 'Dang nhap',
            onAction: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
              );
            },
          ),
        ),
      );
    }

    final prompts = _quickPromptsForRole(controller.currentRole);
    return Scaffold(
      appBar: AppBar(title: const Text('Kamatcha AI')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              children: [
                Card(
                  color: const Color(0xFFF4F7F1),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hoi nhanh bang ngon ngu tu nhien',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          controller.isBackoffice
                              ? 'AI co the tra cuu store, dish, event, news, promotion va mo nhanh record noi bo theo quyen cua ban.'
                              : 'AI co the goi y store, mon, event, news, voucher va tom tat trang thai tai khoan hien tai.',
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            MetricChip(label: controller.currentRole),
                            if (controller.session?.user.workingStoreName != null)
                              MetricChip(label: controller.session!.user.workingStoreName!),
                            if (controller.config.useMockData) const MetricChip(label: 'Che do demo'),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: prompts
                              .map(
                                (prompt) => ActionChip(
                                  label: Text(prompt),
                                  onPressed: _busy ? null : () => _sendMessage(prompt),
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ..._messages.map(
                  (message) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _AiChatMessageCard(
                      message: message,
                      onOpenReference: _openReference,
                    ),
                  ),
                ),
                if (_busy)
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.only(top: 4),
                      child: SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _composerController,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: const InputDecoration(
                        hintText: 'Hoi ve store, dish, event, voucher, tai khoan...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton.icon(
                    onPressed: _busy ? null : _sendMessage,
                    icon: const Icon(Icons.send),
                    label: const Text('Gui'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AiChatMessageCard extends StatelessWidget {
  const _AiChatMessageCard({
    required this.message,
    required this.onOpenReference,
  });

  final _AiChatUiMessage message;
  final Future<void> Function(AiChatReference reference) onOpenReference;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final incoming = message.role == 'assistant';
    return Align(
      alignment: incoming ? Alignment.centerLeft : Alignment.centerRight,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: Card(
          color: incoming ? null : const Color(0xFFE8F0E0),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  incoming ? 'Kamatcha AI' : 'Ban',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(message.content),
                if (message.currentUserStatus != null) ...[
                  const SizedBox(height: 12),
                  _AiUserStatusCard(status: message.currentUserStatus!),
                ],
                if (message.references.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ...message.references.map(
                    (reference) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => onOpenReference(reference),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.78),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE1E6D7)),
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 72,
                                child: NetworkOrFallbackImage(
                                  imageUrl: controller.config.resolveImageUrl(reference.imagePath),
                                  height: 72,
                                  borderRadius: BorderRadius.circular(16),
                                  label: reference.title,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      reference.title,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleSmall
                                          ?.copyWith(fontWeight: FontWeight.w800),
                                    ),
                                    if ((reference.subtitle ?? '').trim().isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        reference.subtitle!,
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        MetricChip(label: reference.entityType),
                                        if ((reference.slug ?? '').trim().isNotEmpty)
                                          MetricChip(label: reference.slug!),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward_ios, size: 16),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AiUserStatusCard extends StatelessWidget {
  const _AiUserStatusCard({required this.status});

  final AiChatCurrentUserStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF7F3E8),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Trang thai tai khoan',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(status.fullName),
          Text(status.email),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MetricChip(label: status.role),
              MetricChip(label: status.enabled ? 'Enabled' : 'Disabled'),
              MetricChip(label: status.verified ? 'Verified' : 'Cho verify'),
              MetricChip(label: status.profileCompleted ? 'Ho so day du' : 'Can bo sung ho so'),
              if ((status.workingStoreName ?? '').trim().isNotEmpty)
                MetricChip(label: status.workingStoreName!),
            ],
          ),
        ],
      ),
    );
  }
}

class _AiChatUiMessage {
  const _AiChatUiMessage({
    required this.role,
    required this.content,
    this.references = const [],
    this.currentUserStatus,
  });

  final String role;
  final String content;
  final List<AiChatReference> references;
  final AiChatCurrentUserStatus? currentUserStatus;
}

String _welcomeMessageForRole(String role) {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'Chao ban. Minh co the giup tra cuu nhanh store, mon, event, news, promotions va record quan tri theo quyen ADMIN cua Kamatcha.';
    case 'MANAGER':
      return 'Chao manager. Ban co the hoi ve store hien tai, mon dang ban tot, tin tuc, promotions va nhan su trong scope cua hang Kamatcha.';
    case 'STAFF':
      return 'Chao ban. Ban co the hoi nhanh ve mon, store, tin tuc, uu dai va trang thai tai khoan de thao tac tren mobile de hon.';
    case 'SHIPPER':
      return 'Chao ban. Ban co the hoi nhanh ve store, mon, uu dai, tin tuc va trang thai tai khoan trong khi dang giao hang.';
    default:
      return 'Chao ban. Minh co the giup tim store, mon, event, tin tuc, voucher va tom tat trang thai tai khoan cua ban.';
  }
}
