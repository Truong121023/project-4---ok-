import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import 'admin_editor_support.dart';
import 'admin_support.dart';

class AdminResourceEditorScreen extends StatefulWidget {
  const AdminResourceEditorScreen({
    super.key,
    required this.module,
    this.resourceId,
    this.initialData = const {},
  });

  final AdminModuleDefinition module;
  final int? resourceId;
  final JsonMap initialData;

  bool get isCreate => resourceId == null;

  @override
  State<AdminResourceEditorScreen> createState() => _AdminResourceEditorScreenState();
}

class _AdminResourceEditorScreenState extends State<AdminResourceEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _imagePicker = ImagePicker();
  late final AdminEditableModuleDefinition _config;
  late final Map<String, TextEditingController> _textControllers;
  late final Map<String, bool> _boolValues;
  bool _saving = false;
  bool _aiBusy = false;
  String? _error;
  List<String> _aiWarnings = const [];
  List<String> _aiMissingFields = const [];
  String? _aiScopeLabel;
  bool _roleScopeInitialized = false;

  @override
  void initState() {
    super.initState();
    final config = adminEditableModule(widget.module);
    assert(config != null, 'Editable config missing for module ${widget.module.id}');
    _config = config!;
    _textControllers = {
      for (final field in _config.fields.where((field) => field.type != AdminEditorFieldType.boolean))
        field.key: TextEditingController(text: editorFieldInitialText(field, widget.initialData)),
    };
    _boolValues = {
      for (final field in _config.fields.where((field) => field.type == AdminEditorFieldType.boolean))
        field.key: editorFieldInitialBool(field, widget.initialData),
    };
  }

  @override
  void dispose() {
    for (final controller in _textControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_roleScopeInitialized) {
      return;
    }
    final controller = AppScope.of(context);
    if (controller.isManager) {
      final storeId = controller.session?.user.workingStoreId;
      if (storeId != null && storeId > 0) {
        for (final field in _config.fields) {
          if (!isManagerScopedField(moduleId: widget.module.id, fieldKey: field.key)) {
            continue;
          }
          final textController = _textControllers[field.key];
          if (textController != null) {
            textController.text = '$storeId';
          }
        }
      }
      if (widget.module.id == 'users') {
        final roleController = _textControllers['role'];
        if (roleController != null && !managerAllowsManagedRole(roleController.text)) {
          roleController.text = '';
        }
      }
    }
    _roleScopeInitialized = true;
  }

  Future<void> _uploadImages(AdminEditorFieldDefinition field) async {
    final controller = AppScope.of(context);
    try {
      final picks = await _imagePicker.pickMultiImage(imageQuality: 88, maxWidth: 1800);
      if (picks.isEmpty) {
        return;
      }
      setState(() => _saving = true);
      final uploadedPaths = await controller.uploadAdminImages(
        filePaths: picks.map((file) => file.path).toList(),
        folder: _config.uploadFolder,
      );
      final textController = _textControllers[field.key]!;
      final existing = _tryParseJsonList(textController.text);
      final merged = [...existing, ...uploadedPaths];
      textController.text = const JsonEncoder.withIndent('  ').convert(merged);
      _aiMissingFields = _aiMissingFields.where((item) => item != field.key).toList();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  List<dynamic> _tryParseJsonList(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      return const [];
    }
    final decoded = jsonDecode(trimmed);
    if (decoded is List<dynamic>) {
      return decoded;
    }
    throw const FormatException('Gia tri hien tai khong phai JSON list hop le.');
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    if (!canEditAdminModule(
      role: AppScope.of(context).currentRole,
      module: widget.module,
    ) &&
        !widget.isCreate) {
      setState(() => _error = 'The current account is not allowed to edit this module.');
      return;
    }
    if (!canCreateAdminModule(
      role: AppScope.of(context).currentRole,
      module: widget.module,
    ) &&
        widget.isCreate) {
      setState(() => _error = 'The current account is not allowed to create records in this module.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final body = _buildRequestBody();
      final controller = AppScope.of(context);
      if (widget.isCreate) {
        await controller.createAdminResource(
          path: widget.module.path,
          body: body,
        );
      } else {
        await controller.updateAdminResource(
          path: '${widget.module.path}/${widget.resourceId}',
          body: body,
        );
      }
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } on FormatException catch (error) {
      setState(() => _error = error.message);
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  JsonMap _buildRequestBody() {
    final controller = AppScope.of(context);
    final body = <String, dynamic>{};
    for (final field in _config.fields) {
      if (field.type == AdminEditorFieldType.boolean) {
        if (_boolValues.containsKey(field.key)) {
          body[field.key] = _boolValues[field.key];
        }
        continue;
      }

      final raw = _textControllers[field.key]!.text.trim();
      final required = widget.isCreate ? field.requiredOnCreate : field.requiredOnEdit;
      if (raw.isEmpty) {
        if (field.alwaysInclude) {
          body[field.key] = '';
        } else if (required) {
          throw FormatException('${field.label} khong duoc de trong.');
        }
        continue;
      }

      body[field.key] = switch (field.type) {
        AdminEditorFieldType.text || AdminEditorFieldType.multiline || AdminEditorFieldType.password || AdminEditorFieldType.dateTime => raw,
        AdminEditorFieldType.integer => int.parse(raw),
        AdminEditorFieldType.decimal => double.parse(raw),
        AdminEditorFieldType.jsonList => _parseExpectedJson(raw, expectList: true),
        AdminEditorFieldType.jsonObject => _parseExpectedJson(raw, expectList: false),
        AdminEditorFieldType.boolean => _boolValues[field.key],
      };
    }
    if (controller.isManager) {
      final storeId = controller.session?.user.workingStoreId;
      if (storeId == null || storeId <= 0) {
        throw const FormatException('Manager hien tai chua co workingStoreId hop le.');
      }
      for (final field in _config.fields) {
        if (isManagerScopedField(moduleId: widget.module.id, fieldKey: field.key)) {
          body[field.key] = storeId;
        }
      }
      if (widget.module.id == 'users') {
        final role = asString(body['role']).toUpperCase();
        if (!managerAllowsManagedRole(role)) {
          throw const FormatException('Manager chi duoc tao hoac sua STAFF va SHIPPER.');
        }
        body['workingStoreId'] = storeId;
      }
    }
    return body;
  }

  dynamic _parseExpectedJson(String raw, {required bool expectList}) {
    final decoded = jsonDecode(raw);
    if (expectList && decoded is! List) {
      throw const FormatException('Gia tri phai la JSON list.');
    }
    if (!expectList && decoded is! Map) {
      throw const FormatException('Gia tri phai la JSON object.');
    }
    return decoded;
  }

  int? _aiStoreScopeId() {
    final controller = AppScope.of(context);
    if (controller.isManager) {
      return controller.session?.user.workingStoreId;
    }
    for (final key in const ['storeId', 'relatedStoreId', 'workingStoreId']) {
      final raw = _textControllers[key]?.text.trim();
      if (raw == null || raw.isEmpty) {
        continue;
      }
      final parsed = int.tryParse(raw);
      if (parsed != null && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }

  JsonMap _buildAiCurrentForm() {
    final body = <String, dynamic>{};
    for (final field in _config.fields) {
      if (field.type == AdminEditorFieldType.boolean) {
        body[field.key] = _boolValues[field.key] ?? false;
        continue;
      }

      final raw = _textControllers[field.key]!.text.trim();
      if (raw.isEmpty) {
        continue;
      }
      try {
        body[field.key] = switch (field.type) {
          AdminEditorFieldType.integer => int.parse(raw),
          AdminEditorFieldType.decimal => double.parse(raw),
          AdminEditorFieldType.jsonList => _parseExpectedJson(raw, expectList: true),
          AdminEditorFieldType.jsonObject => _parseExpectedJson(raw, expectList: false),
          _ => raw,
        };
      } catch (_) {
        body[field.key] = raw;
      }
    }
    return body;
  }

  void _applyAiDraft(AdminAiFormDraft draft) {
    for (final field in _config.fields) {
      if (!draft.draft.containsKey(field.key)) {
        continue;
      }
      final value = draft.draft[field.key];
      if (field.type == AdminEditorFieldType.boolean) {
        _boolValues[field.key] = asBool(value);
        continue;
      }
      final controller = _textControllers[field.key];
      if (controller == null) {
        continue;
      }
      if (value == null) {
        controller.text = '';
      } else if (value is List || value is Map) {
        controller.text = const JsonEncoder.withIndent('  ').convert(value);
      } else {
        controller.text = value.toString();
      }
    }
    _aiWarnings = draft.warnings;
    _aiMissingFields = draft.missingFields;
    final scopeName = (draft.scopeStoreName ?? '').trim();
    _aiScopeLabel = scopeName.isEmpty
        ? null
        : draft.scopeStoreId == null
            ? scopeName
            : '$scopeName (#${draft.scopeStoreId})';
  }

  Future<void> _openAiDraftComposer() async {
    final formType = adminAiFormTypeForModule(widget.module.id);
    if (formType == null) {
      return;
    }
    final promptController = TextEditingController();
    final prompt = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        final bottomInset = MediaQuery.of(context).viewInsets.bottom;
        return SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 20, 16, bottomInset + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'AI draft cho ${widget.module.title}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              const Text(
                'Nhap mo ta ngan gon, AI se de xuat draft va ban van duoc sua tay truoc khi luu.',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: promptController,
                minLines: 4,
                maxLines: 6,
                decoration: const InputDecoration(
                  labelText: 'Prompt',
                  hintText: 'Example: Create a summer matcha drink with a light taste that can become a best seller in store Q1.',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => Navigator.of(context).pop(promptController.text.trim()),
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('Tao draft'),
                ),
              ),
            ],
          ),
        );
      },
    );
    promptController.dispose();

    if ((prompt ?? '').trim().isEmpty || !mounted) {
      return;
    }

    setState(() {
      _aiBusy = true;
      _error = null;
    });
    try {
      final draft = await AppScope.of(context).generateAdminAiFormDraft(
        formType: formType,
        prompt: prompt!.trim(),
        storeId: _aiStoreScopeId(),
        currentForm: _buildAiCurrentForm(),
      );
      if (!mounted) {
        return;
      }
      setState(() => _applyAiDraft(draft));
      final warningText = draft.warnings.isEmpty ? 'AI da dien draft vao form.' : draft.warnings.first;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(warningText)),
      );
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.message);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _aiBusy = false);
      }
    }
  }

  Widget _buildField(AdminEditorFieldDefinition field) {
    final appController = AppScope.of(context);
    final isManagerLockedField = appController.isManager &&
        isManagerScopedField(
          moduleId: widget.module.id,
          fieldKey: field.key,
        );
    if (field.type == AdminEditorFieldType.boolean) {
      return SwitchListTile.adaptive(
        contentPadding: EdgeInsets.zero,
        title: Text(field.label),
        subtitle: field.helperText.isEmpty ? null : Text(field.helperText),
        value: _boolValues[field.key] ?? false,
        onChanged: _saving ? null : (value) => setState(() => _boolValues[field.key] = value),
      );
    }

    final fieldController = _textControllers[field.key]!;
    final keyboardType = switch (field.type) {
      AdminEditorFieldType.integer => TextInputType.number,
      AdminEditorFieldType.decimal => const TextInputType.numberWithOptions(decimal: true),
      _ => TextInputType.text,
    };
    final required = widget.isCreate ? field.requiredOnCreate : field.requiredOnEdit;

    final fieldOptions = field.key == 'role' ? roleOptionsForRole(appController.currentRole) : field.options;

    if (fieldOptions.isNotEmpty) {
      final currentValue = fieldController.text.trim().isEmpty ? null : fieldController.text.trim();
      return DropdownButtonFormField<String>(
        initialValue: currentValue != null && fieldOptions.contains(currentValue) ? currentValue : null,
        decoration: InputDecoration(
          labelText: field.label,
          helperText: field.helperText.isEmpty ? null : field.helperText,
        ),
        items: fieldOptions
            .map((option) => DropdownMenuItem<String>(value: option, child: Text(option)))
            .toList(),
        onChanged: _saving ? null : (value) => fieldController.text = value ?? '',
        validator: (value) {
          if (required && (value ?? '').trim().isEmpty) {
            return 'Can nhap ${field.label.toLowerCase()}';
          }
          return null;
        },
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_aiMissingFields.contains(field.key)) ...[
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF4D6),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              '${field.label} can bo sung tay sau khi AI draft.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
        ],
        TextFormField(
          controller: fieldController,
          keyboardType: keyboardType,
          obscureText: field.type == AdminEditorFieldType.password,
          minLines: field.maxLines > 1 ? field.maxLines : 1,
          maxLines: field.type == AdminEditorFieldType.password ? 1 : field.maxLines,
          readOnly: isManagerLockedField,
          decoration: InputDecoration(
            labelText: field.label,
            hintText: field.hint.isEmpty ? null : field.hint,
            helperText: field.helperText.isEmpty ? null : field.helperText,
          ),
          validator: (value) {
            final text = value?.trim() ?? '';
            if (required && text.isEmpty) {
              return 'Can nhap ${field.label.toLowerCase()}';
            }
            if (text.isEmpty) {
              return null;
            }
            try {
              switch (field.type) {
                case AdminEditorFieldType.integer:
                  int.parse(text);
                case AdminEditorFieldType.decimal:
                  double.parse(text);
                case AdminEditorFieldType.jsonList:
                  _parseExpectedJson(text, expectList: true);
                case AdminEditorFieldType.jsonObject:
                  _parseExpectedJson(text, expectList: false);
                default:
                  break;
              }
            } catch (_) {
              return switch (field.type) {
                AdminEditorFieldType.integer => 'Can la so nguyen',
                AdminEditorFieldType.decimal => 'Can la so hop le',
                AdminEditorFieldType.jsonList => 'Can la JSON list hop le',
                AdminEditorFieldType.jsonObject => 'Can la JSON object hop le',
                _ => 'Gia tri khong hop le',
              };
            }
            return null;
          },
        ),
        if (field.uploadable) ...[
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: _saving ? null : () => _uploadImages(field),
              icon: const Icon(Icons.upload_file),
              label: const Text('Upload anh'),
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isCreate ? 'Tao ${widget.module.title}' : 'Sua ${widget.module.title}'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.module.subtitle,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 16),
                    if (supportsAdminAiDraft(widget.module.id)) ...[
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilledButton.tonalIcon(
                            onPressed: _saving || _aiBusy ? null : _openAiDraftComposer,
                            icon: const Icon(Icons.auto_awesome),
                            label: Text(_aiBusy ? 'Dang tao draft...' : 'AI draft'),
                          ),
                          if (_aiScopeLabel != null) MetricChip(label: _aiScopeLabel!),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_aiWarnings.isNotEmpty) ...[
                      Card(
                        color: const Color(0xFFFFF7E7),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'AI warnings',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 8),
                              ..._aiWarnings.map(
                                (warning) => Padding(
                                  padding: const EdgeInsets.only(bottom: 6),
                                  child: Text(warning),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_aiMissingFields.isNotEmpty) ...[
                      Card(
                        color: const Color(0xFFF4F7F1),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Can nhap tay',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: _aiMissingFields
                                    .map((fieldKey) => MetricChip(label: adminFieldLabel(fieldKey)))
                                    .toList(),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    ..._config.fields.map(
                      (field) => Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _buildField(field),
                      ),
                    ),
                    if (_error != null) ...[
                      Text(
                        _error!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error),
                      ),
                      const SizedBox(height: 12),
                    ],
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _save,
                        icon: const Icon(Icons.save_outlined),
                        label: Text(_saving ? 'Dang luu...' : 'Luu'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const EmptyStateCard(
            title: 'Meo nhap JSON',
            message: 'Cac truong list/object nhu imagePaths, sections, highlightTags co the paste JSON truc tiep. Upload anh se tu dong them vao imagePaths.',
          ),
        ],
      ),
    );
  }
}

