# Mobile Order QR Note

Updated on 2026-04-11.

Purpose: this file is the mobile handoff for invoice QR scanning.

## 1. Roles That Can Scan

All active roles can scan the same order QR:
- `USER`
- `MANAGER`
- `SHIPPER`
- `ADMIN`

Important:
- `STAFF` is no longer an active role.
- The preparing step now belongs to `MANAGER`.

## 2. Main Endpoint

```http
GET /api/mobile/order-qr/{token}
Authorization: Bearer <accessToken>
```

Response shape:
- `resolvedRole`
- `targetScreen`
- `actionExecuted`
- `message`
- `executedAction`
- `claimedByUserId`
- `claimedByUserName`
- `claimedByUserRole`
- `order`

## 3. QR Source

Invoice QR now points to a public entry route:

```http
GET /api/public/order-qr-entry/{token}
```

Behavior:
- browser entry page tries to open mobile deep link first
- if app does not open, it falls back to public invoice HTML
- invoice page no longer prints raw token or full secret URL visibly

Default deep link base:

```properties
app.mobile.order-qr-deep-link-base=teamatcha://order-qr/
```

## 4. Role Behavior

### `USER`

- Backend verifies the order belongs to the logged-in user
- No internal claim action is executed
- Response returns:
  - `targetScreen = USER_ORDER_STATUS`
  - full `order`
- Mobile should open order status/detail directly

### `MANAGER`

- Backend checks the order belongs to manager `workingStoreId`
- Backend tries to auto-claim the preparing step
- If valid:
  - `executedAction = ACCEPT_PREPARING`
  - `actionExecuted = true`
  - order becomes `PREPARING`
- If not valid:
  - `actionExecuted = false`
  - `message` explains the reason
- Mobile should still open employee/admin order detail with returned `order`

### `SHIPPER`

- Backend checks the order belongs to shipper `workingStoreId`
- Backend tries to auto-claim the delivery step
- If valid:
  - `executedAction = ACCEPT_DELIVERY`
  - `actionExecuted = true`
  - order becomes `OUT_FOR_DELIVERY`
- If not valid:
  - `actionExecuted = false`
  - `message` explains the reason
- Mobile should open employee order detail with returned `order`

### `ADMIN`

- Backend loads the order in viewer mode
- No auto-claim action is executed
- Current QR flow keeps `VIEW_INVOICE` only
- Mobile should open admin order detail in view mode

## 5. Mobile UI Rules

- Always trust:
  - `targetScreen`
  - `message`
  - `actionExecuted`
  - `executedAction`
  - `order.allowedActions`
- If user is not logged in:
  - keep the scanned token
  - login first
  - continue the same QR flow after login
- Render order progress in this order:
  - `confirmedByUserName`
  - `preparingStaffName`
  - `deliveringShipperName`

Important legacy note:
- `preparingStaffId` and `preparingStaffName` still exist in `OrderResponse`
- those fields now refer to the assigned `MANAGER`

## 6. Sample Responses

### User success

```json
{
  "resolvedRole": "USER",
  "targetScreen": "USER_ORDER_STATUS",
  "actionExecuted": false,
  "message": "Order status loaded",
  "executedAction": null,
  "claimedByUserId": null,
  "claimedByUserName": null,
  "claimedByUserRole": null,
  "order": {
    "id": 22,
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "statusSummary": "Cho quan ly nhan don",
    "invoiceAvailable": true,
    "invoiceNumber": "TM-INV-00000022",
    "allowedActions": ["VIEW_INVOICE"]
  }
}
```

### Manager success

```json
{
  "resolvedRole": "MANAGER",
  "targetScreen": "EMPLOYEE_ORDER_DETAIL",
  "actionExecuted": true,
  "message": "Order claimed successfully",
  "executedAction": "ACCEPT_PREPARING",
  "claimedByUserId": 21,
  "claimedByUserName": "Manager A",
  "claimedByUserRole": "MANAGER",
  "order": {
    "id": 22,
    "status": "PREPARING",
    "paymentStatus": "PAID",
    "preparingStaffId": 21,
    "preparingStaffName": "Manager A",
    "allowedActions": ["MARK_READY", "VIEW_INVOICE"],
    "statusSummary": "Quan ly Manager A dang xu ly don"
  }
}
```

### Shipper success

```json
{
  "resolvedRole": "SHIPPER",
  "targetScreen": "EMPLOYEE_ORDER_DETAIL",
  "actionExecuted": true,
  "message": "Order claimed successfully",
  "executedAction": "ACCEPT_DELIVERY",
  "claimedByUserId": 31,
  "claimedByUserName": "Shipper B",
  "claimedByUserRole": "SHIPPER",
  "order": {
    "id": 22,
    "status": "OUT_FOR_DELIVERY",
    "paymentStatus": "PAID",
    "deliveringShipperId": 31,
    "deliveringShipperName": "Shipper B",
    "allowedActions": ["MARK_COMPLETED", "VIEW_INVOICE"],
    "statusSummary": "Shipper B dang giao hang"
  }
}
```

### Shipper invalid sequence

```json
{
  "resolvedRole": "SHIPPER",
  "targetScreen": "EMPLOYEE_ORDER_DETAIL",
  "actionExecuted": false,
  "message": "Order must be prepared by manager before shipper can accept it",
  "executedAction": null,
  "claimedByUserId": null,
  "claimedByUserName": null,
  "claimedByUserRole": null,
  "order": {
    "id": 22,
    "status": "CONFIRMED",
    "paymentStatus": "PAID"
  }
}
```

## 7. Security Notes

- `USER` can only resolve their own order through the mobile API
- `MANAGER` and `SHIPPER` must belong to the correct store
- Wrong stage or wrong role returns a clear message from backend
- QR token is opaque and backend-generated
