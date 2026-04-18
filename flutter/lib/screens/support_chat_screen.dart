import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/models/models.dart';
import '../core/services/support_chat_socket_service.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';

class SupportChatScreen extends StatefulWidget {
  const SupportChatScreen({super.key});

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  Future<List<SupportStore>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = AppScope.of(context);
    if (controller.isLoggedIn) {
      _future ??= controller.loadSupportStores();
    }
  }

  Future<void> _refresh() async {
    final future = AppScope.of(context).loadSupportStores();
    setState(() {
      _future = future;
    });
    await future;
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      body: controller.isLoggedIn
          ? FutureBuilder<List<SupportStore>>(
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
                final stores = snapshot.data!;
                if (stores.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: const [
                        EmptyStateCard(
                          title: 'No support stores yet',
                          message: 'When stores are ready to accept support requests, they will appear here.',
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    children: [
                      const EmptyStateCard(
                        title: 'Choose a store for support',
                        message: 'Open a store to chat directly with the team managing that branch.',
                      ),
                      const SizedBox(height: 16),
                      ...stores.map(
                        (store) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: ActionMenuCard(
                            icon: Icons.support_agent_outlined,
                            title: store.name,
                            subtitle: 'Open the support chat for the exact store you want help from.',
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => SupportConversationScreen(store: store),
                                ),
                              );
                            },
                          ),
                        ),
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
                message: 'Sign in to chat with the store and follow replies inside the app.',
                actionLabel: 'Sign in',
                onAction: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                  );
                },
              ),
            ),
    );
  }
}

class SupportConversationScreen extends StatefulWidget {
  const SupportConversationScreen({
    super.key,
    required this.store,
  });

  final SupportStore store;

  @override
  State<SupportConversationScreen> createState() => _SupportConversationScreenState();
}

class _SupportConversationScreenState extends State<SupportConversationScreen> {
  final TextEditingController _composerController = TextEditingController();
  SupportChatSocketService? _chatService;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) {
      return;
    }
    final controller = AppScope.of(context);
    final session = controller.session;
    if (session != null) {
      _chatService = SupportChatSocketService(
        config: controller.config,
        accessToken: session.accessToken,
        currentUser: session.user,
        useMockData: controller.config.useMockData,
      )..connectForUser(
          storeId: widget.store.id,
          storeName: widget.store.name,
        );
    }
    _initialized = true;
  }

  @override
  void dispose() {
    _composerController.dispose();
    _chatService?.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final message = _composerController.text.trim();
    if (message.isEmpty) {
      return;
    }
    _chatService?.sendUserMessage(message);
    _composerController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final chatService = _chatService;
    if (chatService == null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.store.name)),
        body: const Padding(
          padding: EdgeInsets.all(16),
          child: EmptyStateCard(
            title: 'Sign in required',
            message: 'Sign in to open support chat.',
          ),
        ),
      );
    }

    return AnimatedBuilder(
      animation: chatService,
      builder: (context, _) {
        final chatState = chatService.userState;
        final messages = chatState?.messages ?? const <SupportChatMessage>[];
        return Scaffold(
          appBar: AppBar(title: Text(widget.store.name)),
          body: Column(
            children: [
              Expanded(
                child: ListView(
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
                              'Support status',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                MetricChip(label: chatService.connectionLabel),
                                MetricChip(label: widget.store.name),
                                if ((chatState?.assignedAdminName ?? '').trim().isNotEmpty)
                                  MetricChip(label: 'You are being helped by ${chatState!.assignedAdminName}'),
                              ],
                            ),
                            if ((chatService.errorMessage ?? '').trim().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Text(chatService.errorMessage!),
                              const SizedBox(height: 12),
                              FilledButton.tonal(
                                onPressed: chatService.retry,
                                child: const Text('Reconnect'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (messages.isEmpty)
                      const EmptyStateCard(
                        title: 'Opening chat session',
                        message: 'Messages will appear here as soon as the store joins the support session.',
                      )
                    else
                      ...messages.map(
                        (message) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _SupportBubble(
                            senderLabel: message.senderName,
                            roleLabel: message.senderRole,
                            content: message.content,
                            timestamp: message.createdAt,
                            incoming: message.senderRole.toUpperCase() != 'USER',
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
                            hintText: 'Type your support message',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      FilledButton.icon(
                        onPressed: _sendMessage,
                        icon: const Icon(Icons.send),
                        label: const Text('Send'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SupportBubble extends StatelessWidget {
  const _SupportBubble({
    required this.senderLabel,
    required this.roleLabel,
    required this.content,
    required this.timestamp,
    required this.incoming,
  });

  final String senderLabel;
  final String roleLabel;
  final String content;
  final DateTime? timestamp;
  final bool incoming;

  @override
  Widget build(BuildContext context) {
    final headerParts = [
      senderLabel.trim(),
      roleLabel.trim(),
      if (timestamp != null) Formatters.fullDateTime(timestamp),
    ].where((value) => value.isNotEmpty).join(' - ');

    return Align(
      alignment: incoming ? Alignment.centerLeft : Alignment.centerRight,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 340),
        child: Card(
          color: incoming ? null : const Color(0xFFE8F0E0),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: incoming ? CrossAxisAlignment.start : CrossAxisAlignment.end,
              children: [
                Text(
                  headerParts,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(content),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
