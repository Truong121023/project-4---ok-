import 'package:flutter/material.dart';

import '../app/app.dart';
import '../core/services/support_chat_socket_service.dart';
import '../core/utils/formatters.dart';
import '../widgets/app_widgets.dart';

class BackofficeSupportChatScreen extends StatefulWidget {
  const BackofficeSupportChatScreen({super.key});

  @override
  State<BackofficeSupportChatScreen> createState() => _BackofficeSupportChatScreenState();
}

class _BackofficeSupportChatScreenState extends State<BackofficeSupportChatScreen> {
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
      )..connectForBackoffice();
    }
    _initialized = true;
  }

  @override
  void dispose() {
    _chatService?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final session = controller.session;
    final chatService = _chatService;
    final title = controller.isManager ? 'Support cua hang' : 'Support inbox';

    if (session == null || chatService == null) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: const Padding(
          padding: EdgeInsets.all(16),
          child: EmptyStateCard(
            title: 'Can dang nhap',
            message: 'Dang nhap lai de mo support inbox.',
          ),
        ),
      );
    }

    return AnimatedBuilder(
      animation: chatService,
      builder: (context, _) {
        final waitingCount = chatService.adminSessions.where((session) => session.waitingForAdmin).length;
        return Scaffold(
          appBar: AppBar(title: Text(title)),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          MetricChip(label: chatService.connectionLabel),
                          MetricChip(label: '${chatService.adminSessions.length} phien'),
                          if (waitingCount > 0) MetricChip(label: '$waitingCount dang cho'),
                        ],
                      ),
                      if ((chatService.errorMessage ?? '').trim().isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(chatService.errorMessage!),
                        const SizedBox(height: 12),
                        FilledButton.tonal(
                          onPressed: chatService.retry,
                          child: const Text('Thu ket noi lai'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (chatService.adminSessions.isEmpty)
                const EmptyStateCard(
                  title: 'Chua co phien chat',
                  message: 'Khi user mo support chat, phien ho tro se hien o day.',
                )
              else
                ...chatService.adminSessions.map(
                  (session) {
                    final lastMessage = session.messages.isEmpty ? null : session.messages.last;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        color: session.waitingForAdmin ? const Color(0xFFF4F7F1) : null,
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          title: Text(
                            '${session.userName} - ${session.storeName}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          subtitle: Text(
                            [
                              if ((lastMessage?.content ?? '').trim().isNotEmpty) lastMessage!.content,
                              if (lastMessage?.createdAt != null) Formatters.fullDateTime(lastMessage!.createdAt),
                            ].join('\n'),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                          isThreeLine: true,
                          trailing: session.waitingForAdmin
                              ? const Icon(Icons.mark_chat_unread_outlined)
                              : const Icon(Icons.chat_bubble_outline),
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => BackofficeSupportConversationScreen(
                                  chatService: chatService,
                                  sessionId: session.id,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}

class BackofficeSupportConversationScreen extends StatefulWidget {
  const BackofficeSupportConversationScreen({
    super.key,
    required this.chatService,
    required this.sessionId,
  });

  final SupportChatSocketService chatService;
  final String sessionId;

  @override
  State<BackofficeSupportConversationScreen> createState() => _BackofficeSupportConversationScreenState();
}

class _BackofficeSupportConversationScreenState extends State<BackofficeSupportConversationScreen> {
  final TextEditingController _composerController = TextEditingController();

  @override
  void dispose() {
    _composerController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final message = _composerController.text.trim();
    if (message.isEmpty) {
      return;
    }
    widget.chatService.sendBackofficeMessage(
      sessionId: widget.sessionId,
      content: message,
    );
    _composerController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.chatService,
      builder: (context, _) {
        final session = widget.chatService.findAdminSession(widget.sessionId);
        if (session == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Support chat')),
            body: const Padding(
              padding: EdgeInsets.all(16),
              child: EmptyStateCard(
                title: 'Phien chat da dong',
                message: 'User da roi khoi chat hoac phien nay khong con tren server.',
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(title: Text(session.userName)),
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
                              session.storeName,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                MetricChip(label: widget.chatService.connectionLabel),
                                if (session.waitingForAdmin) const MetricChip(label: 'Dang cho nhan'),
                                if ((session.assignedAdminName ?? '').trim().isNotEmpty)
                                  MetricChip(label: 'Phu trach: ${session.assignedAdminName}'),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(session.userEmail),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ...session.messages.map(
                      (message) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _BackofficeSupportBubble(
                          senderLabel: message.senderName,
                          roleLabel: message.senderRole,
                          content: message.content,
                          timestamp: message.createdAt,
                          incoming: message.senderRole.toUpperCase() == 'USER',
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
                            hintText: 'Nhap noi dung tra loi',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      FilledButton.icon(
                        onPressed: _sendMessage,
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
      },
    );
  }
}

class _BackofficeSupportBubble extends StatelessWidget {
  const _BackofficeSupportBubble({
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
    final header = [
      senderLabel,
      roleLabel,
      if (timestamp != null) Formatters.fullDateTime(timestamp),
    ].where((value) => value.trim().isNotEmpty).join(' - ');

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
                  header,
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
