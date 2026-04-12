# Frontend Role API Note

Updated on 2026-04-11.

Purpose: this file is the current role handoff for frontend teams.
If older docs conflict with this file, use this file as the source of truth.

Related docs:
- `FRONTEND_ADMIN_API.md`
- `FRONTEND_USER_API.md`
- `FRONTEND_ORDER_INVOICE_QR_NOTE.md`
- `FRONTEND_AI_CHAT_NOTE.md`
- `MOBILE_ORDER_QR_NOTE.md`

## 1. Active Roles

Only these roles are active in the backend now:

| Role | Main UI | Main responsibility |
| --- | --- | --- |
| `ADMIN` | Admin dashboard | Full system management |
| `MANAGER` | Store manager panel + store operations | Store-scoped admin work and preparing-step order handling |
| `SHIPPER` | Delivery panel | Delivery-step order handling |
| `USER` | Storefront app | Shopping, checkout, tracking, feedback, support |

Important:
- `STAFF` is removed from active backend roles.
- Some legacy response fields still keep the name `preparingStaffId` and `preparingStaffName`.
- Those two fields now represent the assigned `MANAGER` for the preparing step.

## 2. Shared Login Flow

1. `POST /api/auth/login`
2. Save `accessToken`
3. Send `Authorization: Bearer <accessToken>`
4. Call `GET /api/auth/me`
5. Route UI by `user.role`

All authenticated roles can also use AI chat:
- `POST /api/ai/chat/query`
- `GET /api/ai/chat/threads`
- `GET /api/ai/chat/threads/{threadId}`

## 3. ADMIN

### Main functions

- Full user management for `ADMIN`, `MANAGER`, `SHIPPER`, `USER`
- Full store CRUD
- Full event/category/dish/news/store-dish CRUD
- Full order management
- Full review moderation
- Full feedback moderation
- Full promotion and user-level management
- Full support chat inbox across stores
- Global dashboard, revenue, and top-selling dishes
- AI form draft and AI chat

### Main API groups

- Auth/session
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Dashboard
  - `GET /api/admin/dashboard`
  - `GET /api/admin/summary`
  - `POST /api/admin/ai/form-drafts/{formType}`
- User management
  - `GET /api/admin/users`
  - `GET /api/admin/users/{id}`
  - `POST /api/admin/users`
  - `PUT /api/admin/users/{id}`
  - `PUT /api/admin/users/{id}/verification`
  - `DELETE /api/admin/users/{id}`
- Store and content management
  - `GET|POST|PUT|DELETE /api/admin/stores`
  - `GET|POST|PUT|DELETE /api/admin/events`
  - `GET|POST|PUT|DELETE /api/admin/categories`
  - `GET|POST|PUT|DELETE /api/admin/dishes`
  - `GET|POST|PUT|DELETE /api/admin/news`
  - `GET|POST|PUT|DELETE /api/admin/store-dishes`
  - `POST /api/admin/uploads/images`
- Orders and moderation
  - `GET /api/admin/orders`
  - `GET /api/admin/orders/{id}`
  - `PUT /api/admin/orders/{id}/status`
  - `GET /api/admin/reviews`
  - `DELETE /api/admin/reviews/{id}`
  - `GET /api/admin/feedbacks`
  - `PUT /api/admin/feedbacks/{id}/reply`
  - `DELETE /api/admin/feedbacks/{id}`
- Promotions and loyalty
  - `GET|POST|PUT|DELETE /api/admin/promotions`
  - `GET|POST|PUT|DELETE /api/admin/user-levels`

### Admin sample create user

```json
{
  "fullName": "Store Manager",
  "email": "manager.q1@example.com",
  "password": "12345678",
  "role": "MANAGER",
  "workingStoreId": 1,
  "enabled": true
}
```

## 4. MANAGER

### Main functions

- Login to admin area with role `MANAGER`
- Access only their own `workingStoreId`
- Read store-scoped dashboard, revenue, and top-selling dishes
- Update their own store branch
- Manage local categories, local dishes, events, news, and store dishes for their own branch
- Read franchise-wide `SIGNATURE` category and system dishes in admin lists
- Manage shipper accounts in their own store
- Moderate store-scoped orders, reviews, feedbacks, and support chat
- Receive new-order notifications in manager notification center
- Use employee order APIs for preparing flow
- Use AI form draft and AI chat

### Important manager rules

- `MANAGER` cannot create or delete store branches.
- `MANAGER` cannot create or promote anyone to `ADMIN` or `MANAGER`.
- `MANAGER` can only manage `SHIPPER` users in their own store.
- `MANAGER` can create, update, and delete only local categories whose `storeId` matches their own store.
- `MANAGER` can read the global `SIGNATURE` category but cannot modify it.
- `MANAGER` can create, update, and delete only local dishes whose category belongs to their own store.
- `MANAGER` can read franchise-wide system dishes in `SIGNATURE`, but cannot modify those dish records.
- `MANAGER` can attach a `SIGNATURE` dish to their own store through `store_dishes`.
- For `SIGNATURE` dishes, `MANAGER` should edit only `quantity` and `available` in `store_dishes`; keep `storeId`, `dishId`, and `priceOverride` unchanged.
- `MANAGER` is the actor for the preparing step of an order.
- QR scan for preparing flow is now manager-owned, not staff-owned.

### Manager APIs

- Admin/store-scoped APIs
  - `GET /api/admin/dashboard`
  - `GET /api/admin/summary`
  - `GET /api/admin/users`
  - `GET /api/admin/users/{id}`
  - `POST /api/admin/users`
  - `PUT /api/admin/users/{id}`
  - `PUT /api/admin/users/{id}/verification`
  - `DELETE /api/admin/users/{id}`
  - `GET /api/admin/stores`
  - `GET /api/admin/stores/{id}`
  - `PUT /api/admin/stores/{id}`
  - `GET|POST|PUT|DELETE /api/admin/events`
  - `GET|POST|PUT|DELETE /api/admin/categories`
  - `GET|POST|PUT|DELETE /api/admin/dishes`
  - `GET|POST|PUT|DELETE /api/admin/news`
  - `GET|POST|PUT|DELETE /api/admin/store-dishes`
  - `GET /api/admin/orders`
  - `GET /api/admin/orders/{id}`
  - `PUT /api/admin/orders/{id}/status`
- Manager notification center
  - `GET /api/admin/notifications`
  - `GET /api/admin/notifications/unread-count`
  - `PUT /api/admin/notifications/{id}/read`
  - `PUT /api/admin/notifications/{id}/unread`
  - `PUT /api/admin/notifications/read-all`
- Employee operation APIs
  - `GET /api/employee/orders`
  - `GET /api/employee/orders/{id}`
  - `POST /api/employee/orders/{id}/accept-preparing`
  - `POST /api/employee/orders/{id}/mark-ready`
  - `POST /api/employee/orders/{id}/complete-preparing`
  - `GET /api/employee/notifications`
  - `GET /api/employee/notifications/unread-count`
  - `PUT /api/employee/notifications/{id}/read`
  - `PUT /api/employee/notifications/{id}/unread`
  - `PUT /api/employee/notifications/read-all`

### Manager create shipper sample

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

### Manager order workflow

1. Paid order is confirmed and enters `CONFIRMED`
2. `MANAGER` calls `POST /api/employee/orders/{id}/accept-preparing`
3. Backend stores the manager in legacy fields:
   - `preparingStaffId`
   - `preparingStaffName`
4. Order moves to `PREPARING`
5. `MANAGER` calls `POST /api/employee/orders/{id}/mark-ready`
6. Order moves to `READY_FOR_SHIPPER`

### Manager order response sample

```json
{
  "id": 701,
  "storeId": 1,
  "storeName": "Tea House Q1",
  "status": "PREPARING",
  "paymentStatus": "PAID",
  "preparingStaffId": 21,
  "preparingStaffName": "Manager A",
  "deliveringShipperId": null,
  "deliveringShipperName": null,
  "statusSummary": "Quan ly Manager A dang xu ly don",
  "items": []
}
```

## 5. SHIPPER

### Main functions

- See orders in own store waiting for shipper
- Accept a `READY_FOR_SHIPPER` order
- Deliver accepted order in `OUT_FOR_DELIVERY`
- Complete delivery and move order to `COMPLETED`
- Upload delivery proof
- Read employee notifications
- Use AI chat for their own account status and general content

### Shipper APIs

- `GET /api/employee/orders`
- `GET /api/employee/orders/{id}`
- `POST /api/employee/orders/{id}/accept-delivery`
- `POST /api/employee/orders/{id}/complete-delivery`
- `POST /api/employee/orders/{id}/delivery-proof`
- `GET /api/employee/notifications`
- `GET /api/employee/notifications/unread-count`
- `PUT /api/employee/notifications/{id}/read`
- `PUT /api/employee/notifications/{id}/unread`
- `PUT /api/employee/notifications/read-all`

### Shipper order response sample

```json
{
  "id": 701,
  "storeId": 1,
  "storeName": "Tea House Q1",
  "status": "OUT_FOR_DELIVERY",
  "paymentStatus": "PAID",
  "preparingStaffId": 21,
  "preparingStaffName": "Manager A",
  "deliveringShipperId": 30,
  "deliveringShipperName": "Shipper Q1",
  "statusSummary": "Shipper Q1 dang giao hang",
  "items": []
}
```

## 6. USER

### Main functions

- Register / login / logout
- Browse stores, dishes, events, news
- Manage cart and checkout
- Refresh payment link for unpaid orders
- View invoice and QR
- Track own orders
- Manage favorites
- Create reviews
- Create feedback
- Read storefront notifications
- Open support chat
- Use AI chat as shopping assistant

### User APIs

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/public/*`
- `GET|POST|PUT|DELETE /api/user/cart/*`
- `POST /api/user/orders/checkout`
- `GET /api/user/orders`
- `GET /api/user/orders/{id}`
- `POST /api/user/orders/{id}/refresh-payment`
- `GET /api/user/orders/{id}/invoice`
- `GET|POST|DELETE /api/favorites/*`
- `GET|POST|PUT|DELETE /api/reviews/*`
- `GET|POST|PUT|DELETE /api/feedbacks/*`
- `GET|PUT /api/notifications/*`
- `GET /api/support-chat/stores`

## 7. Frontend Rules To Keep

- Route by the actual `role` from `GET /api/auth/me`
- Do not show any `STAFF` option in role selectors anymore
- Treat `preparingStaffId` and `preparingStaffName` as manager-preparing fields
- Use `allowedActions` from `OrderResponse` to decide buttons
- For manager-created employee forms, only allow `SHIPPER`
- Detect a system dish by current response shape:
  - `dish.storeId == null`
  - `dish.categoryName == "SIGNATURE"`
- Detect the global signature category by current response shape:
  - `category.storeId == null`
  - `category.name == "SIGNATURE"`
- Storefront store detail will show both signature menu and store local menu when both dish types are attached to that store via `store_dishes`
- For employee workflow screens:
  - `MANAGER` owns preparing
  - `SHIPPER` owns delivery
