# Frontend User Role Note

Updated on 2026-04-04.

Purpose: this file is a role-focused handoff note for frontend and mobile teams implementing the `USER` experience in Tea Matcha.

Use this together with:
- `FRONTEND_USER_API.md`
- `FRONTEND_ROLE_API_NOTE.md`
- `FRONTEND_SESSION_SECURITY_NOTE.md`
- `FRONTEND_ORDER_INVOICE_QR_NOTE.md`
- `MOBILE_ORDER_QR_NOTE.md`

## 1. USER Role Summary

`USER` is the storefront customer role.

Main responsibilities supported by backend:
- register, verify OTP, login, logout
- sign in with Google
- browse stores, dishes, events, news, and public reviews
- manage cart and checkout
- manage delivery addresses
- see own orders and payment status
- refresh or recreate PayOS payment link through the same refresh endpoint
- view printable invoice after payment
- scan invoice QR on mobile and jump to order status
- manage favorites
- create and manage own reviews
- create and manage own feedback
- read storefront notifications
- read current store loyalty levels
- open support chat with a store

## 2. What USER Can Access

### Public APIs without login

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

### Auth and session

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/password/request-otp`
- `POST /api/auth/password/reset`
- `POST /api/auth/login`
- `POST /api/auth/google/login`
- `POST /api/auth/google/complete-profile`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Protected user APIs

- Cart and checkout
  - `GET /api/user/cart`
  - `POST /api/user/cart/items`
  - `PUT /api/user/cart/items/{id}`
  - `DELETE /api/user/cart/items/{id}`
  - `DELETE /api/user/cart`
  - `POST /api/user/cart/checkout`
- Delivery addresses
  - `GET /api/user/delivery-addresses`
  - `GET /api/user/delivery-addresses/primary`
  - `GET /api/user/delivery-addresses/{id}`
  - `POST /api/user/delivery-addresses`
  - `PUT /api/user/delivery-addresses/{id}`
  - `PUT /api/user/delivery-addresses/{id}/primary`
  - `DELETE /api/user/delivery-addresses/{id}`
- Orders and invoice
  - `GET /api/user/orders`
  - `GET /api/user/orders/{id}`
  - `POST /api/user/orders/{id}/refresh-payment`
  - `GET /api/user/orders/{id}/invoice`
- Favorites
  - `GET /api/user/favorites`
  - `POST /api/user/favorites`
  - `DELETE /api/user/favorites`
- Reviews
  - `GET /api/user/reviews`
  - `POST /api/user/reviews`
  - `PUT /api/user/reviews/{id}`
  - `DELETE /api/user/reviews/{id}`
- Feedback
  - `GET /api/user/feedbacks`
  - `POST /api/user/feedbacks`
  - `DELETE /api/user/feedbacks/{id}`
- Notifications
  - `GET /api/user/notifications`
  - `PUT /api/user/notifications/{id}/read`
  - `PUT /api/user/notifications/{id}/unread`
  - `PUT /api/user/notifications/read-all`
- Loyalty levels
  - `GET /api/user/levels/current`
- Support chat
  - `GET /api/support-chat/stores`
  - Socket.IO connection to `/socket.io`
- Mobile QR resolve
  - `GET /api/mobile/order-qr/{token}`

## 3. What USER Cannot Do

`USER` must not be routed to admin or employee workflows.

Blocked areas:
- admin dashboard
- store/content CRUD
- employee order claim or internal processing
- promotions management
- employee schedule/attendance management
- admin support inbox
- viewing another user's order, invoice, or QR resolve result

Frontend should not show:
- `ADMIN` or `MANAGER` menus
- employee task buttons like `ACCEPT_PREPARING`, `MARK_READY`, `ACCEPT_DELIVERY`, `MARK_COMPLETED`
- internal scan-claim screens for staff or shipper

## 4. Main USER Functions

### Account and login

- Register with email/password
- Verify email by OTP
- Login with email/password
- Login with Google
- Complete profile after first Google login when `profileCompleted = false`
- Restore session with `GET /api/auth/me`
- Logout
- Reset password by OTP

### Browse storefront

- View home page payload from `/api/public/home`
- Browse stores, dishes, events, news
- Open detail pages by id or slug where supported
- Read approved public reviews

### Cart and checkout

- Add dishes from stores into cart
- Update quantity and remove items
- Checkout with delivery address and optional promotion
- Support `IMMEDIATE` or `SCHEDULED` delivery
- Pay through PayOS using `paymentCheckoutUrl`

Important checkout rule:
- one checkout can create multiple store orders
- backend groups cart items by `storeId`
- backend returns one payment session for the grouped checkout
- `CheckoutResponse.orders` lists each store order created from that checkout

### Delivery addresses

- Save multiple delivery addresses
- Mark one address as primary
- Reuse primary or recent address during checkout

### Orders, payment, invoice

- Read only own orders
- Open order detail and status timeline summary
- Use `POST /api/user/orders/{id}/refresh-payment` when payment link expired
- Open printable invoice after payment
- Use `invoicePreviewUrl` or `invoiceDownloadUrl` when available

Current user-facing `allowedActions`:
- `REFRESH_PAYMENT`
- `VIEW_INVOICE`

Rules:
- `REFRESH_PAYMENT` only when order belongs to current user, is not paid, and is not cancelled
- `VIEW_INVOICE` only when invoice exists

### Mobile QR flow for USER

- User scans invoice QR
- QR tries to open mobile app using deep link
- App should call `GET /api/mobile/order-qr/{token}`
- Backend checks the order belongs to the logged-in user
- Backend returns:
  - `resolvedRole = USER`
  - `targetScreen = USER_ORDER_STATUS`
  - `order`
- Mobile should open user order status/detail directly

If user scans another user's QR:
- backend returns `403`

### Favorites

- Favorite or unfavorite:
  - stores
  - dishes
  - events
- Read current favorites list

### Reviews

- Create review for supported targets
- Edit own review
- Delete own review
- Read own submitted reviews

### Feedback

- Create customer feedback for:
  - general issues
  - store service
  - product quality
  - delivery
  - order experience
  - app experience
  - other
- Link feedback to store and order where applicable
- Read own feedback list
- Delete own feedback if frontend exposes that action

### Notifications

- Read storefront notifications
- Mark one notification read or unread
- Mark all notifications as read
- Use notification metadata to deep-link into news, events, or orders

### Loyalty levels

- Read current user levels by store from `GET /api/user/levels/current`
- Use this to show eligibility for level-based promotions

### Support chat

- Read store list from `GET /api/support-chat/stores`
- Start one support session for one selected store
- Send messages through Socket.IO
- Receive `support:user_state` from backend

## 5. Main Frontend and Mobile Screens For USER

Recommended user-facing areas:
- auth
  - register
  - OTP verify
  - login
  - forgot password
  - Google complete profile
- storefront
  - home
  - store list
  - store detail
  - dish list
  - dish detail
  - event list and detail
  - news list and detail
- shopping
  - cart
  - checkout
  - payment status
- account
  - delivery addresses
  - orders
  - order detail
  - invoice preview
  - favorites
  - reviews
  - feedback
  - notifications
  - loyalty levels
  - support chat

## 6. Main Request Samples

### Register

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "12345678"
}
```

### Login

```json
{
  "email": "a@example.com",
  "password": "12345678"
}
```

### Google login

```json
{
  "idToken": "<google_id_token>"
}
```

### Add cart item

```json
{
  "storeId": 1,
  "dishId": 88,
  "quantity": 2
}
```

### Checkout

```json
{
  "deliveryAddressId": 11,
  "deliveryType": "IMMEDIATE",
  "promotionCode": "MATCHA10",
  "returnUrl": "http://localhost:3000/payment/success",
  "cancelUrl": "http://localhost:3000/payment/cancel"
}
```

### Refresh payment

```http
POST /api/user/orders/22/refresh-payment
Authorization: Bearer <accessToken>
```

Expected frontend behavior:
- use the response body directly
- if `paymentCheckoutUrl` is present and new, redirect user immediately

### Mobile QR resolve for USER

```http
GET /api/mobile/order-qr/{token}
Authorization: Bearer <accessToken>
```

Sample response:

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

## 7. Important Frontend Rules For USER

- Always send `Authorization: Bearer <accessToken>` on protected user APIs
- Treat the token as an opaque session token, not JWT
- For Google login, if `profileCompleted = false`, route immediately to complete-profile flow
- For checkout, always send both `returnUrl` and `cancelUrl`
- One checkout can produce multiple orders across multiple stores
- Use `CheckoutResponse.orders` to render grouped store orders
- Use `paymentCheckoutUrl` from checkout or refresh-payment response directly
- Do not hardcode order action buttons; trust `order.allowedActions`
- Only render invoice actions when `invoiceAvailable = true`
- For mobile QR, keep the scanned token if login is required, then retry after login

## 8. Support Chat Quick Contract For USER

### REST

```http
GET /api/support-chat/stores
Authorization: Bearer <accessToken>
```

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
- host API
- path `/socket.io`

Auth payload:

```json
{
  "token": "<accessToken>",
  "tokenType": "Bearer"
}
```

### User starts chat

Client emit:

```json
{
  "storeId": 1
}
```

Event:
- `support:user_session:start`

Ack:

```json
{
  "ok": true,
  "message": "Support chat started."
}
```

### User sends message

Client emit event:
- `support:message:send`

Payload:

```json
{
  "content": "Em can ho tro don hang 701"
}
```

Ack:

```json
{
  "ok": true,
  "message": "Message sent."
}
```

### User receives state

Server emit:
- `support:user_state`

Shape:

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

## 9. Suggested User Menu Mapping

- Public
  - Home
  - Stores
  - Dishes
  - Events
  - News
- Logged-in user
  - Cart
  - Checkout
  - Orders
  - Addresses
  - Favorites
  - Reviews
  - Feedback
  - Notifications
  - Loyalty Levels
  - Support Chat

## 10. Short Conclusion

`USER` is the customer role only.

The `USER` app should focus on:
- buying and paying
- tracking own orders
- reading invoice and order status
- scanning invoice QR to reopen the order in mobile
- sending reviews, feedback, and support chat messages

The `USER` app must not include admin or employee workflows.
