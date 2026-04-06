import 'package:flutter/material.dart';

import '../app/app_controller.dart';
import '../core/models/models.dart';
import 'employee/employee_order_detail_screen.dart';
import 'employee/employee_support.dart';
import 'order_qr_status_screen.dart';

Route<void> buildOrderQrRoute(
  AppController controller,
  MobileOrderQrResolveResponse response,
) {
  if (controller.isStaff || controller.isShipper) {
    return MaterialPageRoute<void>(
      builder: (_) => EmployeeOrderDetailScreen(
        kind: controller.isStaff ? EmployeeRoleKind.staff : EmployeeRoleKind.shipper,
        initialOrder: response.order,
        bannerMessage: response.message,
      ),
    );
  }

  final orderStoreId = asNullableInt(response.order['storeId']);
  final workingStoreId = controller.session?.user.workingStoreId;
  final allowedActions = asStringList(response.order['allowedActions']).map((action) => action.toUpperCase()).toList();
  final managerCanConfirm = controller.isManager &&
      orderStoreId != null &&
      workingStoreId != null &&
      orderStoreId == workingStoreId &&
      allowedActions.contains('CONFIRM_ORDER');

  return MaterialPageRoute<void>(
    builder: (_) => OrderQrStatusScreen(
      response: response,
      viewerRole: controller.currentRole,
      canManagerConfirm: managerCanConfirm,
      orderBelongsToWorkingStore: orderStoreId != null && workingStoreId != null && orderStoreId == workingStoreId,
      onConfirmManager: managerCanConfirm
          ? () => controller.updateAdminOrderStatus(
                orderId: asInt(response.order['id']),
                body: {'status': 'CONFIRMED'},
              )
          : null,
    ),
  );
}
