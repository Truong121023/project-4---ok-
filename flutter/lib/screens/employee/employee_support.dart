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
    EmployeeRoleKind.staff => 'Nhan don da thanh toan, lam mon va ban giao cho shipper.',
    EmployeeRoleKind.shipper => 'Nhan don san sang giao, theo doi giao hang va chot hoan tat.',
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
    EmployeeRoleKind.staff => 'Cho bep nhan',
    EmployeeRoleKind.shipper => 'Cho shipper nhan',
  };
}

String employeeActiveQueueLabel(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'Dang lam',
    EmployeeRoleKind.shipper => 'Dang giao',
  };
}

String employeeCompletedQueueLabel(EmployeeRoleKind kind) {
  return switch (kind) {
    EmployeeRoleKind.staff => 'San sang ban giao',
    EmployeeRoleKind.shipper => 'Da hoan tat',
  };
}

List<JsonMap> employeePendingOrders(EmployeeRoleKind kind, List<JsonMap> orders) {
  return orders.where((order) {
    final status = asString(order['status']).toUpperCase();
    return switch (kind) {
      EmployeeRoleKind.staff => status == 'CONFIRMED',
      EmployeeRoleKind.shipper => status == 'READY_FOR_SHIPPER',
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

String? employeeActionPath(EmployeeRoleKind kind, JsonMap order, int currentUserId) {
  final status = asString(order['status']).toUpperCase();
  return switch (kind) {
    EmployeeRoleKind.staff => switch (status) {
        'CONFIRMED' => 'accept-preparing',
        'PREPARING' => (asInt(order['preparingStaffId']) == 0 || asInt(order['preparingStaffId']) == currentUserId)
            ? 'mark-ready'
            : null,
        _ => null,
      },
    EmployeeRoleKind.shipper => switch (status) {
        'READY_FOR_SHIPPER' => 'accept-delivery',
        'OUT_FOR_DELIVERY' =>
          (asInt(order['deliveringShipperId']) == 0 || asInt(order['deliveringShipperId']) == currentUserId)
              ? 'complete-delivery'
              : null,
        _ => null,
      },
  };
}

String? employeeActionLabel(EmployeeRoleKind kind, JsonMap order, int currentUserId) {
  final action = employeeActionPath(kind, order, currentUserId);
  return switch (action) {
    'accept-preparing' => 'Nhan don',
    'mark-ready' => 'Xong mon',
    'accept-delivery' => 'Nhan giao',
    'complete-delivery' => 'Hoan tat',
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
  return [paymentStatus, deliveryAddress].where((value) => value.isNotEmpty).join(' • ');
}

List<JsonMap> employeeMonthlyItems(JsonMap monthlySchedule) {
  return asObjectList<JsonMap>(
    monthlySchedule['items'],
    (json) => Map<String, dynamic>.from(json),
  );
}
