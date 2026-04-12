# Frontend Shipper Auto Assign Note

Updated on 2026-04-12.

Purpose: this file is the frontend handoff for the employee order workflow after shipper auto-assignment was added.

## 1. What Changed

Backend behavior changed at the manager handoff step:

- when a manager marks an order ready for shipper, backend now tries to auto-assign `1` random idle shipper in the same `workingStore`
- "idle shipper" currently means:
  - role = `SHIPPER`
  - `enabled = true`
  - `workingStoreId` matches the order store
  - shipper has `0` orders in `OUT_FOR_DELIVERY`
- if an idle shipper is found:
  - `deliveringShipperId` and `deliveringShipperName` are filled immediately in `OrderResponse`
  - only that assigned shipper receives the employee task notification
- if no idle shipper is found:
  - order still becomes `READY_FOR_SHIPPER`
  - backend falls back to notifying shipper users in that store
- shipper still must follow the normal flow after assignment:
  - receive notification
  - open order detail
  - scan QR or call accept-delivery
  - upload delivery proof
  - complete delivery

Important:

- no new API endpoint was added
- the main behavior change is on existing endpoint `POST /api/employee/orders/{id}/mark-ready`
- frontend should now expect `deliveringShipperId` and `deliveringShipperName` to already be present at `READY_FOR_SHIPPER`

## 2. Workflow Summary

### End-to-end order flow

1. User checks out and pays.
2. Store/admin marks payment paid if needed.
3. Store confirms order.
4. Manager accepts preparing.
5. Manager marks order ready for shipper.
6. Backend auto-assigns one idle shipper from the same store if available.
7. Assigned shipper receives `ORDER_TASK` notification.
8. Shipper opens order, scans QR or accepts delivery.
9. Shipper uploads delivery proof while order is out for delivery.
10. Shipper completes delivery.

### Order status transitions

```text
PENDING + PAID
-> CONFIRMED
-> PREPARING
-> READY_FOR_SHIPPER
-> OUT_FOR_DELIVERY
-> COMPLETED
```

## 3. Frontend Rules

- Always trust `order.allowedActions`.
- Do not hard-code delivery buttons from role/status only.
- At `READY_FOR_SHIPPER`, render assigned shipper info from:
  - `deliveringShipperId`
  - `deliveringShipperName`
- If current employee is a shipper and `allowedActions` does not contain `ACCEPT_DELIVERY`, hide or disable the receive/claim button.
- Notification center should deep-link employee notifications to `/employee/orders/{id}` using `actionUrl`.
- Shipper assignment does not replace QR scan flow. The scan flow still works and must remain in frontend/mobile.

## 4. Common Response Shapes

### PageResponse<T>

```json
{
  "items": [],
  "page": 0,
  "size": 10,
  "totalItems": 1,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false
}
```

### OrderResponse

These endpoints return either `OrderResponse` or `PageResponse<OrderResponse>`.

```json
{
  "id": 22,
  "userId": 7,
  "storeId": 3,
  "storeSlug": "district-1-tea-matcha",
  "storeName": "District 1 Tea Matcha",
  "status": "READY_FOR_SHIPPER",
  "paymentStatus": "PAID",
  "paymentProvider": "PAYOS",
  "payosOrderCode": 123456,
  "paymentLinkId": "plink-123",
  "paymentCheckoutUrl": null,
  "paymentQrCode": null,
  "paymentExpiresAt": null,
  "paidAt": "2026-04-12T10:00:00Z",
  "paymentReference": "plink-123",
  "subtotalAmount": 65000,
  "discountAmount": 0,
  "totalAmount": 65000,
  "promotionCode": null,
  "promotionScope": null,
  "promotionEligibleAmount": null,
  "promotionDishIds": [],
  "deliveryType": "IMMEDIATE",
  "scheduledDeliveryAt": null,
  "deliveryFullName": "Nguyen Van A",
  "deliveryPhoneNumber": "0901234567",
  "deliveryAddress": "12 Nguyen Hue, Quan 1, TP HCM",
  "confirmedByUserId": 11,
  "confirmedByUserName": "Store Manager",
  "confirmedByUserRole": "MANAGER",
  "confirmedAt": "2026-04-12T10:05:00Z",
  "preparingStaffId": 12,
  "preparingStaffName": "Manager A",
  "deliveringShipperId": 21,
  "deliveringShipperName": "Shipper B",
  "invoiceAvailable": true,
  "invoiceId": 90,
  "invoiceNumber": "TM-INV-00000022",
  "invoiceIssuedAt": "2026-04-12T10:00:00Z",
  "invoiceDownloadUrl": "/api/public/order-qr/abc?download=true",
  "invoicePreviewUrl": "/api/public/order-qr/abc",
  "orderQrToken": "abc",
  "deliveryProofImagePath": null,
  "deliveryProofCapturedAt": null,
  "deliveryProofUploadedAt": null,
  "deliveryProofNote": null,
  "allowedActions": ["ACCEPT_DELIVERY", "VIEW_INVOICE"],
  "statusSummary": "Manager A da lam xong - cho shipper",
  "items": [],
  "createdAt": "2026-04-12T09:55:00Z",
  "updatedAt": "2026-04-12T10:10:00Z"
}
```

Important fields for this change:

- `deliveringShipperId`
- `deliveringShipperName`
- `allowedActions`
- `status`
- `paymentStatus`
- `statusSummary`

### UserNotificationResponse

Employee notification APIs return `UserNotificationResponse` or `PageResponse<UserNotificationResponse>`.

```json
{
  "id": 15,
  "type": "ORDER_TASK",
  "title": "Don hang san sang giao #22",
  "message": "Don hang #22 tai District 1 Tea Matcha da duoc lam xong. Vui long den quay nhan don va giao den khach.",
  "relatedOrderId": 22,
  "orderId": 22,
  "relatedEventId": null,
  "eventId": null,
  "relatedEventSlug": null,
  "eventSlug": null,
  "relatedNewsId": null,
  "newsId": null,
  "relatedNewsSlug": null,
  "newsSlug": null,
  "relatedStoreId": 3,
  "relatedStoreName": "District 1 Tea Matcha",
  "actionUrl": "/employee/orders/22",
  "read": false,
  "readAt": null,
  "createdAt": "2026-04-12T10:11:00Z",
  "updatedAt": "2026-04-12T10:11:00Z"
}
```

### UserNotificationUnreadCountResponse

```json
{
  "unreadCount": 1
}
```

### EmployeeOrderScanResponse

```json
{
  "success": true,
  "message": "Order claimed successfully",
  "order": {
    "id": 22,
    "status": "OUT_FOR_DELIVERY"
  },
  "claimedByUserId": 21,
  "claimedByUserName": "Shipper B",
  "claimedByUserRole": "SHIPPER"
}
```

### MobileOrderQrResolveResponse

```json
{
  "resolvedRole": "SHIPPER",
  "targetScreen": "EMPLOYEE_ORDER_DETAIL",
  "actionExecuted": true,
  "message": "Order claimed successfully",
  "executedAction": "ACCEPT_DELIVERY",
  "claimedByUserId": 21,
  "claimedByUserName": "Shipper B",
  "claimedByUserRole": "SHIPPER",
  "order": {
    "id": 22,
    "status": "OUT_FOR_DELIVERY"
  }
}
```

### DeliveryProofUploadResponse

```json
{
  "message": "Delivery proof uploaded successfully",
  "orderId": 22,
  "imagePath": "/uploads/delivery-proofs/proof-22.jpg",
  "capturedAt": "2026-04-12T10:20:00Z",
  "note": "Customer received at front desk",
  "uploadedAt": "2026-04-12T10:20:05Z"
}
```

## 5. Store/Admin APIs Before Employee Flow

These APIs are important because employee flow only starts on paid orders.

### 5.1 Mark payment status

#### Request

```http
PUT /api/admin/orders/{id}/status
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "paymentStatus": "PAID"
}
```

#### Purpose

- mark a store order as `PAID`
- required before confirm/preparing/delivery workflow

#### Constraints

- auth role: `ADMIN` or `MANAGER`
- only `paymentStatus = PENDING | PAID` can be updated manually
- this endpoint does **not** auto-confirm the order
- after `paymentStatus = PAID`, status stays `PENDING`

#### Success response

Returns full `OrderResponse`.

Important expected values:

```json
{
  "status": "PENDING",
  "paymentStatus": "PAID",
  "statusSummary": "Cho cua hang xac nhan"
}
```

### 5.2 Confirm order

#### Request

```http
POST /api/admin/orders/{id}/confirm
Authorization: Bearer <token>
```

No request body.

#### Purpose

- confirm a paid order so it can enter manager preparation workflow

#### Constraints

- auth role: `ADMIN` or `MANAGER`
- order must be `paymentStatus = PAID`
- order must be `status = PENDING`

#### Success response

Returns full `OrderResponse`.

Important expected values:

```json
{
  "status": "CONFIRMED",
  "confirmedByUserId": 11,
  "confirmedByUserName": "Store Manager",
  "confirmedByUserRole": "MANAGER",
  "statusSummary": "Store Manager da xac nhan don - cho quan ly nhan don"
}
```

## 6. Employee Order APIs

Base path:

```http
/api/employee/orders
```

Auth role:

- `MANAGER`
- `SHIPPER`

Common constraints:

- employee account must be enabled
- employee account must have `workingStore`
- order must belong to employee `workingStore`
- only paid orders are available for employee workflow

### 6.1 List employee orders

#### Request

```http
GET /api/employee/orders?mine=false&search=&page=0&size=10
Authorization: Bearer <token>
```

#### Query params

- `mine`: optional boolean
- `search`: optional string
- `page`: optional, default `0`
- `size`: optional, default `10`

#### Purpose

- manager:
  - with `mine=false`: see `CONFIRMED` orders available to claim and own `PREPARING` orders
  - with `mine=true`: see only own `PREPARING` orders
- shipper:
  - with `mine=false`: see `READY_FOR_SHIPPER` orders assigned to self or unassigned, plus own `OUT_FOR_DELIVERY`
  - with `mine=true`: see only own `OUT_FOR_DELIVERY`

#### Success response

`PageResponse<OrderResponse>`

### 6.2 Get employee order detail

#### Request

```http
GET /api/employee/orders/{id}
Authorization: Bearer <token>
```

#### Purpose

- load order detail for manager or shipper

#### Success response

Full `OrderResponse`

### 6.3 Manager accepts preparing

#### Request

```http
POST /api/employee/orders/{id}/accept-preparing
Authorization: Bearer <managerToken>
```

No request body.

#### Purpose

- manager claims the preparing task

#### Constraints

- auth role must be `MANAGER`
- order must be `paymentStatus = PAID`
- order must be `CONFIRMED` or already `PREPARING`
- if another manager already claimed it, request fails

#### Success response

Returns full `OrderResponse`.

Important expected values:

```json
{
  "status": "PREPARING",
  "preparingStaffId": 12,
  "preparingStaffName": "Manager A",
  "statusSummary": "Quan ly Manager A dang xu ly don"
}
```

### 6.4 Manager marks order ready for shipper

#### Request

```http
POST /api/employee/orders/{id}/mark-ready
Authorization: Bearer <managerToken>
```

No request body.

#### Purpose

- move order from `PREPARING` to `READY_FOR_SHIPPER`
- trigger backend shipper auto-assignment
- trigger employee task notification for shipper

#### Constraints

- auth role must be `MANAGER`
- order must be `paymentStatus = PAID`
- order must be `PREPARING`
- current manager must be the assigned preparing manager

#### Backend behavior on success

- order becomes `READY_FOR_SHIPPER`
- backend tries to assign one idle shipper randomly
- if assignment succeeds:
  - `deliveringShipperId` is filled
  - `deliveringShipperName` is filled
  - notification goes to that shipper only
- if assignment fails:
  - order still stays `READY_FOR_SHIPPER`
  - notification is broadcast to shipper users in the store

#### Success response

Returns full `OrderResponse`.

Example with auto-assigned shipper:

```json
{
  "status": "READY_FOR_SHIPPER",
  "preparingStaffId": 12,
  "preparingStaffName": "Manager A",
  "deliveringShipperId": 21,
  "deliveringShipperName": "Shipper B",
  "statusSummary": "Manager A da lam xong - cho shipper"
}
```

### 6.5 Shipper accepts delivery

#### Request

```http
POST /api/employee/orders/{id}/accept-delivery
Authorization: Bearer <shipperToken>
```

No request body.

#### Purpose

- shipper claims the delivery task and starts delivery

#### Constraints

- auth role must be `SHIPPER`
- order must be `paymentStatus = PAID`
- order must be `READY_FOR_SHIPPER` or already `OUT_FOR_DELIVERY`
- if `deliveringShipperId` is already set to another shipper, request fails
- with auto-assignment enabled, only the assigned shipper should receive `ACCEPT_DELIVERY` in `allowedActions`

#### Success response

Returns full `OrderResponse`.

Important expected values:

```json
{
  "status": "OUT_FOR_DELIVERY",
  "deliveringShipperId": 21,
  "deliveringShipperName": "Shipper B",
  "statusSummary": "Shipper B dang giao hang"
}
```

### 6.6 Upload delivery proof

#### Request

```http
POST /api/employee/orders/{id}/delivery-proof
Authorization: Bearer <shipperToken>
Content-Type: multipart/form-data
```

Form fields:

- `file`: required image file
- `capturedAt`: optional ISO-8601 datetime string
- `note`: optional string

#### Purpose

- upload delivery proof while shipper is delivering the order

#### Constraints

- auth role must be `SHIPPER`
- order must be `paymentStatus = PAID`
- order must be `OUT_FOR_DELIVERY`
- current shipper must be the assigned shipper

#### Success response

`DeliveryProofUploadResponse`

### 6.7 Complete delivery

#### Request

```http
POST /api/employee/orders/{id}/complete-delivery
Authorization: Bearer <shipperToken>
```

No request body.

#### Purpose

- finish the delivery flow

#### Constraints

- auth role must be `SHIPPER`
- order must be `paymentStatus = PAID`
- order must be `OUT_FOR_DELIVERY`
- current shipper must be the assigned shipper

#### Success response

Returns full `OrderResponse`.

Important expected values:

```json
{
  "status": "COMPLETED",
  "deliveringShipperId": 21,
  "deliveringShipperName": "Shipper B",
  "statusSummary": "Shipper B da giao hang thanh cong"
}
```

## 7. Employee Notification APIs

Base path:

```http
/api/employee/notifications
```

Auth role:

- `MANAGER`
- `SHIPPER`

### 7.1 List notifications

#### Request

```http
GET /api/employee/notifications?read=false&page=0&size=10
Authorization: Bearer <token>
```

#### Query params

- `read`: optional boolean
- `page`: optional, default `0`
- `size`: optional, default `10`

#### Purpose

- load employee task notifications
- shipper should use this to receive assignment notice after manager marks order ready

#### Success response

`PageResponse<UserNotificationResponse>`

Important values for shipper assignment:

```json
{
  "type": "ORDER_TASK",
  "relatedOrderId": 22,
  "actionUrl": "/employee/orders/22",
  "message": "Don hang #22 tai District 1 Tea Matcha da duoc lam xong. Vui long den quay nhan don va giao den khach."
}
```

### 7.2 Get unread count

#### Request

```http
GET /api/employee/notifications/unread-count
Authorization: Bearer <token>
```

#### Success response

`UserNotificationUnreadCountResponse`

### 7.3 Mark notification as read

#### Request

```http
PUT /api/employee/notifications/{id}/read
Authorization: Bearer <token>
```

#### Success response

`UserNotificationResponse`

### 7.4 Mark notification as unread

#### Request

```http
PUT /api/employee/notifications/{id}/unread
Authorization: Bearer <token>
```

#### Success response

`UserNotificationResponse`

### 7.5 Mark all notifications as read

#### Request

```http
PUT /api/employee/notifications/read-all
Authorization: Bearer <token>
```

#### Success response

```json
{
  "message": "Marked 3 notification(s) as read"
}
```

## 8. QR and Scan APIs

These APIs are still required. Auto-assignment does not remove them.

### 8.1 Resolve mobile order QR

#### Request

```http
GET /api/mobile/order-qr/{token}
Authorization: Bearer <token>
```

#### Purpose

- open the correct mobile screen after scanning order QR
- manager can auto-claim preparing through this route
- shipper can auto-claim delivery through this route

#### Success response

`MobileOrderQrResolveResponse`

For shipper after assignment:

- `resolvedRole = SHIPPER`
- `targetScreen = EMPLOYEE_ORDER_DETAIL`
- if scan is valid and shipper is the assigned one:
  - `actionExecuted = true`
  - `executedAction = ACCEPT_DELIVERY`
  - order becomes `OUT_FOR_DELIVERY`

### 8.2 Employee scan endpoint

#### Request

```http
POST /api/employee/orders/scan
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "qrToken": "qr_tok_abc",
  "action": "ACCEPT_DELIVERY"
}
```

Allowed actions:

- `ACCEPT_PREPARING`
- `ACCEPT_DELIVERY`

#### Constraints

- `qrToken` is required
- `qrToken` max length = `255`
- `action` is required
- wrong role or wrong stage returns `success=false` with backend message

#### Success response

`EmployeeOrderScanResponse`

## 9. Frontend Implementation Checklist

- Update employee order detail to render assigned shipper at `READY_FOR_SHIPPER`.
- Update shipper notification UI to expect:
  - `type = ORDER_TASK`
  - `actionUrl = /employee/orders/{id}`
  - message telling shipper to go to the counter and pick up the order
- Do not assume every shipper in the store sees every ready order anymore.
- Use `allowedActions` to show:
  - manager buttons: `ACCEPT_PREPARING`, `MARK_READY`
  - shipper buttons: `ACCEPT_DELIVERY`, `MARK_COMPLETED`
- Keep QR scan entry points active for both manager and shipper.
- Keep delivery proof upload UI unchanged.

## 10. Tested Backend Scenarios

Backend tests now cover:

- manager can see store orders and progress them through the correct workflow
- manager cannot directly force operational statuses through admin status update
- paid order can flow from preparing to shipper delivery with notifications
- auto-assignment skips a busy shipper and picks an idle shipper
- user notifications still work after payment status changes without assuming auto-confirm
