# Frontend Order Invoice QR Note

Updated on 2026-03-30.

Purpose: this file is a frontend handoff note for the new order, invoice, and QR workflow.
Use this together with:
- `FRONTEND_ROLE_API_NOTE.md`
- `FRONTEND_ADMIN_API.md`
- `FRONTEND_USER_API.md`

## 1. What Changed

Backend now supports:
- invoice metadata directly inside `OrderResponse`
- printable invoice HTML for admin and user
- public invoice preview by QR token
- QR scan workflow for `STAFF` and `SHIPPER`
- server-driven `allowedActions` so frontend does not need to hardcode all action rules

Important frontend rule:
- Always render action buttons from `order.allowedActions`
- Do not infer workflow only from `status`

## 2. New And Updated Endpoints

| Method | Path | Auth | Body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/admin/orders/{id}/confirm` | `ADMIN`, `MANAGER` | none | `OrderResponse` | Confirm paid order so staff can pick it up |
| `POST` | `/api/admin/orders/{id}/cancel` | `ADMIN`, `MANAGER` | none | `OrderResponse` | Cancel order |
| `POST` | `/api/admin/orders/{id}/mark-paid` | `ADMIN`, `MANAGER` | none | `OrderResponse` | Manual/COD mark as paid |
| `POST` | `/api/admin/orders/{id}/invoice/generate` | `ADMIN`, `MANAGER` | none | `OrderResponse` | Idempotent helper to ensure invoice exists |
| `GET` | `/api/admin/orders/{id}/invoice` | `ADMIN`, `MANAGER` | query: `download` | `text/html` | Invoice preview or download |
| `GET` | `/api/admin/orders/{id}/scan-history` | `ADMIN`, `MANAGER` | none | `List<OrderScanAuditResponse>` | Newest first |
| `GET` | `/api/user/orders/{id}/invoice` | `USER` owner only | query: `download` | `text/html` | User invoice preview or download |
| `GET` | `/api/public/order-qr/{token}` | public | query: `download` | `text/html` | Open invoice from QR |
| `POST` | `/api/employee/orders/scan` | `STAFF`, `SHIPPER` | `EmployeeOrderScanRequest` | `EmployeeOrderScanResponse` | QR claim flow |

Existing order detail/list APIs now return richer `OrderResponse`:
- `GET /api/admin/orders`
- `GET /api/admin/orders/{id}`
- `GET /api/user/orders`
- `GET /api/user/orders/{id}`
- `GET /api/employee/orders`
- `GET /api/employee/orders/{id}`
- `POST /api/user/orders/{id}/refresh-payment`

## 3. New Fields In OrderResponse

These fields are now included in `OrderResponse`:

- `invoiceAvailable`: `boolean`
- `invoiceId`: `Long`
- `invoiceNumber`: `String`
- `invoiceIssuedAt`: `Instant`
- `invoiceDownloadUrl`: `String`
- `invoicePreviewUrl`: `String`
- `orderQrToken`: `String`
- `allowedActions`: `List<OrderAllowedAction>`
- `preparingStaffId`: `Long`
- `preparingStaffName`: `String`
- `deliveringShipperId`: `Long`
- `deliveringShipperName`: `String`
- `paidAt`: `Instant`

Notes:
- `invoiceId` currently equals `order.id` when invoice exists.
- `invoicePreviewUrl` and `invoiceDownloadUrl` are the easiest fields for web frontend to open directly.
- `orderQrToken` is the QR token backing the public invoice route.

### OrderResponse sample

```json
{
  "id": 22,
  "userId": 7,
  "storeId": 1,
  "storeSlug": "tea-house-q1",
  "storeName": "Tea House Q1",
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "paymentProvider": "PAYOS",
  "payosOrderCode": 220001,
  "paymentLinkId": "payos_link_123",
  "paymentCheckoutUrl": "https://pay.payos.vn/web/abc",
  "paymentQrCode": "000201010212...",
  "paymentExpiresAt": "2026-03-30T12:34:56Z",
  "paidAt": "2026-03-30T10:15:00Z",
  "subtotalAmount": 180000,
  "discountAmount": 20000,
  "totalAmount": 160000,
  "deliveryType": "DELIVERY",
  "preparingStaffId": null,
  "preparingStaffName": null,
  "deliveringShipperId": null,
  "deliveringShipperName": null,
  "invoiceAvailable": true,
  "invoiceId": 22,
  "invoiceNumber": "TM-INV-00000022",
  "invoiceIssuedAt": "2026-03-30T10:15:00Z",
  "invoiceDownloadUrl": "/api/public/order-qr/qr_tok_abc?download=true",
  "invoicePreviewUrl": "/api/public/order-qr/qr_tok_abc",
  "orderQrToken": "qr_tok_abc",
  "allowedActions": ["VIEW_INVOICE", "ACCEPT_PREPARING"],
  "statusSummary": "CONFIRMED",
  "items": [
    {
      "id": 91,
      "storeId": 1,
      "storeSlug": "tea-house-q1",
      "storeName": "Tea House Q1",
      "dishId": 88,
      "dishName": "Matcha Latte",
      "quantity": 2,
      "unitPrice": 90000,
      "totalPrice": 180000,
      "imagePaths": ["/uploads/dishes/matcha-latte.jpg"],
      "createdAt": "2026-03-30T10:10:00Z",
      "updatedAt": "2026-03-30T10:10:00Z"
    }
  ],
  "createdAt": "2026-03-30T10:10:00Z",
  "updatedAt": "2026-03-30T10:15:00Z"
}
```

## 4. allowedActions By Role

Frontend should trust `allowedActions` from backend.

### `ADMIN` and `MANAGER`

Possible actions:
- `CONFIRM_ORDER`
- `CANCEL_ORDER`
- `MARK_PAID`
- `GENERATE_INVOICE`
- `VIEW_INVOICE`

Current rules:
- `CONFIRM_ORDER`: only when `paymentStatus=PAID` and `status=PENDING`
- `CANCEL_ORDER`: when order is not `CANCELLED` and not `COMPLETED`
- `MARK_PAID`: when order is not paid yet and not cancelled
- `GENERATE_INVOICE`: when order is paid, not cancelled, and invoice does not exist yet
- `VIEW_INVOICE`: when invoice already exists

### `STAFF`

Possible actions:
- `ACCEPT_PREPARING`
- `MARK_READY`
- `VIEW_INVOICE`

Current rules:
- `ACCEPT_PREPARING`: only when:
  - order belongs to staff's `workingStoreId`
  - `paymentStatus=PAID`
  - `status=CONFIRMED`
  - no other staff has claimed it, or already claimed by self
- `MARK_READY`: only when:
  - order belongs to staff's `workingStoreId`
  - `paymentStatus=PAID`
  - `status=PREPARING`
  - order is claimed by that same staff

### `SHIPPER`

Possible actions:
- `ACCEPT_DELIVERY`
- `MARK_COMPLETED`
- `VIEW_INVOICE`

Current rules:
- `ACCEPT_DELIVERY`: only when:
  - order belongs to shipper's `workingStoreId`
  - `paymentStatus=PAID`
  - `status=READY_FOR_SHIPPER`
  - no other shipper has claimed it, or already claimed by self
- `MARK_COMPLETED`: only when:
  - order belongs to shipper's `workingStoreId`
  - `paymentStatus=PAID`
  - `status=OUT_FOR_DELIVERY`
  - order is claimed by that same shipper

### `USER`

Possible actions:
- `REFRESH_PAYMENT`
- `VIEW_INVOICE`

Current rules:
- `REFRESH_PAYMENT`: only when:
  - order belongs to current user
  - order is not paid yet
  - order is not cancelled
- `VIEW_INVOICE`: only when invoice exists

## 5. Request And Response Samples

### 5.1 Admin confirm order

Request:

```http
POST /api/admin/orders/22/confirm
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "id": 22,
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "allowedActions": ["CANCEL_ORDER", "VIEW_INVOICE"],
  "invoiceAvailable": true,
  "invoiceNumber": "TM-INV-00000022",
  "preparingStaffId": null,
  "preparingStaffName": null
}
```

### 5.2 Admin mark paid

Request:

```http
POST /api/admin/orders/22/mark-paid
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "id": 22,
  "status": "PENDING",
  "paymentStatus": "PAID",
  "paidAt": "2026-03-30T10:15:00Z",
  "invoiceAvailable": true,
  "invoiceNumber": "TM-INV-00000022",
  "allowedActions": ["CONFIRM_ORDER", "CANCEL_ORDER", "VIEW_INVOICE"]
}
```

### 5.3 Admin generate invoice

Request:

```http
POST /api/admin/orders/22/invoice/generate
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "id": 22,
  "invoiceAvailable": true,
  "invoiceId": 22,
  "invoiceNumber": "TM-INV-00000022",
  "invoiceIssuedAt": "2026-03-30T10:15:00Z",
  "invoicePreviewUrl": "/api/public/order-qr/qr_tok_abc",
  "invoiceDownloadUrl": "/api/public/order-qr/qr_tok_abc?download=true",
  "orderQrToken": "qr_tok_abc",
  "allowedActions": ["CANCEL_ORDER", "VIEW_INVOICE"]
}
```

### 5.4 Admin or user open invoice HTML

Admin preview:

```http
GET /api/admin/orders/22/invoice
Authorization: Bearer <accessToken>
```

User preview:

```http
GET /api/user/orders/22/invoice
Authorization: Bearer <accessToken>
```

Public QR preview:

```http
GET /api/public/order-qr/qr_tok_abc
```

Download variant:

```http
GET /api/public/order-qr/qr_tok_abc?download=true
```

Response:
- `Content-Type: text/html`
- Body is printable invoice HTML

### 5.5 Employee scan request

Staff claim preparing:

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

### 5.6 Employee scan success response

```json
{
  "success": true,
  "message": "Order claimed successfully",
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
    "invoiceAvailable": true,
    "invoiceNumber": "TM-INV-00000022"
  }
}
```

### 5.7 Employee scan failure response

Important:
- This endpoint may still return HTTP `200`
- Frontend must check `success`

Example invalid sequence:

```json
{
  "success": false,
  "message": "Order must be prepared by staff before shipper can accept it",
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

Example invalid QR:

```json
{
  "success": false,
  "message": "Invoice QR is invalid or expired",
  "order": null,
  "claimedByUserId": null,
  "claimedByUserName": null,
  "claimedByUserRole": null
}
```

### 5.8 Admin scan history response

```json
[
  {
    "id": 5,
    "orderId": 22,
    "scannedByUserId": 21,
    "scannedByUserName": "Staff A",
    "role": "STAFF",
    "action": "ACCEPT_PREPARING",
    "scannedAt": "2026-03-30T10:20:00Z",
    "success": true,
    "failureReason": null
  },
  {
    "id": 4,
    "orderId": 22,
    "scannedByUserId": 31,
    "scannedByUserName": "Shipper B",
    "role": "SHIPPER",
    "action": "ACCEPT_DELIVERY",
    "scannedAt": "2026-03-30T10:18:00Z",
    "success": false,
    "failureReason": "Order must be prepared by staff before shipper can accept it"
  }
]
```

## 6. Frontend Rendering Notes

- Prefer `allowedActions.includes(...)` to decide which buttons to show.
- For invoice open/print buttons, use `invoicePreviewUrl` or `invoiceDownloadUrl`.
- For QR pages on mobile/web, `orderQrToken` can be converted into:
  - preview: `/api/public/order-qr/{orderQrToken}`
  - download: `/api/public/order-qr/{orderQrToken}?download=true`
- `POST /api/employee/orders/scan` should show `response.message` even when HTTP status is `200`.
- `GET /api/public/order-qr/{token}` is safe for end-user viewing and does not expose internal assignment actions.

## 7. Recommended Frontend Button Mapping

- `CONFIRM_ORDER` -> button: `Confirm order`
- `CANCEL_ORDER` -> button: `Cancel order`
- `MARK_PAID` -> button: `Mark paid`
- `GENERATE_INVOICE` -> button: `Generate invoice`
- `VIEW_INVOICE` -> button: `View invoice`
- `ACCEPT_PREPARING` -> button: `Accept preparing`
- `MARK_READY` -> button: `Mark ready for shipper`
- `ACCEPT_DELIVERY` -> button: `Accept delivery`
- `MARK_COMPLETED` -> button: `Mark completed`
- `REFRESH_PAYMENT` -> button: `Create new PayOS payment`

