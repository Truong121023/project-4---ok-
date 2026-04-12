import 'package:flutter/material.dart';

import '../../core/models/models.dart';

enum EmployeeRoleKind {
  staff,
  shipper,
}

String employeeRoleLabel(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'STAFF',
    EmployeeRoleKind.shipper => 'SHIPPER',
  };
}

String employeePanelTitle(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'Kitchen panel',
    EmployeeRoleKind.shipper => 'Delivery panel',
  };
}

String employeePanelSubtitle(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'Quet QR hoac mo task de nhan don, lam mon roi ban giao cho shipper.',
    EmployeeRoleKind.shipper => 'Mo task tu thong bao hoac quet QR de nhan don, giao thanh cong va luu anh chung minh.',
  };
}

IconData employeeRoleIcon(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => Icons.local_cafe_outlined,
    EmployeeRoleKind.shipper => Icons.delivery_dining_outlined,
  };
}

String employeePrimaryQueueLabel(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'Dang lam mon',
    EmployeeRoleKind.shipper => 'Dang giao don',
  };
}

String employeeActiveQueueLabel(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'Dang xu ly',
    EmployeeRoleKind.shipper => 'Dang xu ly',
  };
}

String employeeCompletedQueueLabel(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'Da ban giao',
    EmployeeRoleKind.shipper => 'Da hoan thanh',
  };
}

List<String> employeeAllowedActions(JsonMap order) {
  return asStringList(order['allowedActions']).map((action) => action.toUpperCase()).toList();
}

bool employeeHasAction(JsonMap order, String action) {
  return employeeAllowedActions(order).contains(action.toUpperCase());
}

List<JsonMap> employeePendingOrders(EmployeeRoleKind kind, List<JsonMap> orders) {
  return orders.where((order) {
    return switch (kind) {
      EmployeeRoleKind.staff => employeeHasAction(order, 'ACCEPT_PREPARING'),
      EmployeeRoleKind.shipper => employeeHasAction(order, 'ACCEPT_DELIVERY'),
    };
  }).toList();
}

List<JsonMap> employeeActiveOrders(EmployeeRoleKind kind, List<JsonMap> orders, int currentUserId) {
  return orders.where((order) {
    final status = asString(order['status']).toUpperCase();
    final assignedId = switch (kind) {
      EmployeeRoleKind.staff => asInt(order['preparingStaffId']),
      EmployeeRoleKind.shipper => asInt(order['deliveringShipperId']),
    };
    final allowedStatus = switch (kind) {
      EmployeeRoleKind.staff => status == 'PREPARING',
      EmployeeRoleKind.shipper => status == 'OUT_FOR_DELIVERY',
    };
    if (!allowedStatus) {
      return false;
    }
    return assignedId == 0 || assignedId == currentUserId;
  }).toList();
}

List<JsonMap> employeeCompletedOrders(EmployeeRoleKind kind, List<JsonMap> orders) {
  return orders.where((order) {
    final status = asString(order['status']).toUpperCase();
    return switch (kind) {
      EmployeeRoleKind.staff => status == 'READY_FOR_SHIPPER',
      EmployeeRoleKind.shipper => status == 'COMPLETED',
    };
  }).toList();
}

String? employeeActionPath(EmployeeRoleKind kind, JsonMap order, int _currentUserId) {
  final allowedActions = employeeAllowedActions(order);
  if (kind == EmployeeRoleKind.staff) {
    if (allowedActions.contains('MARK_READY')) {
      return 'mark-ready';
    }
    if (allowedActions.contains('ACCEPT_PREPARING')) {
      return 'accept-preparing';
    }
  } else {
    if (allowedActions.contains('MARK_COMPLETED')) {
      return 'complete-delivery';
    }
    if (allowedActions.contains('ACCEPT_DELIVERY')) {
      return 'accept-delivery';
    }
  }
  return null;
}

String? employeeActionLabel(EmployeeRoleKind kind, JsonMap order, int currentUserId) {
  final action = employeeActionPath(kind, order, currentUserId);
  return switch (action) {
    'accept-preparing' => 'Nhan lam mon',
    'mark-ready' => 'San sang cho shipper',
    'accept-delivery' => 'Nhan giao',
    'complete-delivery' => 'Da giao don',
    _ => null,
  };
}

String employeeOrderSubtitle(JsonMap order) {
  final statusSummary = asString(order['statusSummary']).trim();
  if (statusSummary.isNotEmpty) {
    return statusSummary;
  }
  final paymentStatus = asString(order['paymentStatus']).trim();
  final deliveryAddress = asString(order['deliveryAddress']).trim();
  return [paymentStatus, deliveryAddress].where((value) => value.isNotEmpty).join(' - ');
}

List<JsonMap> employeeMonthlyItems(JsonMap monthlySchedule) {
  return asObjectList<JsonMap>(
    monthlySchedule['items'],
    (json) => Map<String, dynamic>.from(json),
  );
}

int? employeeOrderIdFromActionUrl(String? actionUrl) {
  final trimmed = actionUrl?.trim();
  if (trimmed == null || trimmed.isEmpty) {
    return null;
  }
  final uri = Uri.tryParse(trimmed);
  final segments = (uri?.pathSegments ?? trimmed.split('/'))
      .map((segment) => segment.trim())
      .where((segment) => segment.isNotEmpty)
      .toList();
  final ordersIndex = segments.lastIndexOf('orders');
  if (ordersIndex == -1 || ordersIndex + 1 >= segments.length) {
    return null;
  }
  return int.tryParse(segments[ordersIndex + 1]);
}

int? employeeNotificationOrderId(JsonMap notification) {
  return employeeOrderIdFromActionUrl(asNullableString(notification['actionUrl'])) ??
      asNullableInt(notification['relatedOrderId']) ??
      asNullableInt(notification['orderId']);
}

String? employeeAssignedShipperSummary(JsonMap order) {
  final shipperName = asNullableString(order['deliveringShipperName'])?.trim();
  final shipperId = asNullableInt(order['deliveringShipperId']);
  final identity = shipperName != null && shipperName.isNotEmpty
      ? shipperId == null
          ? shipperName
          : '$shipperName (#$shipperId)'
      : shipperId == null
          ? null
          : 'Shipper #$shipperId';
  final status = asString(order['status']).trim().toUpperCase();

  if (identity == null) {
    return status == 'READY_FOR_SHIPPER' ? 'Chua co shipper duoc assign' : null;
  }

  return switch (status) {
    'READY_FOR_SHIPPER' => 'Shipper duoc assign: $identity',
    'OUT_FOR_DELIVERY' => 'Shipper dang giao: $identity',
    'COMPLETED' => 'Shipper da giao xong: $identity',
    _ => 'Shipper phu trach: $identity',
  };
}
