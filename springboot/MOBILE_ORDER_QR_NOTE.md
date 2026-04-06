# Mobile Order QR Note

Updated on 2026-03-31.

Purpose: this file is a handoff note for mobile teams implementing QR scan for:
- `USER`
- `STAFF`
- `SHIPPER`
- `MANAGER`
- `ADMIN`

This note reflects the backend currently running in the Tea Matcha Spring Boot project.

## 1. Quick Handoff

### `USER` scans QR

- QR opens app by deep link if possible
- Mobile calls `GET /api/mobile/order-qr/{token}`
- Backend verifies the logged-in user owns the order
- Backend returns:
  - `targetScreen = USER_ORDER_STATUS`
  - full `order`
- Mobile should open the order status/detail screen directly

### `STAFF` scans QR

- QR opens app by deep link if possible
- Mobile calls `GET /api/mobile/order-qr/{token}`
- Backend checks:
  - role is `STAFF`
  - order belongs to staff `workingStoreId`
  - order is ready for preparing pickup
- If valid, backend auto-claims the order for staff:
  - `executedAction = ACCEPT_PREPARING`
  - order status becomes `PREPARING`
- Mobile should show the returned message and open employee order detail

### `SHIPPER` scans QR

- QR opens app by deep link if possible
- Mobile calls `GET /api/mobile/order-qr/{token}`
- Backend checks:
  - role is `SHIPPER`
  - order belongs to shipper `workingStoreId`
  - order is already `READY_FOR_SHIPPER`
- If valid, backend auto-claims the order for shipper:
  - `executedAction = ACCEPT_DELIVERY`
  - order status becomes `OUT_FOR_DELIVERY`
- Mobile should show the returned message and open employee order detail

### `MANAGER` scans QR

- QR opens app by deep link if possible
- Mobile calls `GET /api/mobile/order-qr/{token}`
- Backend checks the order belongs to manager `workingStoreId`
- Backend does not auto-claim kitchen or delivery work
- Backend returns order detail for confirmation flow
- In QR flow, backend keeps only viewer and confirmation-oriented actions:
  - `CONFIRM_ORDER`
  - `VIEW_INVOICE`
- Mobile should open manager/admin order detail and render the returned `allowedActions`

### `ADMIN` scans QR

- QR opens app by deep link if possible
- Mobile calls `GET /api/mobile/order-qr/{token}`
- Backend returns order detail in viewer mode
- In QR flow, backend keeps viewer-only action:
  - `VIEW_INVOICE`
- Mobile should open order detail and show information only

### What mobile must trust from backend

- `targetScreen`
- `message`
- `actionExecuted`
- `executedAction`
- `order`
- `order.allowedActions`
- `order.confirmedByUserId`
- `order.confirmedByUserName`
- `order.confirmedByUserRole`
- `order.confirmedAt`

## 2. Main Goal

The same invoice QR should support these mobile flows:
- `USER` scans QR and jumps into mobile order status
- `STAFF` scans QR and claims preparing work if the order is ready
- `SHIPPER` scans QR and claims delivery work if the order is ready

Backend already handles role-aware resolution.

## 3. QR Behavior

The invoice now shows a real QR image.

Important:
- Backend does not print raw token or full secret URL visibly on the invoice anymore
- QR image points to a public entry page:
  - `/api/public/order-qr-entry/{token}`
- That public entry page tries to open the mobile app by deep link first
- If the app does not open, it falls back to the web invoice page

Current backend config:

```properties
app.mobile.order-qr-deep-link-base=teamatcha://order-qr/
app.mobile.public-base-url=
```

Notes:
- `app.mobile.order-qr-deep-link-base` is the deep link scheme mobile should register
- `app.mobile.public-base-url` should be set when testing on real devices if backend is not publicly reachable

Example:

```properties
app.mobile.public-base-url=https://api.example.com
```

For LAN testing:

```properties
app.mobile.public-base-url=http://192.168.1.10:8080
```

Do not use `localhost` for real phone camera tests.

## 4. What Mobile Must Implement

Mobile needs:
- deep link registration for `teamatcha://order-qr/{token}`
- QR scanner that can read either:
  - direct token
  - public invoice URL
  - public QR entry URL
- login persistence
- post-login continue flow using the same scanned token

Recommended mobile route:

```text
/order-qr/:token
```

Recommended flow:
1. User scans QR
2. App receives `token`
3. If not logged in:
   - store pending QR token locally
   - open login screen
   - after login, continue QR flow
4. If logged in:
   - call backend mobile QR API
   - route UI from backend response

## 5. Main Mobile QR API

### Endpoint

```http
GET /api/mobile/order-qr/{token}
Authorization: Bearer <accessToken>
```

### Response DTO

`MobileOrderQrResolveResponse`

- `resolvedRole`
- `targetScreen`
- `actionExecuted`
- `message`
- `executedAction`
- `claimedByUserId`
- `claimedByUserName`
- `claimedByUserRole`
- `order`

The `order` field is the normal `OrderResponse`.

## 6. Role Behavior

### `USER`

Backend behavior:
- verifies the order belongs to the current logged-in user
- does not auto-claim anything
- returns `targetScreen = USER_ORDER_STATUS`

Mobile behavior:
- open order detail/status screen directly
- use `order.status`, `order.paymentStatus`, `order.statusSummary`, `order.allowedActions`

If user scans another user's QR:
- backend returns `403`

### `STAFF`

Backend behavior:
- checks that order belongs to staff's `workingStoreId`
- tries to auto-claim preparing step
- equivalent action is `ACCEPT_PREPARING`
- if successful:
  - `actionExecuted = true`
  - `executedAction = ACCEPT_PREPARING`
  - order becomes `PREPARING`
- if not successful:
  - `actionExecuted = false`
  - `message` explains why

Mobile behavior:
- call the endpoint once
- show success or failure toast/dialog from `message`
- open employee order detail screen with returned `order`

### `SHIPPER`

Backend behavior:
- checks that order belongs to shipper's `workingStoreId`
- tries to auto-claim delivery step
- equivalent action is `ACCEPT_DELIVERY`
- if successful:
  - `actionExecuted = true`
  - `executedAction = ACCEPT_DELIVERY`
  - order becomes `OUT_FOR_DELIVERY`
- if not successful:
  - `actionExecuted = false`
  - `message` explains why

Mobile behavior:
- call the endpoint once
- show success or failure from `message`
- open employee order detail screen with returned `order`

## 7. targetScreen Values

Current backend values:
- `USER_ORDER_STATUS`
- `EMPLOYEE_ORDER_DETAIL`
- `ADMIN_ORDER_DETAIL`

For mobile app, the important ones are:
- `USER_ORDER_STATUS`
- `EMPLOYEE_ORDER_DETAIL`
- `ADMIN_ORDER_DETAIL`

## 8. Sample Response For USER

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
    "storeId": 1,
    "storeName": "Tea Matcha Rivergate Terrace",
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "statusSummary": "Cho nhan vien nhan don",
    "invoiceAvailable": true,
    "invoiceNumber": "TM-INV-00000022",
    "allowedActions": ["VIEW_INVOICE"]
  }
}
```

## 9. Sample Response For STAFF Success

```json
{
  "resolvedRole": "STAFF",
  "targetScreen": "EMPLOYEE_ORDER_DETAIL",
  "actionExecuted": true,
  "message": "Order claimed successfully",
  "executedAction": "ACCEPT_PREPARING",
  "claimedByUserId": 21,
  "claimedByUserName": "Staff A",
  "claimedByUserRole": "STAFF",
  "order": {
    "id": 22,
    "status": "PREPARING",
    "paymentStatus": "PAID",
    "preparingStaffId": 21,
    "preparingStaffName": "Staff A",
    "allowedActions": ["MARK_READY", "VIEW_INVOICE"],
    "statusSummary": "Nhan vien Staff A dang lam mon"
  }
}
```

## 10. Sample Response For SHIPPER Success

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

## 11. Sample Failure Responses

### Staff scans wrong stage

```json
{
  "resolvedRole": "STAFF",
  "targetScreen": "EMPLOYEE_ORDER_DETAIL",
  "actionExecuted": false,
  "message": "Order is not ready for staff pickup",
  "executedAction": null,
  "claimedByUserId": null,
  "claimedByUserName": null,
  "claimedByUserRole": null,
  "order": {
    "id": 22,
    "status": "PENDING",
    "paymentStatus": "PENDING"
  }
}
```

### Shipper scans before staff completed

```json
{
  "resolvedRole": "SHIPPER",
  "targetScreen": "EMPLOYEE_ORDER_DETAIL",
  "actionExecuted": false,
  "message": "Order must be prepared by staff before shipper can accept it",
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

## 12. Public Entry URL Behavior

When QR is scanned by the device camera instead of the in-app scanner:

```http
GET /api/public/order-qr-entry/{token}
```

Backend returns an HTML page that:
- tries to open `teamatcha://order-qr/{token}`
- falls back to web invoice

This is useful when:
- user scans QR from outside the app
- mobile OS opens the browser first

## 13. Security Notes

- Invoice HTML no longer shows raw token or full secret URL visibly
- The QR token is still opaque and backend-generated
- `USER` can only resolve their own order through the mobile API
- `STAFF` and `SHIPPER` must belong to the correct store
- Wrong stage or wrong role returns clear error messages

## 14. Recommended Mobile UI Logic

- If `resolvedRole = USER`, navigate to user order status screen
- If `resolvedRole = STAFF` or `SHIPPER`, navigate to employee order detail screen
- If `resolvedRole = MANAGER` or `ADMIN`, navigate to admin/manager order detail screen
- Always show `message`
- Always trust `order.allowedActions` for which buttons to render next
- Render order progress actors in this order:
  - confirmation actor from `confirmedByUserName`
  - preparing actor from `preparingStaffName`
  - delivery actor from `deliveringShipperName`
- If not logged in, keep the token and retry after login

## 15. Related Backend Files

- `src/main/java/com/example/registrationotp/controller/MobileOrderController.java`
- `src/main/java/com/example/registrationotp/controller/PublicController.java`
- `src/main/java/com/example/registrationotp/service/OrderService.java`
- `src/main/java/com/example/registrationotp/dto/MobileOrderQrResolveResponse.java`
