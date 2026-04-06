# Frontend Fix Handoff 2026-04-04

Updated on 2026-04-04.

Purpose: this file is a short frontend handoff note for the latest backend changes that frontend should adjust now.

Use this together with:
- `FRONTEND_ROLE_API_NOTE.md`
- `FRONTEND_ORDER_INVOICE_QR_NOTE.md`
- `MOBILE_ORDER_QR_NOTE.md`

## 1. Manager Notification Center

Backend now supports manager/admin notifications through a dedicated admin-style notification API.

### New endpoints

- `GET /api/admin/notifications`
- `GET /api/admin/notifications/unread-count`
- `PUT /api/admin/notifications/{id}/read`
- `PUT /api/admin/notifications/{id}/unread`
- `PUT /api/admin/notifications/read-all`

### Frontend change

- manager panel should use `/api/admin/notifications` for its notification center
- do not rely only on `/api/employee/notifications` for manager UI anymore
- unread badge for manager should come from `/api/admin/notifications/unread-count`

### New manager behavior

- when a new order is created in the manager's `workingStoreId`, manager now receives a notification
- notification links to:
  - `/admin/orders/{id}`

### Notification response shape

Manager notifications use the normal `UserNotificationResponse` shape:

```json
{
  "id": 101,
  "type": "ORDER_STATUS",
  "title": "Don hang moi tai Tea House Q1",
  "message": "Khach vua tao don hang #701 tai Tea House Q1. Don hang da thanh toan va dang cho cua hang xu ly.",
  "relatedOrderId": 701,
  "orderId": 701,
  "relatedStoreId": 1,
  "relatedStoreName": "Tea House Q1",
  "actionUrl": "/admin/orders/701",
  "read": false,
  "readAt": null,
  "createdAt": "2026-04-04T09:15:00Z",
  "updatedAt": "2026-04-04T09:15:00Z"
}
```

## 2. QR Scan Flow Changed By Role

All roles can now scan invoice QR.

### `USER`

- app calls `GET /api/mobile/order-qr/{token}`
- backend returns:
  - `targetScreen = USER_ORDER_STATUS`
- user only views own order

### `STAFF`

- app calls `GET /api/mobile/order-qr/{token}`
- backend auto-claims preparing if valid
- order becomes `PREPARING`

### `SHIPPER`

- app calls `GET /api/mobile/order-qr/{token}`
- backend auto-claims delivery if valid
- order becomes `OUT_FOR_DELIVERY`

### `MANAGER`

- app calls `GET /api/mobile/order-qr/{token}`
- backend does not auto-claim kitchen or delivery
- backend returns order detail for manager confirmation flow
- in QR flow, `allowedActions` is limited to:
  - `CONFIRM_ORDER`
  - `VIEW_INVOICE`

### `ADMIN`

- app calls `GET /api/mobile/order-qr/{token}`
- backend returns order detail in viewer mode
- in QR flow, `allowedActions` is limited to:
  - `VIEW_INVOICE`

### Frontend change

- mobile/web must trust `order.allowedActions`
- do not assume admin scan can do all admin actions
- do not assume only `STAFF` and `SHIPPER` can open QR routes

## 3. Order Timeline Now Has Confirm Actor

Backend now returns who confirmed the order before staff and shipper processing.

### New `OrderResponse` fields

- `confirmedByUserId`
- `confirmedByUserName`
- `confirmedByUserRole`
- `confirmedAt`

### Existing actor fields still used

- `preparingStaffId`
- `preparingStaffName`
- `deliveringShipperId`
- `deliveringShipperName`

### Frontend change

Order processing timeline should render actors in this order:
1. manager/admin confirmation actor from `confirmedByUserName`
2. staff actor from `preparingStaffName`
3. shipper actor from `deliveringShipperName`

### Example order snippet

```json
{
  "id": 701,
  "status": "OUT_FOR_DELIVERY",
  "confirmedByUserId": 5,
  "confirmedByUserName": "Store Manager",
  "confirmedByUserRole": "MANAGER",
  "confirmedAt": "2026-04-04T09:20:00Z",
  "preparingStaffId": 21,
  "preparingStaffName": "Staff A",
  "deliveringShipperId": 31,
  "deliveringShipperName": "Shipper B",
  "statusSummary": "Shipper B dang giao hang"
}
```

## 4. Delivery Proof Support For Shipper

Backend now supports delivery proof upload before complete delivery.

### New endpoint

```http
POST /api/employee/orders/{id}/delivery-proof
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Multipart fields:
- `file`
- optional `capturedAt`
- optional `note`

### Success response

```json
{
  "message": "Delivery proof uploaded successfully",
  "orderId": 701,
  "imagePath": "/uploads/delivery-proofs/order-701-proof.jpg",
  "capturedAt": "2026-04-04T10:25:00Z",
  "note": "Delivered to apartment lobby",
  "uploadedAt": "2026-04-04T10:30:00Z"
}
```

### New `OrderResponse` fields

- `deliveryProofImagePath`
- `deliveryProofCapturedAt`
- `deliveryProofUploadedAt`
- `deliveryProofNote`

### Frontend change

- shipper app should upload proof before calling `POST /api/employee/orders/{id}/complete-delivery`
- completed order detail can now render proof from server instead of only local device storage

## 5. Frontend Checklist

- manager admin panel:
  - switch notification center to `/api/admin/notifications`
  - show unread count from `/api/admin/notifications/unread-count`
- order detail and order list:
  - read and render `confirmedByUserName` and `confirmedAt`
  - keep rendering `preparingStaffName` and `deliveringShipperName`
- processing timeline:
  - show confirmation actor first
  - then staff
  - then shipper
- QR flow:
  - support `USER`, `STAFF`, `SHIPPER`, `MANAGER`, `ADMIN`
  - trust `targetScreen` and `allowedActions`
- shipper app:
  - upload proof through `/api/employee/orders/{id}/delivery-proof`
  - then complete delivery

## 6. Short Conclusion

Frontend mainly needs to update 4 areas:
- manager notifications
- QR flow by role
- order processing timeline with confirm actor
- shipper delivery proof upload and display
