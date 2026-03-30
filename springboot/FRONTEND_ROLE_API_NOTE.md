# Frontend Role API Note

Updated on 2026-03-30.

Purpose: this file is a role-based note for frontend teams.
If this file conflicts with older manager notes in `FRONTEND_ADMIN_API.md`, use this file as the newer rule.

Full DTO details still live in:
- `FRONTEND_ADMIN_API.md`
- `FRONTEND_USER_API.md`
- `FRONTEND_ORDER_INVOICE_QR_NOTE.md`

## 1. Shared Login Flow

All protected APIs still use the same session token flow.

1. `POST /api/auth/login`
2. Save `accessToken`
3. Send `Authorization: Bearer <accessToken>` on protected requests
4. Call `GET /api/auth/me`
5. Read `user.role`
6. Route UI by role

### Login request sample

```json
{
  "email": "manager@example.com",
  "password": "12345678"
}
```

### Login response sample

```json
{
  "message": "Login successful",
  "tokenType": "Bearer",
  "accessToken": "f8f8a9d0c2e1411b9f3d8d5f9e10c001",
  "expiresAt": "2026-03-30T07:00:00Z",
  "user": {
    "id": 5,
    "fullName": "Store Manager",
    "email": "manager@example.com",
    "role": "MANAGER",
    "workingStoreId": 1,
    "workingStoreName": "Tea House Q1",
    "workingStoreAddress": "12 Nguyen Trai, District 1",
    "verified": true,
    "createdAt": "2026-03-23T06:00:00Z",
    "verifiedAt": "2026-03-23T06:10:00Z"
  }
}
```

### `GET /api/auth/me` response sample

```json
{
  "message": "Token is valid",
  "expiresAt": "2026-03-30T07:00:00Z",
  "user": {
    "id": 5,
    "fullName": "Store Manager",
    "email": "manager@example.com",
    "role": "MANAGER",
    "workingStoreId": 1,
    "workingStoreName": "Tea House Q1",
    "workingStoreAddress": "12 Nguyen Trai, District 1"
  }
}
```

## 2. Role Matrix

| Role | Main UI | Main permissions |
| --- | --- | --- |
| `ADMIN` | Admin dashboard | Full system access |
| `MANAGER` | Store manager panel | Store-scoped admin access at `workingStoreId` |
| `STAFF` | Employee kitchen panel | Receive `CONFIRMED` orders, prepare, complete kitchen step |
| `SHIPPER` | Employee delivery panel | Receive `READY_FOR_SHIPPER` orders, deliver, complete delivery |
| `USER` | Storefront app | Shop, checkout, review, feedback, support chat |

## 3. ADMIN

### Main functions

- Full user management, including `ADMIN`, `MANAGER`, `STAFF`, `SHIPPER`, `USER`
- Full store CRUD
- Full event/category/dish/news/store-dish CRUD
- Full order management
- Full review moderation
- Full feedback moderation
- Full promotions and user levels management
- Full work schedule publish and attendance monitoring
- Full support chat inbox across stores

### Main API groups

- Auth/session
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Dashboard
  - `GET /api/admin/dashboard`
  - `GET /api/admin/summary`
- User management
  - `GET /api/admin/users`
  - `GET /api/admin/users/{id}`
  - `POST /api/admin/users`
  - `PUT /api/admin/users/{id}`
  - `PUT /api/admin/users/{id}/verification`
  - `DELETE /api/admin/users/{id}`
- Store management
  - `GET /api/admin/stores`
  - `GET /api/admin/stores/{id}`
  - `POST /api/admin/stores`
  - `PUT /api/admin/stores/{id}`
  - `DELETE /api/admin/stores/{id}`
- Catalog/content
  - `GET|POST|PUT|DELETE /api/admin/events`
  - `GET|POST|PUT|DELETE /api/admin/categories`
  - `GET|POST|PUT|DELETE /api/admin/dishes`
  - `GET|POST|PUT|DELETE /api/admin/news`
  - `GET|POST|PUT|DELETE /api/admin/store-dishes`
  - `POST /api/admin/uploads/images`
- Orders/moderation
  - `GET /api/admin/orders`
  - `GET /api/admin/orders/{id}`
  - `PUT /api/admin/orders/{id}/status`
  - `GET /api/admin/reviews`
  - `GET /api/admin/reviews/{id}`
  - `DELETE /api/admin/reviews/{id}`
  - `GET /api/admin/feedbacks`
  - `GET /api/admin/feedbacks/{id}`
  - `GET /api/admin/feedbacks/{id}/reply`
  - `PUT /api/admin/feedbacks/{id}/reply`
  - `DELETE /api/admin/feedbacks/{id}/reply`
  - `DELETE /api/admin/feedbacks/{id}`
- Advanced admin-only
  - `GET|POST|PUT|DELETE /api/admin/promotions`
  - `GET|POST|PUT|DELETE /api/admin/user-levels`
  - `PUT /api/admin/work-schedules/monthly`
  - `GET /api/admin/work-schedules/monthly`
  - `GET /api/admin/attendances`
  - `GET /api/admin/attendances/summary`

### Admin user create sample

```json
{
  "fullName": "Staff A",
  "email": "staff@example.com",
  "password": "12345678",
  "role": "STAFF",
  "workingStoreId": 1,
  "enabled": true
}
```

### Admin store create sample

```json
{
  "name": "Tea House Q1",
  "description": "Fresh matcha drinks in District 1",
  "address": "12 Nguyen Trai, District 1",
  "contactEmail": "store@example.com",
  "phoneNumber": "0909123456",
  "slug": "tea-house-q1",
  "imagePaths": ["/uploads/stores/tea-house-q1.jpg"],
  "active": true
}
```

### Admin order update sample

```json
{
  "status": "PREPARING",
  "paymentStatus": "PAID",
  "preparingStaffId": 21,
  "deliveringShipperId": null
}
```

## 4. MANAGER

### Main functions

- Login to admin area with role `MANAGER`
- Can manage data only for their own `workingStoreId`
- Can manage employees in their own store, but only `STAFF` and `SHIPPER`
- Cannot create/update/delete `ADMIN` or `MANAGER` users
- Cannot create or delete store branches
- Can monitor and moderate store-scoped orders, reviews, feedbacks, support chat

### Manager allowed APIs

- Auth/session
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Employee management in own store only
  - `GET /api/admin/users`
  - `GET /api/admin/users/{id}`
  - `POST /api/admin/users`
  - `PUT /api/admin/users/{id}`
  - `PUT /api/admin/users/{id}/verification`
  - `DELETE /api/admin/users/{id}`
- Own store only
  - `GET /api/admin/stores`
  - `GET /api/admin/stores/{id}`
  - `PUT /api/admin/stores/{id}`
  - `PUT /api/admin/stores/{id}/highlights`
- Own store resources only
  - `GET|POST|PUT|DELETE /api/admin/events`
  - `GET|POST|PUT|DELETE /api/admin/categories`
  - `GET|POST|PUT|DELETE /api/admin/dishes`
  - `GET|POST|PUT|DELETE /api/admin/news`
  - `GET|POST|PUT|DELETE /api/admin/store-dishes`
  - `POST /api/admin/uploads/images`
- Own store orders/moderation
  - `GET /api/admin/orders`
  - `GET /api/admin/orders/{id}`
  - `PUT /api/admin/orders/{id}/status`
  - `GET /api/admin/reviews`
  - `GET /api/admin/reviews/{id}`
  - `DELETE /api/admin/reviews/{id}`
  - `GET /api/admin/feedbacks`
  - `GET /api/admin/feedbacks/{id}`
  - `GET /api/admin/feedbacks/{id}/reply`
  - `PUT /api/admin/feedbacks/{id}/reply`
  - `DELETE /api/admin/feedbacks/{id}/reply`
  - `DELETE /api/admin/feedbacks/{id}`
- Own store monitoring
  - `GET /api/admin/work-schedules/monthly`
  - `GET /api/admin/attendances`
  - `GET /api/admin/attendances/summary`

### Manager blocked APIs

- `GET /api/admin/dashboard`
- `GET /api/admin/summary`
- `POST /api/admin/stores`
- `DELETE /api/admin/stores/{id}`
- `GET|POST|PUT|DELETE /api/admin/promotions`
- `GET|POST|PUT|DELETE /api/admin/user-levels`
- `PUT /api/admin/work-schedules/monthly`

### Manager employee create/update rule

- `role` must be `STAFF` or `SHIPPER`
- `workingStoreId` must equal manager `workingStoreId`
- Frontend should hide `ADMIN` and `MANAGER` in manager role forms

### Manager employee create sample

```json
{
  "fullName": "Shipper Q1",
  "email": "shipper.q1@example.com",
  "password": "12345678",
  "role": "SHIPPER",
  "workingStoreId": 1,
  "enabled": true
}
```

## 5. STAFF

### Main functions

- See paid orders in own store that are waiting for kitchen
- Accept a `CONFIRMED` order
- Work on accepted order in `PREPARING`
- Finish kitchen step and move order to `READY_FOR_SHIPPER`
- View own schedule
- Check in / check out
- Read employee notifications

### Staff APIs

- Orders
  - `GET /api/employee/orders`
  - `GET /api/employee/orders/{id}`
  - `POST /api/employee/orders/{id}/accept-preparing`
  - `POST /api/employee/orders/{id}/mark-ready`
  - `POST /api/employee/orders/{id}/complete-preparing`
- Schedule/attendance
  - `GET /api/employee/work-schedules/today`
  - `GET /api/employee/work-schedules/monthly`
  - `GET /api/employee/attendance/today`
  - `POST /api/employee/attendance/check-in`
  - `POST /api/employee/attendance/check-out`
  - `GET /api/employee/attendance/history`
- Notifications
  - `GET /api/employee/notifications`
  - `GET /api/employee/notifications/unread-count`
  - `PUT /api/employee/notifications/{id}/read`
  - `PUT /api/employee/notifications/{id}/unread`
  - `PUT /api/employee/notifications/read-all`

### Staff order workflow

1. Order is paid and backend moves it to `CONFIRMED`
2. Staff calls `POST /api/employee/orders/{id}/accept-preparing`
3. Backend assigns `preparingStaffId` to current staff and sets status `PREPARING`
4. Staff calls `POST /api/employee/orders/{id}/mark-ready`
5. Backend sets status `READY_FOR_SHIPPER`

`POST /api/employee/orders/{id}/complete-preparing` is an alias of `mark-ready`

### Staff accept order request

- No body

### Staff order response sample

```json
{
  "id": 701,
  "storeId": 1,
  "storeName": "Tea House Q1",
  "status": "PREPARING",
  "paymentStatus": "PAID",
  "preparingStaffId": 21,
  "preparingStaffName": "Staff A",
  "deliveringShipperId": null,
  "deliveringShipperName": null,
  "statusSummary": "Nhan vien Staff A dang lam mon",
  "items": []
}
```

## 6. SHIPPER

### Main functions

- See paid orders in own store waiting for shipper
- Accept a `READY_FOR_SHIPPER` order
- Deliver accepted order in `OUT_FOR_DELIVERY`
- Complete delivery and move order to `COMPLETED`
- View own schedule
- Check in / check out
- Read employee notifications

### Shipper APIs

- Orders
  - `GET /api/employee/orders`
  - `GET /api/employee/orders/{id}`
  - `POST /api/employee/orders/{id}/accept-delivery`
  - `POST /api/employee/orders/{id}/complete-delivery`
- Schedule/attendance
  - `GET /api/employee/work-schedules/today`
  - `GET /api/employee/work-schedules/monthly`
  - `GET /api/employee/attendance/today`
  - `POST /api/employee/attendance/check-in`
  - `POST /api/employee/attendance/check-out`
  - `GET /api/employee/attendance/history`
- Notifications
  - `GET /api/employee/notifications`
  - `GET /api/employee/notifications/unread-count`
  - `PUT /api/employee/notifications/{id}/read`
  - `PUT /api/employee/notifications/{id}/unread`
  - `PUT /api/employee/notifications/read-all`

### Shipper order workflow

1. Kitchen finishes order and backend sets `READY_FOR_SHIPPER`
2. Shipper calls `POST /api/employee/orders/{id}/accept-delivery`
3. Backend assigns `deliveringShipperId` and sets `OUT_FOR_DELIVERY`
4. Shipper calls `POST /api/employee/orders/{id}/complete-delivery`
5. Backend sets `COMPLETED`

### Shipper order response sample

```json
{
  "id": 701,
  "storeId": 1,
  "storeName": "Tea House Q1",
  "status": "OUT_FOR_DELIVERY",
  "paymentStatus": "PAID",
  "preparingStaffId": 21,
  "preparingStaffName": "Staff A",
  "deliveringShipperId": 30,
  "deliveringShipperName": "Shipper Q1",
  "statusSummary": "Shipper Q1 dang giao hang",
  "items": []
}
```

## 7. USER

### Main functions

- Register / login / logout
- Browse public catalog
- Manage cart and checkout
- Manage delivery addresses
- See own orders and refresh payment
- Manage favorites
- Create review
- Create feedback
- Read storefront notifications
- Read loyalty levels
- Open support chat with store

### User APIs

- Auth/session
  - `POST /api/auth/register`
  - `POST /api/auth/verify-otp`
  - `POST /api/auth/password/request-otp`
  - `POST /api/auth/password/reset`
  - `POST /api/auth/login`
  - `POST /api/auth/google/login`
  - `POST /api/auth/google/complete-profile`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Public browse
  - `GET /api/public/home`
  - `GET /api/public/stores`
  - `GET /api/public/stores/{storeKey}`
  - `GET /api/public/dishes`
  - `GET /api/public/dishes/{dishId}`
  - `GET /api/public/events`
  - `GET /api/public/events/{eventKey}`
  - `GET /api/public/news`
  - `GET /api/public/news/{newsKey}`
  - `GET /api/public/reviews`
- Cart / checkout
  - `GET /api/user/cart`
  - `POST /api/user/cart/items`
  - `PUT /api/user/cart/items/{id}`
  - `DELETE /api/user/cart/items/{id}`
  - `DELETE /api/user/cart`
  - `POST /api/user/cart/checkout`
- Address / order / favorites / review / feedback / notification / levels
  - `GET|POST|PUT|DELETE /api/user/delivery-addresses`
  - `PUT /api/user/delivery-addresses/{id}/primary`
  - `GET /api/user/orders`
  - `GET /api/user/orders/{id}`
  - `POST /api/user/orders/{id}/refresh-payment`
  - `GET|POST|DELETE /api/user/favorites`
  - `GET|POST|PUT|DELETE /api/user/reviews`
  - `GET|POST|DELETE /api/user/feedbacks`
  - `GET|PUT /api/user/notifications`
  - `GET /api/user/levels/current`
- Support chat
  - `GET /api/support-chat/stores`
  - Socket.IO connection to `http://localhost:8080` path `/socket.io`

### User checkout request sample

```json
{
  "deliveryAddressId": 11,
  "deliveryType": "IMMEDIATE",
  "promotionCode": "MATCHA10",
  "returnUrl": "http://localhost:3000/payment/success",
  "cancelUrl": "http://localhost:3000/payment/cancel"
}
```

### User feedback create sample

```json
{
  "category": "DELIVERY",
  "relatedStoreId": 1,
  "relatedOrderId": 701,
  "subject": "Don giao cham",
  "message": "Em muon check tinh trang don hang 701."
}
```

## 8. Support Chat Contract

### REST

`GET /api/support-chat/stores`

Response sample:

```json
{
  "items": [
    { "id": 1, "name": "Tea House Q1" },
    { "id": 2, "name": "Tea House Q3" }
  ]
}
```

### Socket handshake

Connect to:

- Host: `http://localhost:8080`
- Path: `/socket.io`

Auth payload:

```json
{
  "token": "<accessToken>",
  "tokenType": "Bearer"
}
```

### User socket events

Client emit `support:user_session:start`

```json
{
  "storeId": 1
}
```

Ack:

```json
{
  "ok": true,
  "message": "Support chat started."
}
```

Client emit `support:message:send`

```json
{
  "content": "Em can ho tro don hang 701"
}
```

Server emit `support:user_state`

```json
{
  "id": "chat_abc123",
  "storeId": 1,
  "storeName": "Tea House Q1",
  "assignedAdminId": 15,
  "assignedAdminName": "Nguyen Van B",
  "messages": [
    {
      "id": "msg_1",
      "senderId": 12,
      "senderName": "Nguyen Van A",
      "senderRole": "USER",
      "content": "Em can ho tro",
      "createdAt": "2026-03-30T10:15:00Z"
    }
  ]
}
```

### Admin/manager socket events

Client emit `support:message:send`

```json
{
  "sessionId": "chat_abc123",
  "content": "Anh chi dang ho tro em day."
}
```

Server emit `support:admin_state`

```json
[
  {
    "id": "chat_abc123",
    "storeId": 1,
    "storeName": "Tea House Q1",
    "userId": 12,
    "userName": "Nguyen Van A",
    "userEmail": "a@example.com",
    "waitingForAdmin": true,
    "assignedAdminId": null,
    "assignedAdminName": null,
    "messages": []
  }
]
```

### Support chat role rules

- `USER` can start chat for one chosen store
- `ADMIN` can see all sessions
- `MANAGER` only sees sessions of `workingStoreId`
- First admin/manager reply claims the session
- If user disconnects, backend removes session from RAM
- If claimed admin/manager disconnects while user is still online, session becomes waiting again
