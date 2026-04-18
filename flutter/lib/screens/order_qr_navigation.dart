import 'package:flutter/material.dart';

import '../app/app_controller.dart';
import '../core/models/models.dart';
import 'mobile_role_restricted_screen.dart';
import 'employee/employee_order_detail_screen.dart';
import 'employee/employee_support.dart';
import 'order_qr_status_screen.dart';

Route<void> buildOrderQrRoute(
  AppController controller,
  MobileOrderQrResolveResponse response,
) {
  if (controller.isShipper) {
    return MaterialPageRoute<void>(
      builder: (_) => EmployeeOrderDetailScreen(
        kind: EmployeeRoleKind.shipper,
        initialOrder: response.order,
        bannerMessage: response.message,
      ),
    );
  }

  if (!controller.isUser) {
    return MaterialPageRoute<void>(
      builder: (_) => const MobileRoleRestrictedScreen(showAppBar: true),
    );
  }

  return MaterialPageRoute<void>(
    builder: (_) => OrderQrStatusScreen(
      response: response,
      viewerRole: controller.currentRole,
    ),
  );
}
