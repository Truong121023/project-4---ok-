# Frontend Order Invoice QR Note

Updated on 2026-04-11.

Purpose: this file is the frontend handoff for order actions, invoice rendering, and QR workflow.

## 1. What Changed

Backend now supports:
- invoice metadata inside `OrderResponse`
- printable invoice HTML for admin and user
- public invoice preview by QR token
- QR scan workflow for `MANAGER` and `SHIPPER`
- role-aware mobile QR resolution for `USER`, `MANAGER`, `SHIPPER`, `ADMIN`
- server-driven `allowedActions`

Important:
- `STAFF` role is removed.
- Preparing flow is now owned by `MANAGER`.
- Legacy fields `preparingStaffId` and `preparingStaffName` still exist, but now they represent the assigned manager.

## 2. Main Endpoints

| Method | Path | Auth | Response | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/admin/orders/{id}/confirm` | `ADMIN`, `MANAGER` | `OrderResponse` | Confirm paid order so manager can pick it up |
| `POST` | `/api/admin/orders/{id}/cancel` | `ADMIN`, `MANAGER` | `OrderResponse` | Cancel order |
| `POST` | `/api/admin/orders/{id}/mark-paid` | `ADMIN`, `MANAGER` | `OrderResponse` | Manual/COD mark as paid |
| `POST` | `/api/admin/orders/{id}/invoice/generate` | `ADMIN`, `MANAGER` | `OrderResponse` | Ensure invoice exists |
| `GET` | `/api/admin/orders/{id}/invoice` | `ADMIN`, `MANAGER` | `text/html` | Preview or download invoice |
| `GET` | `/api/admin/orders/{id}/scan-history` | `ADMIN`, `MANAGER` | `List<OrderScanAuditResponse>` | Newest first |
| `GET` | `/api/user/orders/{id}/invoice` | `USER` owner | `text/html` | Preview or download invoice |
| `GET` | `/api/public/order-qr/{token}` | public | `text/html` | Public invoice preview |
| `POST` | `/api/employee/orders/scan` | `MANAGER`, `SHIPPER` | `EmployeeOrderScanResponse` | QR claim flow |

## 3. Key OrderResponse Fields

Frontend should use these fields when rendering order progress and actions:

- `confirmedByUserId`
- `confirmedByUserName`
- `confirmedByUserRole`
- `confirmedAt`
- `preparingStaffId`
- `preparingStaffName`
- `deliveringShipperId`
- `deliveringShipperName`
- `invoiceAvailable`
- `invoiceNumber`
- `invoiceIssuedAt`
- `invoicePreviewUrl`
- `invoiceDownloadUrl`
- `orderQrToken`
- `allowedActions`
- `paidAt`

Important legacy note:
- `preparingStaffId` and `preparingStaffName` now hold the assigned `MANAGER`

## 4. allowedActions By Role

Frontend must trust `order.allowedActions`.

### `ADMIN`

Possible actions:
- `CONFIRM_ORDER`
- `CANCEL_ORDER`
- `MARK_PAID`
- `GENERATE_INVOICE`
- `VIEW_INVOICE`

### `MANAGER`

Possible actions:
- `CONFIRM_ORDER`
- `CANCEL_ORDER`
- `MARK_PAID`
- `GENERATE_INVOICE`
- `VIEW_INVOICE`
- `ACCEPT_PREPARING`
- `MARK_READY`

Manager preparing rules:
- `ACCEPT_PREPARING` when:
  - order belongs to manager `workingStoreId`
  - `paymentStatus=PAID`
  - `status=CONFIRMED`
  - no other manager has claimed it, or already claimed by self
- `MARK_READY` when:
  - order belongs to manager `workingStoreId`
  - `paymentStatus=PAID`
  - `status=PREPARING`
  - current manager is the assigned preparing actor

### `SHIPPER`

Possible actions:
- `ACCEPT_DELIVERY`
- `MARK_COMPLETED`
- `VIEW_INVOICE`

### `USER`

Possible actions:
- `REFRESH_PAYMENT`
- `VIEW_INVOICE`

## 5. Timeline Rendering Rule

Render order progress actors in this order:
1. `confirmedByUserName`
2. `preparingStaffName`
3. `deliveringShipperName`

Do not rename fields in frontend contract yet.
Only change the label shown in UI:
- `preparingStaffName` should display as the manager handling preparation

## 6. Samples

### OrderResponse after manager accepted preparing

```json
{
  "id": 22,
  "status": "PREPARING",
  "paymentStatus": "PAID",
  "confirmedByUserId": 5,
  "confirmedByUserName": "Store Manager",
  "confirmedByUserRole": "MANAGER",
  "confirmedAt": "2026-03-30T10:18:00Z",
  "preparingStaffId": 21,
  "preparingStaffName": "Manager A",
  "deliveringShipperId": null,
  "deliveringShipperName": null,
  "invoiceAvailable": true,
  "invoiceNumber": "TM-INV-00000022",
  "allowedActions": ["MARK_READY", "VIEW_INVOICE"],
  "statusSummary": "Quan ly Manager A dang xu ly don"
}
```

### Employee scan request

Manager claim preparing:

```json
{
  "qrToken": "qr_tok_abc",
  "action": "ACCEPT_PREPARING"
}
```

Shipper claim delivery:

```json
{
  "qrToken": "qr_tok_abc",
  "action": "ACCEPT_DELIVERY"
}
```

### Employee scan success response

```json
{
  "success": true,
  "message": "Order claimed successfully",
  "claimedByUserId": 21,
  "claimedByUserName": "Manager A",
  "claimedByUserRole": "MANAGER",
  "order": {
    "id": 22,
    "status": "PREPARING",
    "paymentStatus": "PAID",
    "preparingStaffId": 21,
    "preparingStaffName": "Manager A",
    "allowedActions": ["MARK_READY", "VIEW_INVOICE"]
  }
}
```

### Employee scan failure response

```json
{
  "success": false,
  "message": "Order must be prepared by manager before shipper can accept it",
  "claimedByUserId": null,
  "claimedByUserName": null,
  "claimedByUserRole": null,
  "order": {
    "id": 22,
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "allowedActions": ["VIEW_INVOICE"]
  }
}
```

### Admin scan history item

```json
{
  "id": 5,
  "orderId": 22,
  "scannedByUserId": 21,
  "scannedByUserName": "Manager A",
  "role": "MANAGER",
  "action": "ACCEPT_PREPARING",
  "scannedAt": "2026-03-30T10:20:00Z",
  "success": true,
  "failureReason": null
}
```

## 7. Frontend Rendering Rules

- Prefer `allowedActions.includes(...)` for buttons
- Use `invoicePreviewUrl` and `invoiceDownloadUrl` to open invoice
- Use `orderQrToken` only as data, not as visible text
- For employee screens:
  - `MANAGER` handles preparing
  - `SHIPPER` handles delivery
- For labels, show:
  - `Manager preparing`
  - `Shipper delivering`
  instead of older `staff` wording
