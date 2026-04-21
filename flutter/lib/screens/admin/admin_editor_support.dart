import 'dart:convert';

import '../../core/models/models.dart';
import 'admin_support.dart';

enum AdminEditorFieldType {
  text,
  multiline,
  password,
  integer,
  decimal,
  boolean,
  dateTime,
  jsonList,
  jsonObject,
}

class AdminEditorFieldDefinition {
  const AdminEditorFieldDefinition({
    required this.key,
    required this.label,
    required this.type,
    this.hint = '',
    this.helperText = '',
    this.requiredOnCreate = false,
    this.requiredOnEdit = false,
    this.alwaysInclude = false,
    this.options = const [],
    this.maxLines = 1,
    this.uploadable = false,
  });

  final String key;
  final String label;
  final AdminEditorFieldType type;
  final String hint;
  final String helperText;
  final bool requiredOnCreate;
  final bool requiredOnEdit;
  final bool alwaysInclude;
  final List<String> options;
  final int maxLines;
  final bool uploadable;
}

class AdminEditableModuleDefinition {
  const AdminEditableModuleDefinition({
    required this.moduleId,
    required this.fields,
    this.allowCreate = true,
    this.allowEdit = true,
    this.allowDelete = true,
    this.uploadFolder,
  });

  final String moduleId;
  final List<AdminEditorFieldDefinition> fields;
  final bool allowCreate;
  final bool allowEdit;
  final bool allowDelete;
  final String? uploadFolder;
}

const List<String> _roleOptions = ['ADMIN', 'MANAGER', 'STAFF', 'SHIPPER', 'USER'];
const List<String> _managerRoleOptions = ['STAFF', 'SHIPPER'];
const List<String> _promotionScopeOptions = ['ORDER', 'DISH'];
const List<String> _discountTypeOptions = ['PERCENT', 'FIXED_AMOUNT'];
const List<String> _discountTargetOptions = ['ITEMS', 'SHIPPING', 'BOTH'];

const Set<String> _managerCreatableModules = {
  'users',
  'events',
  'categories',
  'dishes',
  'news',
  'store-dishes',
};

const Set<String> _managerEditableModules = {
  'users',
  'stores',
  'events',
  'categories',
  'dishes',
  'news',
  'store-dishes',
};

const Set<String> _managerDeletableModules = {
  'users',
  'events',
  'categories',
  'dishes',
  'news',
  'store-dishes',
  'reviews',
  'feedbacks',
};

const Map<String, String> _aiDraftFormTypeByModule = {
  'stores': 'STORE',
  'categories': 'CATEGORY',
  'dishes': 'DISH',
  'events': 'EVENT',
  'news': 'NEWS',
  'store-dishes': 'STORE_DISH',
};

const Map<String, AdminEditableModuleDefinition> adminEditableModules = {
  'users': AdminEditableModuleDefinition(
    moduleId: 'users',
    uploadFolder: null,
    fields: [
      AdminEditorFieldDefinition(
        key: 'fullName',
        label: 'Full Name',
        type: AdminEditorFieldType.text,
        requiredOnCreate: true,
        requiredOnEdit: true,
      ),
      AdminEditorFieldDefinition(
        key: 'email',
        label: 'Email',
        type: AdminEditorFieldType.text,
        requiredOnCreate: true,
        requiredOnEdit: true,
      ),
      AdminEditorFieldDefinition(
        key: 'password',
        label: 'Password',
        type: AdminEditorFieldType.password,
        hint: 'Required when creating',
        requiredOnCreate: true,
      ),
      AdminEditorFieldDefinition(
        key: 'role',
        label: 'Role',
        type: AdminEditorFieldType.text,
        requiredOnCreate: true,
        requiredOnEdit: true,
        options: _roleOptions,
      ),
      AdminEditorFieldDefinition(
        key: 'workingStoreId',
        label: 'Working Store ID',
        type: AdminEditorFieldType.integer,
      ),
      AdminEditorFieldDefinition(
        key: 'enabled',
        label: 'Enabled',
        type: AdminEditorFieldType.boolean,
        alwaysInclude: true,
      ),
    ],
  ),
  'stores': AdminEditableModuleDefinition(
    moduleId: 'stores',
    uploadFolder: 'stores',
    fields: [
      AdminEditorFieldDefinition(key: 'name', label: 'Name', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'description', label: 'Description', type: AdminEditorFieldType.multiline, maxLines: 4),
      AdminEditorFieldDefinition(key: 'address', label: 'Address', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'contactEmail', label: 'Contact Email', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'phoneNumber', label: 'Phone Number', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'slug', label: 'Slug', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'latitude', label: 'Latitude', type: AdminEditorFieldType.decimal),
      AdminEditorFieldDefinition(key: 'longitude', label: 'Longitude', type: AdminEditorFieldType.decimal),
      AdminEditorFieldDefinition(key: 'area', label: 'Area', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'positionLabel', label: 'Position Label', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'hoursText', label: 'Hours Text', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'openTime', label: 'Open Time', type: AdminEditorFieldType.text, hint: '08:00:00'),
      AdminEditorFieldDefinition(key: 'closeTime', label: 'Close Time', type: AdminEditorFieldType.text, hint: '22:00:00'),
      AdminEditorFieldDefinition(key: 'personality', label: 'Personality', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'designSignature', label: 'Design Signature', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'franchiseMood', label: 'Franchise Mood', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'specialty', label: 'Specialty', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'highlightSummary', label: 'Highlight Summary', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'highlightTags', label: 'Highlight Tags', type: AdminEditorFieldType.jsonList, hint: '["Matcha","Fresh"]'),
      AdminEditorFieldDefinition(key: 'serviceTags', label: 'Service Tags', type: AdminEditorFieldType.jsonList, hint: '["Dine-in","Pickup"]'),
      AdminEditorFieldDefinition(key: 'imagePaths', label: 'Image Paths', type: AdminEditorFieldType.jsonList, hint: '["/uploads/stores/a.jpg"]', uploadable: true),
      AdminEditorFieldDefinition(key: 'sections', label: 'Sections', type: AdminEditorFieldType.jsonList, hint: '[{"title":"Story","content":"..."}]', helperText: 'Nhap JSON list cua section objects.'),
      AdminEditorFieldDefinition(key: 'active', label: 'Active', type: AdminEditorFieldType.boolean, alwaysInclude: true),
    ],
  ),
  'events': AdminEditableModuleDefinition(
    moduleId: 'events',
    uploadFolder: 'events',
    fields: [
      AdminEditorFieldDefinition(key: 'storeId', label: 'Store ID', type: AdminEditorFieldType.integer, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'name', label: 'Name', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'description', label: 'Description', type: AdminEditorFieldType.multiline, maxLines: 4),
      AdminEditorFieldDefinition(key: 'location', label: 'Location', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'scheduleText', label: 'Schedule Text', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'startsAt', label: 'Starts At', type: AdminEditorFieldType.dateTime, hint: '2026-04-01T09:00:00Z'),
      AdminEditorFieldDefinition(key: 'endsAt', label: 'Ends At', type: AdminEditorFieldType.dateTime, hint: '2026-04-01T11:00:00Z'),
      AdminEditorFieldDefinition(key: 'capacity', label: 'Capacity', type: AdminEditorFieldType.integer),
      AdminEditorFieldDefinition(key: 'bookedCount', label: 'Booked Count', type: AdminEditorFieldType.integer),
      AdminEditorFieldDefinition(key: 'featuredDishIds', label: 'Featured Dish IDs', type: AdminEditorFieldType.jsonList, hint: '[1,2,3]'),
      AdminEditorFieldDefinition(key: 'highlightSummary', label: 'Highlight Summary', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'highlightTags', label: 'Highlight Tags', type: AdminEditorFieldType.jsonList, hint: '["Night","Live"]'),
      AdminEditorFieldDefinition(key: 'imagePaths', label: 'Image Paths', type: AdminEditorFieldType.jsonList, hint: '["/uploads/events/a.jpg"]', uploadable: true),
      AdminEditorFieldDefinition(key: 'sections', label: 'Sections', type: AdminEditorFieldType.jsonList, hint: '[{"title":"Agenda","content":"..."}]'),
      AdminEditorFieldDefinition(key: 'active', label: 'Active', type: AdminEditorFieldType.boolean, alwaysInclude: true),
    ],
  ),
  'categories': AdminEditableModuleDefinition(
    moduleId: 'categories',
    uploadFolder: 'categories',
    fields: [
      AdminEditorFieldDefinition(key: 'storeId', label: 'Store ID', type: AdminEditorFieldType.integer, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'name', label: 'Name', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'description', label: 'Description', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'imagePaths', label: 'Image Paths', type: AdminEditorFieldType.jsonList, uploadable: true),
      AdminEditorFieldDefinition(key: 'sortOrder', label: 'Sort Order', type: AdminEditorFieldType.integer),
      AdminEditorFieldDefinition(key: 'active', label: 'Active', type: AdminEditorFieldType.boolean, alwaysInclude: true),
    ],
  ),
  'dishes': AdminEditableModuleDefinition(
    moduleId: 'dishes',
    uploadFolder: 'dishes',
    fields: [
      AdminEditorFieldDefinition(key: 'categoryId', label: 'Category ID', type: AdminEditorFieldType.integer, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'name', label: 'Name', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'description', label: 'Description', type: AdminEditorFieldType.multiline, maxLines: 4),
      AdminEditorFieldDefinition(key: 'note', label: 'Note', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'price', label: 'Price', type: AdminEditorFieldType.decimal, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'status', label: 'Status', type: AdminEditorFieldType.text, hint: 'Vi du ACTIVE'),
      AdminEditorFieldDefinition(key: 'available', label: 'Available', type: AdminEditorFieldType.boolean, alwaysInclude: true),
      AdminEditorFieldDefinition(key: 'franchiseRequired', label: 'Franchise Required', type: AdminEditorFieldType.boolean),
      AdminEditorFieldDefinition(key: 'franchiseNote', label: 'Franchise Note', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'highlightSummary', label: 'Highlight Summary', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'highlightTags', label: 'Highlight Tags', type: AdminEditorFieldType.jsonList),
      AdminEditorFieldDefinition(key: 'imagePaths', label: 'Image Paths', type: AdminEditorFieldType.jsonList, uploadable: true),
      AdminEditorFieldDefinition(key: 'sections', label: 'Sections', type: AdminEditorFieldType.jsonList),
      AdminEditorFieldDefinition(key: 'active', label: 'Active', type: AdminEditorFieldType.boolean, alwaysInclude: true),
    ],
  ),
  'news': AdminEditableModuleDefinition(
    moduleId: 'news',
    uploadFolder: 'news',
    fields: [
      AdminEditorFieldDefinition(key: 'title', label: 'Title', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'slug', label: 'Slug', type: AdminEditorFieldType.text),
      AdminEditorFieldDefinition(key: 'summary', label: 'Summary', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'content', label: 'Content', type: AdminEditorFieldType.multiline, maxLines: 6),
      AdminEditorFieldDefinition(key: 'relatedStoreId', label: 'Related Store ID', type: AdminEditorFieldType.integer),
      AdminEditorFieldDefinition(key: 'tags', label: 'Tags', type: AdminEditorFieldType.jsonList),
      AdminEditorFieldDefinition(key: 'imagePaths', label: 'Image Paths', type: AdminEditorFieldType.jsonList, uploadable: true),
      AdminEditorFieldDefinition(key: 'sections', label: 'Sections', type: AdminEditorFieldType.jsonList),
      AdminEditorFieldDefinition(key: 'featured', label: 'Featured', type: AdminEditorFieldType.boolean),
      AdminEditorFieldDefinition(key: 'published', label: 'Published', type: AdminEditorFieldType.boolean),
      AdminEditorFieldDefinition(key: 'publishedAt', label: 'Published At', type: AdminEditorFieldType.dateTime, hint: '2026-04-01T10:00:00Z'),
    ],
  ),
  'store-dishes': AdminEditableModuleDefinition(
    moduleId: 'store-dishes',
    fields: [
      AdminEditorFieldDefinition(key: 'storeId', label: 'Store ID', type: AdminEditorFieldType.integer, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'dishId', label: 'Dish ID', type: AdminEditorFieldType.integer, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'quantity', label: 'Quantity', type: AdminEditorFieldType.integer),
      AdminEditorFieldDefinition(key: 'available', label: 'Available', type: AdminEditorFieldType.boolean, alwaysInclude: true),
      AdminEditorFieldDefinition(key: 'priceOverride', label: 'Price Override', type: AdminEditorFieldType.decimal),
    ],
  ),
  'promotions': AdminEditableModuleDefinition(
    moduleId: 'promotions',
    fields: [
      AdminEditorFieldDefinition(key: 'code', label: 'Code', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'name', label: 'Name', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'description', label: 'Description', type: AdminEditorFieldType.multiline, maxLines: 3),
      AdminEditorFieldDefinition(key: 'scope', label: 'Scope', type: AdminEditorFieldType.text, options: _promotionScopeOptions),
      AdminEditorFieldDefinition(key: 'discountType', label: 'Discount Type', type: AdminEditorFieldType.text, options: _discountTypeOptions),
      AdminEditorFieldDefinition(
        key: 'discountTarget',
        label: 'Discount Target',
        type: AdminEditorFieldType.text,
        options: _discountTargetOptions,
        helperText: 'Choose a discount for signature items, shipping, or both. Vouchers apply across the system and are not tied to a single store.',
      ),
      AdminEditorFieldDefinition(key: 'discountValue', label: 'Discount Value', type: AdminEditorFieldType.decimal, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'minOrderAmount', label: 'Min Order Amount', type: AdminEditorFieldType.decimal),
      AdminEditorFieldDefinition(key: 'maximumDiscountAmount', label: 'Maximum Discount Amount', type: AdminEditorFieldType.decimal),
      AdminEditorFieldDefinition(key: 'usageLimit', label: 'Usage Limit', type: AdminEditorFieldType.integer),
      AdminEditorFieldDefinition(key: 'startsAt', label: 'Starts At', type: AdminEditorFieldType.dateTime, hint: '2026-04-01T00:00:00Z'),
      AdminEditorFieldDefinition(key: 'endsAt', label: 'Ends At', type: AdminEditorFieldType.dateTime, hint: '2026-04-30T23:59:59Z'),
      AdminEditorFieldDefinition(
        key: 'promotionDishIds',
        label: 'Signature Dish IDs',
        type: AdminEditorFieldType.jsonList,
        helperText: 'Only choose SIGNATURE item IDs. Vouchers apply across the system and the backend will validate again if a local or store-specialty item appears.',
      ),
      AdminEditorFieldDefinition(
        key: 'eligibleUserLevelIds',
        label: 'Eligible User Level IDs',
        type: AdminEditorFieldType.jsonList,
        helperText: 'Use this to suggest membership-based eligibility on the frontend. The backend still makes the final decision.',
      ),
      AdminEditorFieldDefinition(key: 'active', label: 'Active', type: AdminEditorFieldType.boolean, alwaysInclude: true),
    ],
  ),
  'user-levels': AdminEditableModuleDefinition(
    moduleId: 'user-levels',
    fields: [
      AdminEditorFieldDefinition(key: 'storeId', label: 'Store ID', type: AdminEditorFieldType.integer, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'code', label: 'Code', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'name', label: 'Name', type: AdminEditorFieldType.text, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'minPaidAmount', label: 'Min Paid Amount', type: AdminEditorFieldType.decimal, requiredOnCreate: true, requiredOnEdit: true),
      AdminEditorFieldDefinition(key: 'active', label: 'Active', type: AdminEditorFieldType.boolean, alwaysInclude: true),
    ],
  ),
};

AdminEditableModuleDefinition? adminEditableModule(AdminModuleDefinition module) {
  return adminEditableModules[module.id];
}

bool canCreateAdminModule({
  required String role,
  required AdminModuleDefinition module,
}) {
  final editable = adminEditableModule(module);
  if (editable == null || !editable.allowCreate) {
    return false;
  }
  if (role.toUpperCase() != 'MANAGER') {
    return true;
  }
  return _managerCreatableModules.contains(module.id);
}

bool canEditAdminModule({
  required String role,
  required AdminModuleDefinition module,
}) {
  final editable = adminEditableModule(module);
  if (editable == null || !editable.allowEdit) {
    return false;
  }
  if (role.toUpperCase() != 'MANAGER') {
    return true;
  }
  return _managerEditableModules.contains(module.id);
}

bool canDeleteAdminModule({
  required String role,
  required AdminModuleDefinition module,
}) {
  final editable = adminEditableModule(module);
  if (editable == null || !editable.allowDelete) {
    return false;
  }
  if (role.toUpperCase() != 'MANAGER') {
    return true;
  }
  return _managerDeletableModules.contains(module.id);
}

List<String> roleOptionsForRole(String role) {
  return role.toUpperCase() == 'MANAGER' ? _managerRoleOptions : _roleOptions;
}

bool managerAllowsManagedRole(String role) {
  final normalized = role.trim().toUpperCase();
  return _managerRoleOptions.contains(normalized);
}

bool isManagerScopedField({
  required String moduleId,
  required String fieldKey,
}) {
  return switch (moduleId) {
    'users' => fieldKey == 'workingStoreId',
    'events' || 'categories' || 'store-dishes' => fieldKey == 'storeId',
    'news' => fieldKey == 'relatedStoreId',
    _ => false,
  };
}

bool supportsAdminAiDraft(String moduleId) => _aiDraftFormTypeByModule.containsKey(moduleId);

String? adminAiFormTypeForModule(String moduleId) => _aiDraftFormTypeByModule[moduleId];

String encodeAdminJson(dynamic value) {
  const encoder = JsonEncoder.withIndent('  ');
  if (value == null) {
    return '';
  }
  if (value is List || value is Map) {
    return encoder.convert(value);
  }
  if (value is String) {
    return value;
  }
  return value.toString();
}

String editorFieldInitialText(AdminEditorFieldDefinition field, JsonMap data) {
  final value = data[field.key] ??
      switch (field.key) {
        'minOrderAmount' => data['minimumOrderAmount'],
        'promotionDishIds' => data['applicableDishIds'],
        _ => null,
      };
  if (value == null) {
    return '';
  }
  return switch (field.type) {
    AdminEditorFieldType.jsonList || AdminEditorFieldType.jsonObject => encodeAdminJson(value),
    _ => value.toString(),
  };
}

bool editorFieldInitialBool(AdminEditorFieldDefinition field, JsonMap data) {
  return asBool(data[field.key]);
}

